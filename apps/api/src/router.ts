import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setSecurityHeaders, sendError, checkRateLimit } from './modules/common/http.js';
import { handleCustomerRoutes } from './modules/customers/routes.js';
import { handleRecipeRoutes } from './modules/recipes/routes.js';
import { handleMenuRoutes } from './modules/menus/routes.js';
import { handleOrderRoutes } from './modules/orders/routes.js';
import { handleProductionRoutes } from './modules/production/routes.js';
import { handlePurchasingRoutes } from './modules/purchasing/routes.js';
import { handleDeliveryRoutes } from './modules/delivery/routes.js';
import { handleAnalyticsRoutes } from './modules/analytics/routes.js';
import { handleSystemRoutes } from './modules/system/routes.js';

export async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const { pathname, searchParams } = url;
  const method = req.method?.toUpperCase() || 'GET';

  // Apply OWASP Security Headers & Global CORS
  setSecurityHeaders(res);

  // Rate Limiting Protection (300 req / min)
  const rateLimit = checkRateLimit(req, 300, 60000);
  res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining));
  if (!rateLimit.allowed) {
    sendError(res, 429, 'Too Many Requests', 'Rate limit exceeded. Please retry shortly.');
    return;
  }
  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // ----------------------------------------------------
    // Web Application Dashboard UI & Static Assets
    // ----------------------------------------------------
    if (pathname === '/' || pathname === '/dashboard') {
      try {
        const htmlPath = resolve(process.cwd(), 'apps/web/src/dashboard.html');
        const htmlContent = await readFile(htmlPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        if (method === 'HEAD') {
          res.end();
          return;
        }
        res.end(htmlContent);
        return;
      } catch {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>JANITOU FOOD API is active</h1><p>Dashboard file loading error.</p>`);
        return;
      }
    }

    if (
      pathname === '/logo.png' ||
      pathname === '/janitou-logo.png' ||
      pathname === '/janitou.jfif' ||
      pathname === '/favicon.ico'
    ) {
      try {
        const isJfif = pathname.endsWith('.jfif');
        const imgPath = resolve(
          process.cwd(),
          isJfif ? 'apps/web/src/janitou.jfif' : 'apps/web/src/logo.png'
        );
        const imgData = await readFile(imgPath);
        res.writeHead(200, {
          'Content-Type': isJfif ? 'image/jpeg' : 'image/png',
          'Cache-Control': 'public, max-age=86400',
        });
        res.end(imgData);
        return;
      } catch {
        res.writeHead(404);
        res.end();
        return;
      }
    }

    // ----------------------------------------------------
    // Modular Route Dispatchers
    // ----------------------------------------------------
    if (await handleSystemRoutes(req, res, pathname, method, searchParams)) return;
    if (await handleCustomerRoutes(req, res, pathname, method)) return;
    if (await handleRecipeRoutes(req, res, pathname, method, searchParams)) return;
    if (await handleMenuRoutes(req, res, pathname, method, searchParams)) return;
    if (await handleOrderRoutes(req, res, pathname, method, searchParams)) return;
    if (await handleProductionRoutes(req, res, pathname, method, searchParams)) return;
    if (await handlePurchasingRoutes(req, res, pathname, method)) return;
    if (await handleDeliveryRoutes(req, res, pathname, method, searchParams)) return;
    if (await handleAnalyticsRoutes(req, res, pathname, method, searchParams)) return;

    // ----------------------------------------------------
    // Default 404 Not Found
    // ----------------------------------------------------
    sendError(res, 404, 'Not Found', `Cannot ${method} ${pathname}`);
  } catch (error: unknown) {
    console.error('[API Router Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    sendError(res, 500, 'Internal Server Error', errorMessage);
  }
}
