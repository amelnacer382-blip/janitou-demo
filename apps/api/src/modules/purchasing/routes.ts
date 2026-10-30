import type { IncomingMessage, ServerResponse } from 'node:http';
import { readJsonBody, sendJson, sendError } from '../common/http.js';
import { janitouStore } from '../../services/store.js';

export async function handlePurchasingRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string
): Promise<boolean> {
  // Suppliers
  if (pathname === '/api/v1/purchasing/suppliers' && method === 'GET') {
    sendJson(res, 200, { suppliers: janitouStore.getSuppliers() });
    return true;
  }

  // Purchase Orders list
  if (pathname === '/api/v1/purchasing/orders') {
    if (method === 'GET') {
      sendJson(res, 200, { purchaseOrders: janitouStore.getPurchaseOrders() });
      return true;
    }
  }

  // Receive Purchase Order
  const receivePOMatch = pathname.match(/^\/api\/v1\/purchasing\/orders\/([^/]+)\/receive$/);
  if (receivePOMatch && method === 'POST') {
    const poId = receivePOMatch[1];
    const received = janitouStore.receivePurchaseOrder(poId);
    if (!received) {
      sendError(res, 404, 'Not Found', `Bon de commande fournisseur '${poId}' introuvable.`);
      return true;
    }
    sendJson(res, 200, {
      message: `Purchase order ${received.poNumber} received. Stock has been incremented.`,
      purchaseOrder: received,
    });
    return true;
  }

  return false;
}
