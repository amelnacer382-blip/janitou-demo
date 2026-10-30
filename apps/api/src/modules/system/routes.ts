import type { IncomingMessage, ServerResponse } from 'node:http';
import { readJsonBody, sendJson, sendError, checkRoleAccess } from '../common/http.js';
import { janitouStore } from '../../services/store.js';
import { openApiSpec, renderSwaggerHtml } from './openapi.js';

export async function handleSystemRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string,
  searchParams: URLSearchParams
): Promise<boolean> {
  // Health checks
  if (pathname === '/health' || pathname === '/api/health') {
    const dbHealth = janitouStore.getDatabaseHealth();
    sendJson(res, 200, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'JANITOU FOOD API',
      version: '1.0.0',
      database: dbHealth,
    });
    return true;
  }

  if (pathname === '/api/docs' && (method === 'GET' || method === 'HEAD')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (method === 'HEAD') {
      res.end();
      return true;
    }
    res.end(renderSwaggerHtml());
    return true;
  }
  if ((pathname === '/api/v1/openapi.json' || pathname === '/api/openapi.json') && method === 'GET') {
    sendJson(res, 200, openApiSpec);
    return true;
  }

  // API Discovery
  if ((pathname === '/api' || pathname === '/api/v1') && method === 'GET') {
    sendJson(res, 200, {
      name: 'JANITOU FOOD Management API',
      version: 'v1',
      description: 'Meal Management, Production and Distribution Platform',
      documentation: '/api/docs',
      openapi: '/api/v1/openapi.json',
      endpoints: {
        customers: '/api/v1/customers',
        ingredients: '/api/v1/ingredients',
        recipes: '/api/v1/recipes',
        mealPlans: '/api/v1/meal-plans',
        orders: '/api/v1/orders',
        productionPlan: '/api/v1/production/plan?date=YYYY-MM-DD',
        productionAutoPurchase: '/api/v1/production/auto-purchase-orders',
        purchasingOrders: '/api/v1/purchasing/orders',
        purchasingSuppliers: '/api/v1/purchasing/suppliers',
        deliveryRuns: '/api/v1/delivery/runs',
        reports: '/api/v1/reports',
        financials: '/api/v1/analytics/financials',
      },
    });
    return true;
  }

  // Audit Logs
  if (pathname === '/api/v1/audit/logs' && method === 'GET') {
    const entityType = searchParams.get('entityType') || undefined;
    const action = searchParams.get('action') || undefined;
    const logs = janitouStore.getAuditLogs({ entityType, action });
    sendJson(res, 200, { logs, count: logs.length });
    return true;
  }

  // Emergency Workshop Package
  if (pathname === '/api/v1/emergency/workshop-package' && method === 'GET') {
    const date = searchParams.get('date') || undefined;
    const emergencyPkg = janitouStore.generateEmergencyWorkshopPackage(date);
    sendJson(res, 200, { emergencyPackage: emergencyPkg });
    return true;
  }

  // System Backup
  if (pathname === '/api/v1/system/backup' && method === 'GET') {
    if (!checkRoleAccess(req, ['ADMIN', 'OPERATIONS_MANAGER'])) {
      sendError(res, 403, 'Forbidden', 'Opération réservée aux administrateurs.');
      return true;
    }
    const backup = janitouStore.createDatabaseBackup();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="janitou-backup-${new Date().toLocaleDateString('en-CA')}.json"`,
    });
    res.end(JSON.stringify(backup, null, 2));
    return true;
  }

  // System Restore
  if (pathname === '/api/v1/system/restore' && method === 'POST') {
    const body = await readJsonBody<{ data: Record<string, unknown> }>(req);
    const ok = janitouStore.restoreDatabaseFromBackup(body);
    if (!ok) {
      sendError(res, 400, 'Restore Error', 'Format de sauvegarde invalide.');
      return true;
    }
    sendJson(res, 200, { message: 'Restauration complète de la base effectuée avec succès.' });
    return true;
  }

  return false;
}
