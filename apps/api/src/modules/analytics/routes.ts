import type { IncomingMessage, ServerResponse } from 'node:http';
import { MealServiceTime } from '@janitou/common';
import { readJsonBody, sendJson, sendError, checkRoleAccess } from '../common/http.js';
import { janitouStore } from '../../services/store.js';

export async function handleAnalyticsRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  searchParams: URLSearchParams
): Promise<boolean> {
  // Financial analytics
  if (pathname === '/api/v1/analytics/financials' && method === 'GET') {
    if (!checkRoleAccess(req, ['ADMIN', 'OPERATIONS_MANAGER'])) {
      sendError(res, 403, 'Forbidden', 'Accès interdit aux données financières pour ce profil.');
      return true;
    }
    const date = searchParams.get('date') || undefined;
    const analytics = janitouStore.getFinancialAnalytics(date);
    sendJson(res, 200, { analytics });
    return true;
  }

  // Production CSV export
  if (pathname === '/api/v1/export/production' && method === 'GET') {
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const serviceTime = (searchParams.get('serviceTime') as MealServiceTime) || undefined;
    const csvContent = janitouStore.exportProductionSheetCsv(date, serviceTime);
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="production-sheet-${date}.csv"`,
    });
    res.end(csvContent);
    return true;
  }

  // Delivery manifest CSV export
  if (pathname === '/api/v1/export/delivery' && method === 'GET') {
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const serviceTime = (searchParams.get('serviceTime') as MealServiceTime) || undefined;
    const csvContent = janitouStore.exportDeliveryManifestCsv(date, serviceTime);
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="delivery-manifest-${date}.csv"`,
    });
    res.end(csvContent);
    return true;
  }

  // Invoices & Accounting
  if (pathname === '/api/v1/accounting/invoices' && method === 'GET') {
    const customerId = searchParams.get('customerId') || undefined;
    sendJson(res, 200, { invoices: janitouStore.getInvoices(customerId) });
    return true;
  }

  // Payments
  if (pathname === '/api/v1/accounting/payments') {
    if (method === 'GET') {
      const customerId = searchParams.get('customerId') || undefined;
      sendJson(res, 200, { payments: janitouStore.getPayments(customerId) });
      return true;
    }
    if (method === 'POST') {
      const body = await readJsonBody<{
        customerId: string;
        amount: number;
        paymentMethod: 'CASH' | 'CHECK' | 'BANK_TRANSFER' | 'PREPAID_CREDIT';
        invoiceId?: string;
        notes?: string;
      }>(req);

      if (
        !body.customerId ||
        typeof body.amount !== 'number' ||
        body.amount <= 0 ||
        isNaN(body.amount) ||
        !body.paymentMethod
      ) {
        sendError(
          res,
          400,
          'Validation Error',
          'customerId, positive amount, and paymentMethod are required.'
        );
        return true;
      }

      const payment = janitouStore.recordPayment({
        customerId: body.customerId,
        amount: body.amount,
        paymentMethod: body.paymentMethod,
        invoiceId: body.invoiceId,
        notes: body.notes?.trim(),
      });
      sendJson(res, 201, { payment });
      return true;
    }
  }

  // Customer statement
  const statementMatch = pathname.match(/^\/api\/v1\/accounting\/statements\/([^/]+)$/);
  if (statementMatch && method === 'GET') {
    const customerId = statementMatch[1];
    const statement = janitouStore.getCustomerStatement(customerId);
    if (!statement.customer) {
      sendError(res, 404, 'Not Found', `Client '${customerId}' introuvable.`);
      return true;
    }
    sendJson(res, 200, { statement });
    return true;
  }

  // Official Reports Hub
  if (pathname === '/api/v1/reports' && method === 'GET') {
    const reportsCatalog = [
      { id: 1, title: 'Commandes' },
      { id: 2, title: 'Production (prévu/réel, surplus/pénuries)' },
      { id: 3, title: 'Achats & réceptions' },
      { id: 4, title: 'Suppléments' },
      { id: 5, title: 'Emballage (individuel & collectif)' },
      { id: 6, title: 'Distribution & tournées' },
      { id: 7, title: 'Comptes clients & soldes' },
      { id: 8, title: 'Clients & Hiérarchie sociétés/filiales' },
      { id: 9, title: 'Statistiques consommation' },
      { id: 10, title: 'Performance globale' },
      { id: 11, title: 'Journal d’audit' },
      { id: 12, title: 'Paiements & Reçus' },
      { id: 13, title: 'Alternatives & Régimes spéciaux' },
      { id: 14, title: 'Synthèse hebdomadaire 360°' },
    ];
    sendJson(res, 200, { reports: reportsCatalog });
    return true;
  }

  const reportDetailMatch = pathname.match(/^\/api\/v1\/reports\/([0-9]+)$/);
  if (reportDetailMatch && method === 'GET') {
    const reportId = parseInt(reportDetailMatch[1], 10);
    const date = searchParams.get('date') || undefined;
    const result = janitouStore.generateReport(reportId, date);
    sendJson(res, 200, { report: result });
    return true;
  }

  return false;
}
