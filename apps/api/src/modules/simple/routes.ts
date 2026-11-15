import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { ComponentCategory, MealServiceTime } from '@janitou/common';
import { readJsonBody, readRawBody, sanitizeString, sendError, sendJson } from '../common/http.js';
import { janitouStore } from '../../services/store.js';
import { authenticatedStaff } from '../auth/session.js';
import { hashPin, normalizePhone } from '../../services/pin.js';
import {
  addDaysIso,
  isIsoDate,
  toIsoDate,
  weekRange,
  type SimpleDishView,
  type SimpleSettings,
} from '../../data/simple-demo.js';

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const UPLOAD_DIR = resolve(process.cwd(), 'data/uploads');
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function hasImageSignature(buffer: Buffer, extension: string): boolean {
  if (extension === 'jpg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (extension === 'png') {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}

function isSafePhotoUrl(value: string): boolean {
  return (
    value.startsWith('/app/dishes/') ||
    value.startsWith('/uploads/') ||
    value.startsWith('https://')
  );
}

function parseCategory(value: unknown): ComponentCategory | undefined {
  if (value === undefined) return ComponentCategory.MAIN_COURSE;
  return Object.values(ComponentCategory).find((category) => category === value);
}

async function handleUpload(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const contentType = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const extension = Object.hasOwn(IMAGE_EXTENSIONS, contentType)
    ? IMAGE_EXTENSIONS[contentType]
    : undefined;
  if (!extension) {
    sendError(res, 415, 'Unsupported Media Type', 'Formats acceptés : JPEG, PNG ou WebP.');
    return;
  }

  let buffer: Buffer;
  try {
    buffer = await readRawBody(req, MAX_UPLOAD_BYTES);
  } catch {
    sendError(res, 413, 'Payload Too Large', 'Image trop lourde (max 5 Mo).');
    return;
  }
  if (buffer.length === 0) {
    sendError(res, 400, 'Validation Error', 'Fichier image vide.');
    return;
  }
  if (!hasImageSignature(buffer, extension)) {
    sendError(res, 415, 'Unsupported Media Type', "Le fichier ne correspond pas à une image valide.");
    return;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
  await writeFile(resolve(UPLOAD_DIR, fileName), buffer);
  sendJson(res, 201, { url: `/uploads/${fileName}` });
}

export async function handleSimpleRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  searchParams: URLSearchParams
): Promise<boolean> {
  if (!pathname.startsWith('/api/v1/simple')) return false;

  const staff = authenticatedStaff(req);
  if (!staff) {
    sendError(res, 401, 'Unauthorized', 'Session staff requise.');
    return true;
  }
  const managerOnly =
    pathname.startsWith('/api/v1/simple/clients') ||
    pathname === '/api/v1/simple/settings' ||
    pathname === '/api/v1/simple/weekly/generate';
  if (managerOnly && staff.role !== 'ADMIN' && staff.role !== 'OPERATIONS_MANAGER') {
    sendError(res, 403, 'Forbidden', 'Permission insuffisante.');
    return true;
  }
  const adminOnly =
    pathname.startsWith('/api/v1/simple/users') ||
    pathname.startsWith('/api/v1/simple/sessions') ||
    pathname === '/api/v1/simple/audit' ||
    pathname === '/api/v1/simple/messages';
  if (adminOnly && staff.role !== 'ADMIN') {
    sendError(res, 403, 'Forbidden', 'Réservé aux administrateurs.');
    return true;
  }

  // ------------------------------------------------------------
  // Dépôt d'image (photo de plat)
  // ------------------------------------------------------------
  if (pathname === '/api/v1/simple/uploads' && method === 'POST') {
    await handleUpload(req, res);
    return true;
  }

  // ------------------------------------------------------------
  // Accueil : statistiques du jour + commandes du jour
  // ------------------------------------------------------------
  if (pathname === '/api/v1/simple/home' && method === 'GET') {
    const date = searchParams.get('date') || toIsoDate(new Date());
    if (!isIsoDate(date)) {
      sendError(res, 400, 'Validation Error', 'date doit être au format YYYY-MM-DD.');
      return true;
    }
    sendJson(res, 200, janitouStore.getSimpleHome(date));
    return true;
  }

  // ------------------------------------------------------------
  // Plats (recettes utilisées par le menu mobile)
  // ------------------------------------------------------------
  if (pathname === '/api/v1/simple/dishes') {
    if (method === 'GET') {
      sendJson(res, 200, { dishes: janitouStore.getSimpleDishes() });
      return true;
    }

    if (method === 'POST') {
      let body: {
        name?: string;
        nameAr?: string;
        photoUrl?: string;
        category?: string;
        family?: string;
        mainIngredient?: string;
        flags?: string[];
      };
      try {
        body = await readJsonBody(req);
      } catch {
        sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
        return true;
      }

      const name = sanitizeString(body.name || '');
      if (name.length < 2 || name.length > 80) {
        sendError(res, 400, 'Validation Error', 'Le nom du plat doit contenir entre 2 et 80 caractères.');
        return true;
      }
      const category = parseCategory(body.category);
      if (!category) {
        sendError(res, 400, 'Validation Error', 'Catégorie de plat invalide.');
        return true;
      }
      const photoUrl = body.photoUrl ? sanitizeString(body.photoUrl) : '';
      if (photoUrl && !isSafePhotoUrl(photoUrl)) {
        sendError(res, 400, 'Validation Error', 'URL de photo invalide.');
        return true;
      }

      const allowedFlags = ['FRIES', 'MINCED', 'PASTA'] as const;
      const flags = Array.isArray(body.flags)
        ? allowedFlags.filter((flag) => body.flags?.includes(flag))
        : undefined;
      const recipe = janitouStore.createRecipe({
        name,
        nameAr: body.nameAr ? sanitizeString(body.nameAr) : undefined,
        photoUrl: photoUrl || undefined,
        category,
        family: body.family ? sanitizeString(body.family).toUpperCase().slice(0, 30) : undefined,
        mainIngredient: body.mainIngredient
          ? sanitizeString(body.mainIngredient).toUpperCase().slice(0, 30)
          : undefined,
        flags,
        yieldPortions: 1,
        ingredients: [],
        allergens: [],
        description: '',
      });
      const dish: SimpleDishView = {
        id: recipe.id,
        name: recipe.name,
        nameAr: recipe.nameAr,
        displayName: recipe.nameAr || recipe.name,
        photoUrl: recipe.photoUrl,
        category: recipe.category,
      };
      janitouStore.logAuditEvent({
        userId: staff.id,
        userName: staff.fullName,
        action: 'CREATE_DISH',
        entityType: 'DISH',
        entityId: recipe.id,
        afterSnapshot: recipe,
      });
      sendJson(res, 201, { dish });
      return true;
    }
  }

  // ------------------------------------------------------------
  // Menu : consultation, création, remplacement, archivage
  // ------------------------------------------------------------
  if (pathname === '/api/v1/simple/menu') {
    if (method === 'GET') {
      const scope = searchParams.get('scope') === 'archived' ? 'archived' : 'current';
      const today = toIsoDate(new Date());
      const from = searchParams.get('from') || (scope === 'archived' ? addDaysIso(today, -60) : today);
      const to = searchParams.get('to') || (scope === 'archived' ? today : addDaysIso(today, 6));
      if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
        sendError(res, 400, 'Validation Error', 'Plage de dates invalide.');
        return true;
      }
      sendJson(res, 200, {
        scope,
        days: janitouStore.getSimpleMenuRange(from, to, scope),
      });
      return true;
    }

    if (method === 'POST') {
      let body: { date?: string; lunchDishId?: string; dinnerDishId?: string };
      try {
        body = await readJsonBody(req);
      } catch {
        sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
        return true;
      }
      if (!isIsoDate(body.date)) {
        sendError(res, 400, 'Validation Error', 'date doit être au format YYYY-MM-DD.');
        return true;
      }
      if (!body.lunchDishId && !body.dinnerDishId) {
        sendError(res, 400, 'Validation Error', 'Sélectionnez au moins un plat (midi ou soir).');
        return true;
      }
      for (const dishId of [body.lunchDishId, body.dinnerDishId]) {
        if (dishId && !janitouStore.getRecipeById(dishId)) {
          sendError(res, 404, 'Not Found', `Plat '${dishId}' introuvable.`);
          return true;
        }
      }
      const beforeDay = janitouStore.getSimpleMenuDay(body.date);
      const day = janitouStore.upsertSimpleMenuDay({
        date: body.date,
        lunchDishId: body.lunchDishId,
        dinnerDishId: body.dinnerDishId,
      });
      janitouStore.logAuditEvent({
        userId: staff.id,
        userName: staff.fullName,
        action: 'UPSERT_MENU_DAY',
        entityType: 'MENU',
        entityId: body.date,
        beforeSnapshot: beforeDay || undefined,
        afterSnapshot: day,
      });
      const week = weekRange(body.date);
      sendJson(res, 201, {
        day,
        warnings: janitouStore.validateMenuRange(week.from, week.to).violations,
      });
      return true;
    }
  }

  const dishMatch = pathname.match(/^\/api\/v1\/simple\/menu\/(\d{4}-\d{2}-\d{2})\/dish$/);
  if (dishMatch && method === 'PATCH') {
    const date = dishMatch[1];
    if (!isIsoDate(date)) {
      sendError(res, 400, 'Validation Error', 'Date invalide.');
      return true;
    }
    let body: { serviceTime?: string; dishId?: string };
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
      return true;
    }
    if (body.serviceTime !== MealServiceTime.LUNCH && body.serviceTime !== MealServiceTime.DINNER) {
      sendError(res, 400, 'Validation Error', 'serviceTime doit valoir LUNCH ou DINNER.');
      return true;
    }
    if (!body.dishId || !janitouStore.getRecipeById(body.dishId)) {
      sendError(res, 404, 'Not Found', `Plat '${body.dishId || ''}' introuvable.`);
      return true;
    }
    const beforeDay = janitouStore.getSimpleMenuDay(date);
    const day = janitouStore.changeSimpleMenuDish(date, body.serviceTime, body.dishId);
    janitouStore.logAuditEvent({
      userId: staff.id,
      userName: staff.fullName,
      action: 'CHANGE_MENU_DISH',
      entityType: 'MENU',
      entityId: date,
      beforeSnapshot: beforeDay || undefined,
      afterSnapshot: day,
    });
    const week = weekRange(date);
    sendJson(res, 200, {
      day,
      warnings: janitouStore.validateMenuRange(week.from, week.to).violations,
    });
    return true;
  }

  const deadlineMatch = pathname.match(/^\/api\/v1\/simple\/menu\/(\d{4}-\d{2}-\d{2})\/deadline$/);
  if (deadlineMatch && method === 'PATCH') {
    const date = deadlineMatch[1];
    let body: { until?: string | null };
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
      return true;
    }
    const settings = janitouStore.getSimpleSettings();
    const overrides = { ...settings.deadlineOverrides };
    if (body.until === null || body.until === undefined) {
      delete overrides[date];
    } else {
      if (typeof body.until !== 'string' || Number.isNaN(Date.parse(body.until))) {
        sendError(res, 400, 'Validation Error', 'Date limite invalide.');
        return true;
      }
      overrides[date] = body.until;
    }
    const updated = janitouStore.updateSimpleSettings({ ...settings, deadlineOverrides: overrides });
    janitouStore.logAuditEvent({
      userId: staff.id,
      userName: staff.fullName,
      action: 'UPDATE_MENU_DEADLINE',
      entityType: 'MENU',
      entityId: date,
      beforeSnapshot: { deadlineOverrides: settings.deadlineOverrides },
      afterSnapshot: { deadlineOverrides: updated.deadlineOverrides },
    });
    sendJson(res, 200, { day: janitouStore.getSimpleMenuDay(date), deadlineOverrides: updated.deadlineOverrides });
    return true;
  }

  if (pathname === '/api/v1/simple/menu/rules' && method === 'GET') {
    const today = toIsoDate(new Date());
    const from = searchParams.get('from') || weekRange(today).from;
    const to = searchParams.get('to') || weekRange(today).to;
    if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
      sendError(res, 400, 'Validation Error', 'Plage de dates invalide.');
      return true;
    }
    sendJson(res, 200, { from, to, ...janitouStore.validateMenuRange(from, to) });
    return true;
  }

  const archiveMatch = pathname.match(/^\/api\/v1\/simple\/menu\/(\d{4}-\d{2}-\d{2})\/archive$/);
  if (archiveMatch && method === 'PATCH') {
    const date = archiveMatch[1];
    let body: { archived?: boolean };
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
      return true;
    }
    if (typeof body.archived !== 'boolean') {
      sendError(res, 400, 'Validation Error', 'archived doit être un booléen.');
      return true;
    }
    const day = janitouStore.setSimpleMenuArchived(date, body.archived);
    if (!day) {
      sendError(res, 404, 'Not Found', `Aucun menu pour la date ${date}.`);
      return true;
    }
    sendJson(res, 200, { day });
    return true;
  }

  // ------------------------------------------------------------
  // Réglages (tarifs, emballage, suppléments, horaires)
  // ------------------------------------------------------------
  if (pathname === '/api/v1/simple/settings') {
    if (method === 'GET') {
      sendJson(res, 200, { settings: janitouStore.getSimpleSettings() });
      return true;
    }

    if (method === 'PUT') {
      let body: Partial<SimpleSettings>;
      try {
        body = await readJsonBody(req);
      } catch {
        sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
        return true;
      }
      if (!body || typeof body !== 'object') {
        sendError(res, 400, 'Validation Error', 'Réglages invalides.');
        return true;
      }
      const current = janitouStore.getSimpleSettings();
      const next: SimpleSettings = {
        lunchPrice: current.lunchPrice,
        dinnerPrice: current.dinnerPrice,
        packagingPrice: current.packagingPrice,
        deliveryPrice: current.deliveryPrice,
        extras: current.extras,
        lunchHours: current.lunchHours,
        dinnerHours: current.dinnerHours,
        cutoffTime: current.cutoffTime,
        cutoffDaysBefore: current.cutoffDaysBefore,
        closedDates: current.closedDates,
        deadlineOverrides: current.deadlineOverrides,
      };

      for (const key of ['lunchPrice', 'dinnerPrice', 'packagingPrice', 'deliveryPrice'] as const) {
        const value = body[key];
        if (value === undefined) continue;
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1_000_000) {
          sendError(res, 400, 'Validation Error', `${key} doit être un montant positif.`);
          return true;
        }
        next[key] = value;
      }
      for (const key of ['lunchHours', 'dinnerHours'] as const) {
        const value = body[key];
        if (value === undefined) continue;
        if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 40) {
          sendError(res, 400, 'Validation Error', `${key} doit être un texte de 1 à 40 caractères.`);
          return true;
        }
        next[key] = value.trim();
      }
      if (body.cutoffTime !== undefined) {
        if (typeof body.cutoffTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.cutoffTime)) {
          sendError(res, 400, 'Validation Error', 'cutoffTime doit être au format HH:MM.');
          return true;
        }
        next.cutoffTime = body.cutoffTime;
      }
      if (body.cutoffDaysBefore !== undefined) {
        if (
          typeof body.cutoffDaysBefore !== 'number' ||
          !Number.isInteger(body.cutoffDaysBefore) ||
          body.cutoffDaysBefore < 0 ||
          body.cutoffDaysBefore > 7
        ) {
          sendError(res, 400, 'Validation Error', 'cutoffDaysBefore doit être un entier entre 0 et 7.');
          return true;
        }
        next.cutoffDaysBefore = body.cutoffDaysBefore;
      }
      if (body.closedDates !== undefined) {
        if (!Array.isArray(body.closedDates) || body.closedDates.length > 60) {
          sendError(res, 400, 'Validation Error', 'closedDates doit être une liste de dates.');
          return true;
        }
        if (body.closedDates.some((date) => !isIsoDate(date))) {
          sendError(res, 400, 'Validation Error', 'Date de fermeture invalide.');
          return true;
        }
        next.closedDates = [...body.closedDates];
      }
      if (body.deadlineOverrides !== undefined) {
        if (!body.deadlineOverrides || typeof body.deadlineOverrides !== 'object') {
          sendError(res, 400, 'Validation Error', 'deadlineOverrides invalide.');
          return true;
        }
        const overrides: Record<string, string> = {};
        for (const [date, until] of Object.entries(body.deadlineOverrides)) {
          if (!isIsoDate(date) || typeof until !== 'string' || Number.isNaN(Date.parse(until))) {
            sendError(res, 400, 'Validation Error', 'Prolongation de délai invalide.');
            return true;
          }
          overrides[date] = until;
        }
        next.deadlineOverrides = overrides;
      }
      if (body.extras !== undefined) {
        if (!Array.isArray(body.extras) || body.extras.length > 20) {
          sendError(res, 400, 'Validation Error', 'extras doit être une liste de 20 éléments maximum.');
          return true;
        }
        const extras: SimpleSettings['extras'] = [];
        for (const extra of body.extras) {
          if (
            !extra ||
            typeof extra.name !== 'string' ||
            extra.name.trim().length === 0 ||
            extra.name.trim().length > 40 ||
            typeof extra.price !== 'number' ||
            !Number.isFinite(extra.price) ||
            extra.price < 0 ||
            extra.price > 1_000_000
          ) {
            sendError(res, 400, 'Validation Error', 'Supplément invalide (nom et prix requis).');
            return true;
          }
          const perMeals = extra.perMeals === undefined ? 1 : extra.perMeals;
          if (
            typeof perMeals !== 'number' ||
            !Number.isInteger(perMeals) ||
            perMeals < 1 ||
            perMeals > 30
          ) {
            sendError(res, 400, 'Validation Error', 'perMeals doit être un entier entre 1 et 30.');
            return true;
          }
          if (extra.families !== undefined && !Array.isArray(extra.families)) {
            sendError(res, 400, 'Validation Error', 'families doit être une liste.');
            return true;
          }
          extras.push({
            name: extra.name.trim(),
            price: extra.price,
            perMeals,
            families: extra.families?.filter(
              (family): family is string => typeof family === 'string' && family.length > 0
            ),
          });
        }
        next.extras = extras;
      }

      const updated = janitouStore.updateSimpleSettings(next);
      janitouStore.logAuditEvent({
        userId: staff.id,
        userName: staff.fullName,
        action: 'UPDATE_SETTINGS',
        entityType: 'SETTINGS',
        entityId: 'simple',
        beforeSnapshot: current,
        afterSnapshot: updated,
      });
      sendJson(res, 200, { settings: updated });
      return true;
    }
  }

  // ------------------------------------------------------------
  // Programme hebdomadaire : génération des commandes automatiques
  // ------------------------------------------------------------
  if (pathname === '/api/v1/simple/weekly/generate' && method === 'POST') {
    let body: { date?: string } = {};
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
      return true;
    }
    const today = toIsoDate(new Date());
    const from = body.date || today;
    const to = body.date || addDaysIso(today, 6);
    if (!isIsoDate(from) || !isIsoDate(to)) {
      sendError(res, 400, 'Validation Error', 'Date invalide.');
      return true;
    }
    const created = janitouStore.generateProgramOrders(from, to);
    janitouStore.logAuditEvent({
      userId: staff.id,
      userName: staff.fullName,
      action: 'GENERATE_PROGRAM_ORDERS',
      entityType: 'ORDER',
      entityId: `${from}..${to}`,
      afterSnapshot: { created: created.length, orderIds: created.map((order) => order.id) },
    });
    sendJson(res, 200, {
      created: created.length,
      orders: created.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        deliveryDate: order.deliveryDate,
        totalPrice: order.totalPrice,
      })),
    });
    return true;
  }

  // ------------------------------------------------------------
  // Comptes clients : création par l'administration
  // ------------------------------------------------------------
  if (pathname === '/api/v1/simple/clients' && method === 'POST') {
    let body: {
      contactName?: string;
      companyName?: string;
      phone?: string;
      email?: string;
      pin?: string;
      deliveryAddress?: string;
      wilaya?: string;
      commune?: string;
      subscriptionType?: string;
    };
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
      return true;
    }
    const contactName = sanitizeString(body.contactName || '');
    const phone = sanitizeString(body.phone || '');
    const deliveryAddress = sanitizeString(body.deliveryAddress || '');
    const pin = String(body.pin || '');
    const email = sanitizeString(body.email || '').toLowerCase();
    if (contactName.length < 2 || contactName.length > 80) {
      sendError(res, 400, 'Validation Error', 'Nom du contact invalide.');
      return true;
    }
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
      sendError(res, 400, 'Validation Error', 'Numéro de téléphone invalide.');
      return true;
    }
    if (!/^\d{4}$/.test(pin)) {
      sendError(res, 400, 'Validation Error', 'Le PIN doit contenir 4 chiffres.');
      return true;
    }
    if (deliveryAddress.length < 5 || deliveryAddress.length > 200) {
      sendError(res, 400, 'Validation Error', 'Adresse de livraison invalide.');
      return true;
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      sendError(res, 400, 'Validation Error', 'Email invalide.');
      return true;
    }
    const subscriptionType = ['INDIVIDUAL', 'CORPORATE', 'SUBSIDIARY'].includes(
      body.subscriptionType || ''
    )
      ? (body.subscriptionType as 'INDIVIDUAL' | 'CORPORATE' | 'SUBSIDIARY')
      : 'INDIVIDUAL';
    const { salt, hash } = hashPin(pin);
    try {
      const customer = janitouStore.createClientAccount({
        contactName,
        companyName: body.companyName ? sanitizeString(body.companyName).slice(0, 80) : undefined,
        phone,
        email,
        deliveryAddress,
        wilaya: body.wilaya ? sanitizeString(body.wilaya) : undefined,
        commune: body.commune ? sanitizeString(body.commune) : undefined,
        pinSalt: salt,
        pinHash: hash,
        active: true,
        subscriptionType,
      });
      janitouStore.logAuditEvent({
        userId: staff.id,
        userName: staff.fullName,
        action: 'CREATE_CLIENT',
        entityType: 'CUSTOMER',
        entityId: customer.id,
        afterSnapshot: {
          contactName: customer.contactName,
          companyName: customer.companyName,
          phone: customer.phone,
          accountStatus: customer.accountStatus,
        },
      });
      sendJson(res, 201, {
        client: {
          id: customer.id,
          contactName: customer.contactName,
          phone: customer.phone,
          accountStatus: customer.accountStatus,
          deliveryAddress: customer.deliveryAddress,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'PHONE_EXISTS') {
        sendError(res, 409, 'Conflict', 'Ce numéro est déjà enregistré.');
        return true;
      }
      sendError(res, 500, 'Internal Error', 'تعذر إنشاء العميل.');
    }
    return true;
  }

  // ------------------------------------------------------------
  // Comptes clients : approbation / suspension
  // ------------------------------------------------------------
  if (pathname === '/api/v1/simple/clients' && method === 'GET') {
    const today = toIsoDate(new Date());
    const clients = janitouStore.getClientAccounts().map((customer) => {
      const orders = janitouStore.getClientOrders(customer.id);
      const lastOrderDate = orders
        .map((order) => order.deliveryDate)
        .filter((date) => date <= today)
        .sort()
        .at(-1);
      return {
        id: customer.id,
        contactName: customer.contactName,
        companyName: customer.companyName,
        phone: customer.phone,
        deliveryAddress: customer.deliveryAddress,
        accountStatus: customer.accountStatus || 'ACTIVE',
        balance: customer.accountBalance,
        distribution: customer.distribution,
        reviewRequired: janitouStore.isClientReviewRequired(customer),
        lastOrderDate,
        ordersCount: orders.length,
        pendingOrders: janitouStore.getPendingClientOrders(customer.id).length,
        totalSpent: orders.reduce((sum, order) => sum + order.totalPrice, 0),
      };
    });
    sendJson(res, 200, { clients });
    return true;
  }

  const clientStatusMatch = pathname.match(/^\/api\/v1\/simple\/clients\/([^/]+)\/status$/);
  if (clientStatusMatch && method === 'PATCH') {
    let body: { accountStatus?: string };
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
      return true;
    }
    const allowed = ['PENDING', 'ACTIVE', 'SUSPENDED', 'FROZEN', 'CANCELLED'] as const;
    const status = allowed.find((value) => value === body.accountStatus);
    if (!status) {
      sendError(res, 400, 'Validation Error', 'Statut de compte invalide.');
      return true;
    }
    const customer = janitouStore.setCustomerAccountStatus(clientStatusMatch[1], status);
    if (!customer) {
      sendError(res, 404, 'Not Found', 'Client introuvable.');
      return true;
    }
    sendJson(res, 200, {
      client: { id: customer.id, accountStatus: customer.accountStatus || 'ACTIVE' },
    });
    return true;
  }

  const clientProfileMatch = pathname.match(/^\/api\/v1\/simple\/clients\/([^/]+)$/);
  if (clientProfileMatch && method === 'PATCH') {
    let body: {
      contactName?: string;
      phone?: string;
      deliveryAddress?: string;
      distribution?: {
        type?: string;
        label?: string;
        driverName?: string;
      };
    };
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
      return true;
    }
    const patch: Parameters<typeof janitouStore.updateClientProfile>[1] = {};
    if (body.contactName !== undefined) {
      const contactName = sanitizeString(body.contactName);
      if (contactName.length < 2 || contactName.length > 80) {
        sendError(res, 400, 'Validation Error', 'Nom du contact invalide.');
        return true;
      }
      patch.contactName = contactName;
    }
    if (body.phone !== undefined) {
      const phone = sanitizeString(body.phone);
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 9 || digits.length > 15) {
        sendError(res, 400, 'Validation Error', 'Téléphone invalide.');
        return true;
      }
      patch.phone = phone;
    }
    if (body.deliveryAddress !== undefined) {
      const deliveryAddress = sanitizeString(body.deliveryAddress);
      if (deliveryAddress.length < 5 || deliveryAddress.length > 200) {
        sendError(res, 400, 'Validation Error', 'Adresse invalide.');
        return true;
      }
      patch.deliveryAddress = deliveryAddress;
    }
    if (body.distribution !== undefined) {
      const allowed = ['STANDARD_DELIVERY', 'EXPRESS', 'PICKUP'] as const;
      const type = allowed.find((value) => value === body.distribution?.type);
      if (!type) {
        sendError(res, 400, 'Validation Error', 'Mode de distribution invalide.');
        return true;
      }
      patch.distribution = {
        type,
        label: body.distribution.label
          ? sanitizeString(body.distribution.label).slice(0, 60)
          : undefined,
        driverName: body.distribution.driverName
          ? sanitizeString(body.distribution.driverName).slice(0, 60)
          : undefined,
      };
    }
    try {
      const customer = janitouStore.updateClientProfile(clientProfileMatch[1], patch);
      if (!customer) {
        sendError(res, 404, 'Not Found', 'Client introuvable.');
        return true;
      }
      sendJson(res, 200, {
        client: {
          id: customer.id,
          contactName: customer.contactName,
          phone: customer.phone,
          deliveryAddress: customer.deliveryAddress,
          distribution: customer.distribution,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'PHONE_EXISTS') {
        sendError(res, 409, 'Conflict', 'Ce numéro est déjà utilisé.');
        return true;
      }
      sendError(res, 500, 'Internal Error', 'تعذر تحديث العميل.');
    }
    return true;
  }

  const clientCreditMatch = pathname.match(/^\/api\/v1\/simple\/clients\/([^/]+)\/credit$/);
  if (clientCreditMatch && method === 'POST') {
    let body: { amount?: number };
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
      return true;
    }
    if (
      typeof body.amount !== 'number' ||
      !Number.isFinite(body.amount) ||
      body.amount <= 0 ||
      body.amount > 10_000_000
    ) {
      sendError(res, 400, 'Validation Error', 'Montant invalide.');
      return true;
    }
    const customer = janitouStore.creditClientAccount(clientCreditMatch[1], body.amount);
    if (!customer) {
      sendError(res, 404, 'Not Found', 'Client introuvable.');
      return true;
    }
    sendJson(res, 200, {
      client: { id: customer.id, balance: customer.accountBalance },
    });
    return true;
  }

  const clientReviewMatch = pathname.match(/^\/api\/v1\/simple\/clients\/([^/]+)\/review$/);
  if (clientReviewMatch && method === 'POST') {
    const customer = janitouStore.markClientReviewed(clientReviewMatch[1]);
    if (!customer) {
      sendError(res, 404, 'Not Found', 'Client introuvable.');
      return true;
    }
    sendJson(res, 200, {
      client: {
        id: customer.id,
        reviewRequired: janitouStore.isClientReviewRequired(customer),
      },
    });
    return true;
  }

  if (pathname === '/api/v1/simple/notifications' && method === 'GET') {
    sendJson(res, 200, { notifications: janitouStore.getStaffNotifications() });
    return true;
  }

  if (pathname === '/api/v1/simple/notifications/read' && method === 'PATCH') {
    janitouStore.markStaffNotificationsRead();
    sendJson(res, 200, { success: true });
    return true;
  }

  // ------------------------------------------------------------
  // Utilisateurs, sessions et audit (ADMIN)
  // ------------------------------------------------------------
  const staffRoleValues = [
    'ADMIN',
    'OPERATIONS_MANAGER',
    'CHEF_KITCHEN',
    'PURCHASING_MANAGER',
    'PACKING_LOGISTICS',
    'DELIVERY_DRIVER',
  ] as const;

  const staffUserView = (user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  }) => ({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  });

  if (pathname === '/api/v1/simple/users') {
    if (method === 'GET') {
      sendJson(res, 200, { users: janitouStore.getStaffUsers().map(staffUserView) });
      return true;
    }
    if (method === 'POST') {
      let body: { email?: string; fullName?: string; role?: string; password?: string };
      try {
        body = await readJsonBody(req);
      } catch {
        sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
        return true;
      }
      const email = sanitizeString(body.email || '').toLowerCase();
      const fullName = sanitizeString(body.fullName || '');
      const role = staffRoleValues.find((value) => value === body.role);
      const password = String(body.password || '');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        sendError(res, 400, 'Validation Error', 'Email invalide.');
        return true;
      }
      if (fullName.length < 2 || fullName.length > 80) {
        sendError(res, 400, 'Validation Error', 'Nom complet invalide.');
        return true;
      }
      if (!role) {
        sendError(res, 400, 'Validation Error', 'Rôle invalide.');
        return true;
      }
      if (password.length < 8) {
        sendError(res, 400, 'Validation Error', 'Mot de passe : 8 caractères minimum.');
        return true;
      }
      try {
        const user = janitouStore.createStaffUser({ email, fullName, role, password }, staff);
        sendJson(res, 201, { user: staffUserView(user) });
      } catch (error) {
        if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
          sendError(res, 409, 'Conflict', 'Cet email est déjà utilisé.');
          return true;
        }
        sendError(res, 500, 'Internal Error', 'تعذر إنشاء المستخدم.');
      }
      return true;
    }
  }

  const staffUserMatch = pathname.match(/^\/api\/v1\/simple\/users\/([^/]+)$/);
  if (staffUserMatch && method === 'PATCH') {
    let body: {
      fullName?: string;
      role?: string;
      isActive?: boolean;
      password?: string;
    };
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
      return true;
    }
    const patch: Parameters<typeof janitouStore.updateStaffUser>[1] = {};
    if (body.fullName !== undefined) {
      const fullName = sanitizeString(body.fullName);
      if (fullName.length < 2 || fullName.length > 80) {
        sendError(res, 400, 'Validation Error', 'Nom complet invalide.');
        return true;
      }
      patch.fullName = fullName;
    }
    if (body.role !== undefined) {
      const role = staffRoleValues.find((value) => value === body.role);
      if (!role) {
        sendError(res, 400, 'Validation Error', 'Rôle invalide.');
        return true;
      }
      patch.role = role;
    }
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') {
        sendError(res, 400, 'Validation Error', 'isActive invalide.');
        return true;
      }
      patch.isActive = body.isActive;
    }
    if (body.password !== undefined) {
      if (typeof body.password !== 'string' || body.password.length < 8) {
        sendError(res, 400, 'Validation Error', 'Mot de passe : 8 caractères minimum.');
        return true;
      }
      patch.password = body.password;
    }
    try {
      const user = janitouStore.updateStaffUser(staffUserMatch[1], patch, staff);
      sendJson(res, 200, { user: staffUserView(user) });
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      const messages: Record<string, string> = {
        USER_NOT_FOUND: 'Utilisateur introuvable.',
        LAST_ADMIN: 'Impossible de désactiver le dernier administrateur.',
        CANNOT_DISABLE_SELF: 'Vous ne pouvez pas désactiver votre propre compte.',
      };
      sendError(res, code === 'USER_NOT_FOUND' ? 404 : 409, 'Update Rejected', messages[code] || 'تعذر تحديث المستخدم.');
    }
    return true;
  }

  const logoutAllMatch = pathname.match(/^\/api\/v1\/simple\/users\/([^/]+)\/logout$/);
  if (logoutAllMatch && method === 'POST') {
    const removed = janitouStore.revokeAllSessionsForUser(logoutAllMatch[1]);
    janitouStore.logAuditEvent({
      userId: staff.id,
      userName: staff.fullName,
      action: 'REVOKE_USER_SESSIONS',
      entityType: 'STAFF_USER',
      entityId: logoutAllMatch[1],
      afterSnapshot: { removed },
    });
    sendJson(res, 200, { revoked: removed });
    return true;
  }

  if (pathname === '/api/v1/simple/sessions' && method === 'GET') {
    sendJson(res, 200, {
      staffSessions: janitouStore.listStaffSessions(),
      clientSessions: janitouStore.listClientSessions(),
    });
    return true;
  }

  const sessionMatch = pathname.match(/^\/api\/v1\/simple\/sessions\/(staff|client)\/([a-f0-9]+)$/);
  if (sessionMatch && method === 'DELETE') {
    const revoked =
      sessionMatch[1] === 'staff'
        ? janitouStore.revokeStaffSessionHash(sessionMatch[2])
        : janitouStore.revokeClientSessionHash(sessionMatch[2]);
    if (!revoked) {
      sendError(res, 404, 'Not Found', 'Session introuvable.');
      return true;
    }
    janitouStore.logAuditEvent({
      userId: staff.id,
      userName: staff.fullName,
      action: 'REVOKE_SESSION',
      entityType: sessionMatch[1] === 'staff' ? 'STAFF_SESSION' : 'CLIENT_SESSION',
      entityId: sessionMatch[2].slice(0, 12),
    });
    sendJson(res, 200, { success: true });
    return true;
  }

  if (pathname === '/api/v1/simple/messages' && method === 'GET') {
    sendJson(res, 200, { messages: janitouStore.outboundMessages.slice(0, 100) });
    return true;
  }

  if (pathname === '/api/v1/simple/audit' && method === 'GET') {
    const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit') || 100)));
    const logs = janitouStore.getAuditLogs({
      entityType: searchParams.get('entityType') || undefined,
      action: searchParams.get('action') || undefined,
      limit,
    });
    sendJson(res, 200, { logs });
    return true;
  }

  sendError(res, 404, 'Not Found', `Cannot ${method} ${pathname}`);
  return true;
}
