import type { IncomingMessage, ServerResponse } from 'node:http';
import { readJsonBody, sendJson, sendError } from '../common/http.js';
import { janitouStore } from '../../services/store.js';

export async function handleCustomerRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string
): Promise<boolean> {
  if (pathname === '/api/v1/customers') {
    if (method === 'GET') {
      sendJson(res, 200, { customers: janitouStore.getCustomers() });
      return true;
    }

    if (method === 'POST') {
      const body = await readJsonBody<{
        companyName?: string;
        contactName: string;
        phone: string;
        email?: string;
        deliveryAddress: string;
        wilaya?: string;
        commune?: string;
        deliveryNotes?: string;
        dietaryPreferences?: string[];
      }>(req);

      if (!body.contactName || !body.phone || !body.deliveryAddress) {
        sendError(
          res,
          400,
          'Validation Error',
          'contactName, phone, and deliveryAddress are required.'
        );
        return true;
      }

      const customer = janitouStore.createCustomer({
        companyName: body.companyName?.trim(),
        contactName: body.contactName.trim(),
        phone: body.phone.trim(),
        email: body.email?.trim() || '',
        deliveryAddress: body.deliveryAddress.trim(),
        wilaya: body.wilaya?.trim() || 'Alger',
        commune: body.commune?.trim() || 'Centre',
        deliveryNotes: body.deliveryNotes?.trim(),
        dietaryPreferences: body.dietaryPreferences || ['Standard'],
      });

      sendJson(res, 201, { customer });
      return true;
    }
  }

  const customerDetailMatch = pathname.match(/^\/api\/v1\/customers\/([^/]+)$/);
  if (customerDetailMatch && method === 'GET') {
    const customerId = customerDetailMatch[1];
    const customer = janitouStore.getCustomers().find((c) => c.id === customerId);
    if (!customer) {
      sendError(res, 404, 'Not Found', `Client '${customerId}' introuvable.`);
      return true;
    }

    const balance = customer.accountBalance ?? 0;
    const customerOrders = janitouStore.getOrders().filter((o) => o.customerId === customerId);
    const customerInvoices = janitouStore.getInvoices().filter((i) => i.customerId === customerId);

    sendJson(res, 200, {
      customer,
      balance,
      ordersCount: customerOrders.length,
      recentOrders: customerOrders.slice(-5),
      invoices: customerInvoices,
    });
    return true;
  }

  return false;
}
