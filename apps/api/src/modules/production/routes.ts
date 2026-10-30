import type { IncomingMessage, ServerResponse } from 'node:http';
import { MealServiceTime } from '@janitou/common';
import { readJsonBody, sendJson, sendError } from '../common/http.js';
import { janitouStore } from '../../services/store.js';

export async function handleProductionRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  searchParams: URLSearchParams
): Promise<boolean> {
  // Production Planning
  if (pathname === '/api/v1/production/plan' && method === 'GET') {
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const serviceTimeParam = searchParams.get('serviceTime');
    const serviceTime = serviceTimeParam ? (serviceTimeParam as MealServiceTime) : undefined;

    const plan = janitouStore.calculateProductionNeeds(date, serviceTime);
    sendJson(res, 200, { plan });
    return true;
  }

  // Auto PO generation from deficits
  if (pathname === '/api/v1/production/auto-purchase-orders' && method === 'POST') {
    const body = await readJsonBody<{ date: string; serviceTime?: MealServiceTime }>(req);
    if (!body.date) {
      sendError(res, 400, 'Validation Error', 'date is required.');
      return true;
    }
    const createdPOs = janitouStore.generatePurchaseOrdersFromDeficits(body.date, body.serviceTime);
    sendJson(res, 201, {
      message: `${createdPOs.length} purchase orders generated from calculated ingredient deficits.`,
      purchaseOrders: createdPOs,
    });
    return true;
  }

  // Thermal Packaging Labels
  if (pathname === '/api/v1/packaging/labels' && method === 'GET') {
    const date = searchParams.get('date');
    const orderId = searchParams.get('orderId');
    const labels = orderId
      ? janitouStore.generatePackagingLabels(orderId, true)
      : janitouStore.generatePackagingLabels(date || undefined, false);
    sendJson(res, 200, { labels, count: labels.length });
    return true;
  }

  // KDS Batches
  if (pathname === '/api/v1/kds/batches' && method === 'GET') {
    const date = searchParams.get('date') || undefined;
    const batches = janitouStore.getKdsBatches(date);
    sendJson(res, 200, { batches });
    return true;
  }

  const kdsStageMatch = pathname.match(/^\/api\/v1\/kds\/batches\/([^/]+)\/stage$/);
  if (kdsStageMatch && method === 'PATCH') {
    const batchId = kdsStageMatch[1];
    const body = await readJsonBody<{ stage: 'TO_PREPARE' | 'COOKING' | 'PACKAGING' | 'READY' }>(req);
    const validStages = ['TO_PREPARE', 'COOKING', 'PACKAGING', 'READY'];
    if (!body.stage || !validStages.includes(body.stage)) {
      sendError(res, 400, 'Validation Error', `Invalid stage. Valid stages: ${validStages.join(', ')}`);
      return true;
    }
    const updated = janitouStore.updateKdsBatchStage(batchId, body.stage);
    if (!updated) {
      sendError(res, 404, 'Not Found', `Batch '${batchId}' introuvable.`);
      return true;
    }
    sendJson(res, 200, { batch: updated });
    return true;
  }

  return false;
}
