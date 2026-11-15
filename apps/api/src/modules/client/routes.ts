import type { IncomingMessage, ServerResponse } from 'node:http';

import { readJsonBody, sanitizeString, sendError, sendJson } from '../common/http.js';
import { MealServiceTime } from '@janitou/common';
import { janitouStore } from '../../services/store.js';
import { hashPin, normalizePhone, verifyPin } from '../../services/pin.js';
import {
  addDaysIso,
  isIsoDate,
  toIsoDate,
  type ClientAccountView,
  type PackagingType,
} from '../../data/simple-demo.js';
import type { DbCustomer } from '../../data/mock-db.js';

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function accountView(customer: DbCustomer): ClientAccountView {
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
  };
}

function createSession(customerId: string): Promise<string> {
  return janitouStore.createClientSession(customerId);
}

function authenticatedCustomer(req: IncomingMessage): DbCustomer | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  const customerId = janitouStore.getClientSessionCustomerId(
    header.slice('Bearer '.length)
  );
  return customerId ? janitouStore.getCustomerById(customerId) : undefined;
}

function tooManyAttempts(phone: string): boolean {
  const key = normalizePhone(phone);
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  if (!attempt || now > attempt.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  attempt.count += 1;
  return attempt.count > 8;
}

function clearAttempts(phone: string): void {
  loginAttempts.delete(normalizePhone(phone));
}

function parsePackaging(value: unknown): PackagingType | undefined {
  return value === 'INDIVIDUAL' || value === 'COLLECTIVE' ? value : undefined;
}

const ORDER_ERROR_MESSAGES: Record<string, string> = {
  ACCOUNT_NOT_ACTIVE: 'حسابك غير مفعّل، بانتظار موافقة الإدارة.',
  ACCOUNT_NOT_FOUND: 'الحساب غير موجود.',
  NO_MENU: 'لا توجد قائمة طعام لهذا اليوم.',
  ORDER_CLOSED: 'انتهت فترة استقبال الطلبات لهذا اليوم.',
  SERVICE_INVALID: 'اختر وقت الغداء أو العشاء.',
  CATALOGUE_EMPTY: 'اختر طبقاً واحداً على الأقل.',
  DISH_UNAVAILABLE: 'أحد الأطباق غير متوفر.',
  ORDER_NOT_FOUND: 'الطلب غير موجود.',
  ORDER_NOT_EDITABLE: 'لا يمكن تعديل هذا الطلب.',
  QUANTITY_INVALID: 'الكمية غير صحيحة.',
  QUANTITY_EMPTY: 'اختر وجبة غداء أو عشاء على الأقل.',
  NO_LUNCH_DISH: 'لا يوجد طبق غداء لهذا اليوم.',
  NO_DINNER_DISH: 'لا يوجد طبق عشاء لهذا اليوم.',
  PACKAGING_REQUIRED: 'اختر نوع التغليف لكل وجبة.',
  ALTERNATIVE_UNAVAILABLE: 'أحد البدائل غير متوفر.',
  EXTRA_UNAVAILABLE: 'إضافة غير متوفرة.',
  EXTRA_QUANTITY_INVALID: 'كمية الإضافة تتجاوز المقترح.',
  REVIEW_REQUIRED: 'يجب مراجعة الحساب من الإدارة قبل استئناف الطلبات.',
  INSUFFICIENT_BALANCE: 'الرصيد غير كافٍ لتعديل الطلب. يرجى تعبئة الرصيد.',
};

function sendOrderError(res: ServerResponse, error: unknown): void {
  const code = error instanceof Error ? error.message : 'ORDER_FAILED';
  const status =
    code === 'ACCOUNT_NOT_ACTIVE' || code === 'REVIEW_REQUIRED'
      ? 403
      : code === 'ORDER_NOT_FOUND'
        ? 404
        : 400;
  sendError(res, status, 'Order Rejected', ORDER_ERROR_MESSAGES[code] || 'تعذر تنفيذ العملية.');
}

interface ParsedOrder {
  lunchPortions: number;
  dinnerPortions: number;
  lunchPackaging?: PackagingType;
  dinnerPackaging?: PackagingType;
  alternatives: { dishId: string; portions: number }[];
  extras: { name: string; quantity: number }[];
  notes?: string;
}

function parseOrderBody(body: {
  lunchPortions?: number;
  dinnerPortions?: number;
  lunchPackaging?: string;
  dinnerPackaging?: string;
  alternatives?: { dishId?: string; portions?: number }[];
  extras?: { name?: string; quantity?: number }[];
  notes?: string;
}): { error?: string; value?: ParsedOrder } {
  if (body.notes && body.notes.length > 300) return { error: 'الملاحظات طويلة جداً.' };
  if (!Array.isArray(body.alternatives) || !Array.isArray(body.extras)) {
    return { error: 'البيانات غير مكتملة.' };
  }
  const alternatives = body.alternatives.map((entry) => ({
    dishId: String(entry.dishId || ''),
    portions: Number(entry.portions || 0),
  }));
  if (alternatives.some((entry) => !entry.dishId)) return { error: 'بديل غير صحيح.' };
  const extras = body.extras.map((entry) => ({
    name: String(entry.name || ''),
    quantity: Number(entry.quantity || 0),
  }));
  return {
    value: {
      lunchPortions: Number(body.lunchPortions || 0),
      dinnerPortions: Number(body.dinnerPortions || 0),
      lunchPackaging: parsePackaging(body.lunchPackaging),
      dinnerPackaging: parsePackaging(body.dinnerPackaging),
      alternatives,
      extras,
      notes: body.notes,
    },
  };
}

export async function handleClientRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  searchParams: URLSearchParams
): Promise<boolean> {
  if (!pathname.startsWith('/api/v1/client')) return false;

  if (pathname === '/api/v1/client/register') {
    sendError(
      res,
      403,
      'Registration Disabled',
      'الحساب يُنشأ من طرف مطعم جانيتو فود. تواصل مع الإدارة للحصول على رمز الدخول.'
    );
    return true;
  }

  if (pathname === '/api/v1/client/login' && method === 'POST') {
    let body: { phone?: string; pin?: string };
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
      return true;
    }
    const phone = sanitizeString(body.phone || '');
    const pin = String(body.pin || '');
    if (tooManyAttempts(phone)) {
      sendError(res, 429, 'Too Many Requests', 'محاولات كثيرة، أعد المحاولة لاحقاً.');
      return true;
    }
    const customer = janitouStore.getCustomerByPhone(phone);
    if (!customer || !customer.pinSalt || !customer.pinHash || !verifyPin(pin, customer.pinSalt, customer.pinHash)) {
      sendError(res, 401, 'Unauthorized', 'رقم الهاتف أو رمز الدخول غير صحيح.');
      return true;
    }
    if ((customer.accountStatus || 'ACTIVE') === 'CANCELLED') {
      sendError(res, 403, 'Forbidden', 'هذا الحساب ملغى.');
      return true;
    }
    clearAttempts(phone);
    sendJson(res, 200, {
      token: await createSession(customer.id),
      account: accountView(customer),
    });
    return true;
  }

  if (pathname === '/api/v1/client/logout' && method === 'POST') {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      await janitouStore.deleteClientSession(header.slice('Bearer '.length));
    }
    sendJson(res, 200, { success: true });
    return true;
  }

  if (pathname === '/api/v1/client/me' && method === 'GET') {
    const customer = authenticatedCustomer(req);
    if (!customer) {
      sendError(res, 401, 'Unauthorized', 'الجلسة غير صالحة.');
      return true;
    }
    sendJson(res, 200, { account: accountView(customer) });
    return true;
  }

  if (pathname === '/api/v1/client/config' && method === 'GET') {
    const settings = janitouStore.getSimpleSettings();
    sendJson(res, 200, {
      settings: {
        lunchPrice: settings.lunchPrice,
        dinnerPrice: settings.dinnerPrice,
        packagingPrice: settings.packagingPrice,
        deliveryPrice: settings.deliveryPrice,
        extras: settings.extras,
        cutoffTime: settings.cutoffTime,
        cutoffDaysBefore: settings.cutoffDaysBefore,
      },
    });
    return true;
  }

  if (pathname === '/api/v1/client/catalogue' && method === 'GET') {
    const settings = janitouStore.getSimpleSettings();
    sendJson(res, 200, {
      dishes: janitouStore.getClientDishes(),
      packagingPrice: settings.packagingPrice,
      deliveryPrice: settings.deliveryPrice,
      extras: settings.extras,
    });
    return true;
  }

  if (pathname === '/api/v1/client/guest-orders' && method === 'GET') {
    const phone = sanitizeString(searchParams.get('phone') || '');
    const orderNumber = sanitizeString(searchParams.get('orderNumber') || '');
    if (normalizePhone(phone).length < 9 || normalizePhone(phone).length > 15) {
      sendError(res, 400, 'Validation Error', 'رقم الهاتف غير صحيح.');
      return true;
    }
    const customer = janitouStore.getCustomerByPhone(phone);
    if (!customer) {
      sendJson(res, 200, { orders: [] });
      return true;
    }
    const orders = [
      ...janitouStore.getPendingClientOrders(customer.id),
      ...janitouStore.getClientOrders(customer.id),
    ]
      .filter((order) => !orderNumber || order.orderNumber === orderNumber)
      .sort((left, right) => right.deliveryDate.localeCompare(left.deliveryDate))
      .slice(0, 30)
      .map((order) => ({
        orderNumber: order.orderNumber,
        deliveryDate: order.deliveryDate,
        serviceTime: order.serviceTime,
        status: order.status,
        totalPortions: order.totalPortions,
        totalPrice: order.totalPrice,
        items: order.items || [],
        orderMode: order.orderMode || 'MENU',
      }));
    sendJson(res, 200, { orders });
    return true;
  }

  if (pathname === '/api/v1/client/guest-orders' && method === 'POST') {
    let body: {
      contactName?: string;
      phone?: string;
      deliveryAddress?: string;
      date?: string;
      serviceTime?: string;
      packaging?: string;
      items?: { dishId?: string; portions?: number }[];
      extras?: { name?: string; quantity?: number }[];
      notes?: string;
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
    if (contactName.length < 2 || contactName.length > 80) {
      sendError(res, 400, 'Validation Error', 'الاسم مطلوب.');
      return true;
    }
    if (normalizePhone(phone).length < 9 || normalizePhone(phone).length > 15) {
      sendError(res, 400, 'Validation Error', 'رقم الهاتف غير صحيح.');
      return true;
    }
    if (deliveryAddress.length < 5 || deliveryAddress.length > 200) {
      sendError(res, 400, 'Validation Error', 'عنوان التوصيل مطلوب.');
      return true;
    }
    if (!isIsoDate(body.date)) {
      sendError(res, 400, 'Validation Error', 'التاريخ غير صحيح.');
      return true;
    }
    const packaging = parsePackaging(body.packaging);
    if (!packaging) {
      sendError(res, 400, 'Validation Error', 'اختر نوع التغليف.');
      return true;
    }
    if (body.serviceTime !== 'LUNCH' && body.serviceTime !== 'DINNER') {
      sendError(res, 400, 'Validation Error', ORDER_ERROR_MESSAGES.SERVICE_INVALID);
      return true;
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      sendError(res, 400, 'Validation Error', ORDER_ERROR_MESSAGES.CATALOGUE_EMPTY);
      return true;
    }
    const items = body.items.map((entry) => ({
      dishId: String(entry.dishId || ''),
      portions: Number(entry.portions || 0),
    }));
    if (items.some((entry) => !entry.dishId || !Number.isInteger(entry.portions) || entry.portions < 1)) {
      sendError(res, 400, 'Validation Error', 'الأطباق أو الكميات غير صحيحة.');
      return true;
    }
    const extras = Array.isArray(body.extras)
      ? body.extras.map((entry) => ({ name: String(entry.name || ''), quantity: Number(entry.quantity || 0) }))
      : [];
    if (body.notes && body.notes.length > 300) {
      sendError(res, 400, 'Validation Error', 'الملاحظات طويلة جداً.');
      return true;
    }
    try {
      const customer = janitouStore.getOrCreateGuestCustomer({
        contactName,
        phone,
        deliveryAddress,
      });
      const pending = customer.accountStatus !== 'ACTIVE';
      const order = janitouStore.placeClientCatalogueOrder({
        customer,
        date: body.date,
        serviceTime:
          body.serviceTime === 'LUNCH' ? MealServiceTime.LUNCH : MealServiceTime.DINNER,
        items,
        packaging,
        extras,
        notes: body.notes,
        pending,
      });
      sendJson(res, 201, {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          deliveryDate: order.deliveryDate,
          status: order.status,
          totalPortions: order.totalPortions,
          totalPrice: order.totalPrice,
          pending,
        },
      });
    } catch (error) {
      sendOrderError(res, error);
    }
    return true;
  }

  if (pathname === '/api/v1/client/menu' && method === 'GET') {
    const today = toIsoDate(new Date());
    const from = searchParams.get('from') || today;
    const to = searchParams.get('to') || addDaysIso(today, 6);
    if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
      sendError(res, 400, 'Validation Error', 'Plage de dates invalide.');
      return true;
    }
    sendJson(res, 200, { days: janitouStore.getClientMenuRange(from, to) });
    return true;
  }

  if (pathname === '/api/v1/client/orders' && method === 'GET') {
    const customer = authenticatedCustomer(req);
    if (!customer) {
      sendError(res, 401, 'Unauthorized', 'الجلسة غير صالحة.');
      return true;
    }
    sendJson(res, 200, { orders: janitouStore.getClientOrders(customer.id) });
    return true;
  }

  if (pathname === '/api/v1/client/orders' && method === 'POST') {
    const customer = authenticatedCustomer(req);
    if (!customer) {
      sendError(res, 401, 'Unauthorized', 'الجلسة غير صالحة.');
      return true;
    }
    let body: {
      date?: string;
      lunchPortions?: number;
      dinnerPortions?: number;
      lunchPackaging?: string;
      dinnerPackaging?: string;
      alternatives?: { dishId?: string; portions?: number }[];
      extras?: { name?: string; quantity?: number }[];
      notes?: string;
      items?: { dishId?: string; portions?: number }[];
      serviceTime?: string;
      packaging?: string;
    };
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
      return true;
    }
    if (!isIsoDate(body.date)) {
      sendError(res, 400, 'Validation Error', 'التاريخ غير صحيح.');
      return true;
    }
    if (Array.isArray(body.items) && body.items.length > 0) {
      const packaging = parsePackaging(body.packaging);
      if (!packaging) {
        sendError(res, 400, 'Validation Error', 'اختر نوع التغليف.');
        return true;
      }
      if (body.serviceTime !== 'LUNCH' && body.serviceTime !== 'DINNER') {
        sendError(res, 400, 'Validation Error', ORDER_ERROR_MESSAGES.SERVICE_INVALID);
        return true;
      }
      const items = body.items.map((entry) => ({
        dishId: String(entry.dishId || ''),
        portions: Number(entry.portions || 0),
      }));
      if (items.some((entry) => !entry.dishId || !Number.isInteger(entry.portions) || entry.portions < 1)) {
        sendError(res, 400, 'Validation Error', 'الأطباق أو الكميات غير صحيحة.');
        return true;
      }
      const extras = Array.isArray(body.extras)
        ? body.extras.map((entry) => ({ name: String(entry.name || ''), quantity: Number(entry.quantity || 0) }))
        : [];
      if (body.notes && body.notes.length > 300) {
        sendError(res, 400, 'Validation Error', 'الملاحظات طويلة جداً.');
        return true;
      }
      try {
        const order = janitouStore.placeClientCatalogueOrder({
          customer,
          date: body.date,
          serviceTime:
            body.serviceTime === 'LUNCH' ? MealServiceTime.LUNCH : MealServiceTime.DINNER,
          items,
          packaging,
          extras,
          notes: body.notes,
        });
        sendJson(res, 201, {
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            deliveryDate: order.deliveryDate,
            status: order.status,
            totalPortions: order.totalPortions,
            totalPrice: order.totalPrice,
          },
        });
      } catch (error) {
        sendOrderError(res, error);
      }
      return true;
    }

    const parsed = parseOrderBody(body);
    if (!parsed.value) {
      sendError(res, 400, 'Validation Error', parsed.error || 'البيانات غير مكتملة.');
      return true;
    }

    try {
      const value = parsed.value;
      const isEmptyOrder =
        value.lunchPortions === 0 &&
        value.dinnerPortions === 0 &&
        value.alternatives.every((entry) => entry.portions === 0) &&
        value.extras.every((entry) => entry.quantity === 0);
      const order = janitouStore.placeClientOrder({
        customer,
        date: body.date,
        ...value,
        allowEmpty: isEmptyOrder,
      });
      sendJson(res, 201, {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          deliveryDate: order.deliveryDate,
          status: order.status,
          totalPortions: order.totalPortions,
          totalPrice: order.totalPrice,
        },
      });
    } catch (error) {
      sendOrderError(res, error);
    }
    return true;
  }

  if (pathname === '/api/v1/client/notifications' && method === 'GET') {
    const customer = authenticatedCustomer(req);
    if (!customer) {
      sendError(res, 401, 'Unauthorized', 'الجلسة غير صالحة.');
      return true;
    }
    sendJson(res, 200, {
      notifications: janitouStore.getClientNotifications(customer.id),
    });
    return true;
  }

  if (pathname === '/api/v1/client/notifications/read' && method === 'PATCH') {
    const customer = authenticatedCustomer(req);
    if (!customer) {
      sendError(res, 401, 'Unauthorized', 'الجلسة غير صالحة.');
      return true;
    }
    janitouStore.markClientNotificationsRead(customer.id);
    sendJson(res, 200, { success: true });
    return true;
  }

  const orderMatch = pathname.match(/^\/api\/v1\/client\/orders\/([^/]+)$/);
  if (orderMatch && (method === 'PATCH' || method === 'DELETE')) {
    const customer = authenticatedCustomer(req);
    if (!customer) {
      sendError(res, 401, 'Unauthorized', 'الجلسة غير صالحة.');
      return true;
    }
    if (method === 'DELETE') {
      try {
        const order = janitouStore.cancelClientOrder(customer.id, orderMatch[1]);
        sendJson(res, 200, { order: { id: order.id, status: order.status } });
      } catch (error) {
        sendOrderError(res, error);
      }
      return true;
    }

    let body: {
      lunchPortions?: number;
      dinnerPortions?: number;
      lunchPackaging?: string;
      dinnerPackaging?: string;
      alternatives?: { dishId?: string; portions?: number }[];
      extras?: { name?: string; quantity?: number }[];
      notes?: string;
    };
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
      return true;
    }
    const parsed = parseOrderBody(body);
    if (!parsed.value) {
      sendError(res, 400, 'Validation Error', parsed.error || 'البيانات غير مكتملة.');
      return true;
    }
    try {
      const order = janitouStore.updateClientOrder(customer.id, orderMatch[1], parsed.value);
      sendJson(res, 200, {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          totalPortions: order.totalPortions,
          totalPrice: order.totalPrice,
        },
      });
    } catch (error) {
      sendOrderError(res, error);
    }
    return true;
  }

  if (pathname === '/api/v1/client/program' && (method === 'GET' || method === 'PUT')) {
    const customer = authenticatedCustomer(req);
    if (!customer) {
      sendError(res, 401, 'Unauthorized', 'الجلسة غير صالحة.');
      return true;
    }
    if (method === 'GET') {
      sendJson(res, 200, { entries: janitouStore.getClientProgram(customer.id) });
      return true;
    }

    let body: {
      entries?: {
        weekday?: number;
        lunchPortions?: number;
        dinnerPortions?: number;
        lunchPackaging?: string;
        dinnerPackaging?: string;
      }[];
    };
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
      return true;
    }
    if (!Array.isArray(body.entries) || body.entries.length > 7) {
      sendError(res, 400, 'Validation Error', 'البرنامج الأسبوعي غير صحيح.');
      return true;
    }
    const entries = [];
    for (const entry of body.entries) {
      if (
        typeof entry.weekday !== 'number' ||
        !Number.isInteger(entry.weekday) ||
        entry.weekday < 0 ||
        entry.weekday > 6
      ) {
        sendError(res, 400, 'Validation Error', 'يوم الأسبوع غير صحيح.');
        return true;
      }
      const lunchPortions = Number(entry.lunchPortions || 0);
      const dinnerPortions = Number(entry.dinnerPortions || 0);
      if (
        !Number.isInteger(lunchPortions) ||
        !Number.isInteger(dinnerPortions) ||
        lunchPortions < 0 ||
        dinnerPortions < 0 ||
        lunchPortions > 30 ||
        dinnerPortions > 30
      ) {
        sendError(res, 400, 'Validation Error', 'الكميات غير صحيحة.');
        return true;
      }
      entries.push({
        weekday: entry.weekday,
        lunchPortions,
        dinnerPortions,
        lunchPackaging: parsePackaging(entry.lunchPackaging),
        dinnerPackaging: parsePackaging(entry.dinnerPackaging),
      });
    }

    const saved = janitouStore.updateClientProgram(customer.id, entries);
    const today = toIsoDate(new Date());
    const generated = janitouStore.generateProgramOrders(today, addDaysIso(today, 6), customer.id);
    sendJson(res, 200, { entries: saved, generatedCount: generated.length });
    return true;
  }

  sendError(res, 404, 'Not Found', `Cannot ${method} ${pathname}`);
  return true;
}
