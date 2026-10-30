import type { IncomingMessage, ServerResponse } from 'node:http';
import { MealServiceTime, OrderStatus } from '@janitou/common';
import { readJsonBody, sendJson, sendError } from '../common/http.js';
import { janitouStore } from '../../services/store.js';

export async function handleOrderRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  searchParams: URLSearchParams
): Promise<boolean> {
  // Orders collection
  if (pathname === '/api/v1/orders') {
    if (method === 'GET') {
      const date = searchParams.get('date') || undefined;
      const serviceTime = (searchParams.get('serviceTime') as MealServiceTime) || undefined;
      const status = (searchParams.get('status') as OrderStatus) || undefined;

      const orders = janitouStore.getOrders({ date, serviceTime, status });
      sendJson(res, 200, { orders, total: orders.length });
      return true;
    }

    if (method === 'POST') {
      const body = await readJsonBody<{
        customerId: string;
        deliveryDate: string;
        serviceTime: MealServiceTime;
        items: { recipeId: string; portions: number; specialNotes?: string }[];
        deliveryAddress?: string;
        notes?: string;
      }>(req);

      if (
        !body.customerId ||
        !body.deliveryDate ||
        !body.serviceTime ||
        !Array.isArray(body.items) ||
        body.items.length === 0
      ) {
        sendError(
          res,
          400,
          'Validation Error',
          'customerId, deliveryDate, serviceTime, and at least one item are required.'
        );
        return true;
      }

      if (body.items.some((i) => typeof i.portions !== 'number' || i.portions <= 0)) {
        sendError(res, 400, 'Validation Error', 'Each item portions must be a positive integer.');
        return true;
      }

      const newOrder = janitouStore.createOrder({
        customerId: body.customerId,
        deliveryDate: body.deliveryDate,
        serviceTime: body.serviceTime,
        items: body.items,
        deliveryAddress: body.deliveryAddress,
        notes: body.notes?.trim(),
      });

      sendJson(res, 201, { order: newOrder });
      return true;
    }
  }

  // Order status update
  const orderStatusMatch = pathname.match(/^\/api\/v1\/orders\/([^/]+)\/status$/);
  if (orderStatusMatch && method === 'PATCH') {
    const orderId = orderStatusMatch[1];
    const body = await readJsonBody<{ status: OrderStatus }>(req);

    if (!body.status || !Object.values(OrderStatus).includes(body.status)) {
      sendError(res, 400, 'Validation Error', `Invalid status. Valid values: ${Object.values(OrderStatus).join(', ')}`);
      return true;
    }

    const updated = janitouStore.updateOrderStatus(orderId, body.status);
    if (!updated) {
      sendError(res, 404, 'Not Found', `Commande '${orderId}' introuvable.`);
      return true;
    }

    sendJson(res, 200, { order: updated });
    return true;
  }

  // Subscriptions
  if (pathname === '/api/v1/subscriptions') {
    if (method === 'GET') {
      sendJson(res, 200, { subscriptions: janitouStore.getSubscriptions() });
      return true;
    }

    if (method === 'POST') {
      const body = await readJsonBody<{
        customerId: string;
        planName: string;
        serviceTimes: MealServiceTime[];
        dailyPortions: number;
        activeDays: string[];
        dietaryTags?: string[];
        preferredRecipeId?: string;
      }>(req);

      if (!body.customerId || !body.planName || !body.dailyPortions || body.dailyPortions <= 0) {
        sendError(res, 400, 'Validation Error', 'customerId, planName, and positive dailyPortions are required.');
        return true;
      }

      const sub = janitouStore.createSubscription({
        customerId: body.customerId,
        planName: body.planName.trim(),
        serviceTimes: body.serviceTimes || [MealServiceTime.LUNCH],
        dailyPortions: body.dailyPortions,
        activeDays: body.activeDays || ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'],
        dietaryTags: body.dietaryTags || ['Standard'],
        status: 'ACTIVE',
        preferredRecipeId: body.preferredRecipeId,
      });

      sendJson(res, 201, { subscription: sub });
      return true;
    }
  }

  // Generate orders from subscriptions
  if (pathname === '/api/v1/subscriptions/generate-orders' && method === 'POST') {
    const body = await readJsonBody<{ date?: string }>(req);
    const targetDate = body.date || new Date().toLocaleDateString('en-CA');
    const generatedOrders = janitouStore.generateOrdersFromSubscriptions(targetDate);
    sendJson(res, 201, {
      message: `${generatedOrders.length} orders generated from active subscriptions for ${targetDate}.`,
      orders: generatedOrders,
    });
    return true;
  }

  return false;
}
