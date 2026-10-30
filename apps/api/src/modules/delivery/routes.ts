import type { IncomingMessage, ServerResponse } from 'node:http';
import { MealServiceTime } from '@janitou/common';
import { readJsonBody, sendJson, sendError } from '../common/http.js';
import { janitouStore } from '../../services/store.js';

export async function handleDeliveryRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  searchParams: URLSearchParams
): Promise<boolean> {
  // Delivery runs collection
  if (pathname === '/api/v1/delivery/runs') {
    if (method === 'GET') {
      const date = searchParams.get('date') || undefined;
      sendJson(res, 200, { deliveryRuns: janitouStore.getDeliveryRuns(date) });
      return true;
    }

    if (method === 'POST') {
      const body = await readJsonBody<{
        runDate: string;
        serviceTime: MealServiceTime;
        driverName: string;
        driverPhone: string;
      }>(req);

      if (!body.runDate || !body.serviceTime || !body.driverName || !body.driverPhone) {
        sendError(
          res,
          400,
          'Validation Error',
          'runDate, serviceTime, driverName, and driverPhone are required.'
        );
        return true;
      }

      const run = janitouStore.createDeliveryRun({
        runDate: body.runDate,
        serviceTime: body.serviceTime,
        driverName: body.driverName.trim(),
        driverPhone: body.driverPhone.trim(),
      });
      sendJson(res, 201, { deliveryRun: run });
      return true;
    }
  }

  // Mark stop completed
  const deliveryStopMatch = pathname.match(/^\/api\/v1\/delivery\/runs\/([^/]+)\/stops\/([^/]+)$/);
  if (deliveryStopMatch && method === 'PATCH') {
    const [, runId, stopId] = deliveryStopMatch;
    const body = await readJsonBody<{ comment?: string }>(req);
    const updatedRun = janitouStore.markDeliveryStopCompleted(runId, stopId, body.comment);
    if (!updatedRun) {
      sendError(res, 404, 'Not Found', 'Delivery run or stop not found.');
      return true;
    }
    sendJson(res, 200, { deliveryRun: updatedRun });
    return true;
  }

  // Driver compensation calculation
  const driverCompensationMatch = pathname.match(/^\/api\/v1\/delivery\/runs\/([^/]+)\/compensation$/);
  if (driverCompensationMatch && method === 'GET') {
    const runId = driverCompensationMatch[1];
    const comp = janitouStore.calculateDriverCompensation(runId);
    sendJson(res, 200, { compensation: comp });
    return true;
  }

  // Transfer delivery run to another driver
  const transferRunMatch = pathname.match(/^\/api\/v1\/delivery\/runs\/([^/]+)\/transfer$/);
  if (transferRunMatch && method === 'POST') {
    const runId = transferRunMatch[1];
    const body = await readJsonBody<{ newDriverName: string; newDriverPhone: string; reason?: string }>(req);
    if (!body.newDriverName || !body.newDriverPhone) {
      sendError(res, 400, 'Validation Error', 'newDriverName and newDriverPhone are required.');
      return true;
    }
    const transferred = janitouStore.transferDeliveryRun(
      runId,
      body.newDriverName.trim(),
      body.newDriverPhone.trim(),
      body.reason?.trim() || 'Indisponibilité chauffeur'
    );
    if (!transferred) {
      sendError(res, 404, 'Not Found', `Tournée '${runId}' introuvable.`);
      return true;
    }
    sendJson(res, 200, {
      run: transferred,
      message: `Tournée transférée avec succès à ${body.newDriverName}.`,
    });
    return true;
  }

  return false;
}
