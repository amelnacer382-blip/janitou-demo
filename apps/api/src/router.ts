import type { IncomingMessage, ServerResponse } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
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
import { handleSimpleRoutes } from './modules/simple/routes.js';
import { handleClientRoutes } from './modules/client/routes.js';
import { handleAuthRoutes } from './modules/auth/routes.js';
import { authenticatedStaff } from './modules/auth/session.js';

const PUBLIC_API_PREFIXES = [
  '/api/v1/auth',
  '/api/v1/client',
  '/api/v1/simple',
  '/api/v1/openapi.json',
];

const STATIC_MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const APP_DIR_CANDIDATES = [
  resolve(process.cwd(), 'apps/web/src/app'),
  resolve(process.cwd(), '../web/src/app'),
  resolve(process.cwd(), 'src/app'),
];

const CLIENT_DIR_CANDIDATES = [
  resolve(process.cwd(), 'apps/web/src/client'),
  resolve(process.cwd(), '../web/src/client'),
  resolve(process.cwd(), 'src/client'),
];

const UPLOAD_DIR_CANDIDATES = [
  resolve(process.cwd(), 'data/uploads'),
  resolve(process.cwd(), '../data/uploads'),
];

function resolveInside(baseDir: string, relativePath: string): string | null {
  if (!relativePath || relativePath.includes('\0')) return null;
  const target = resolve(baseDir, relativePath);
  const base = resolve(baseDir);
  return target.startsWith(base + sep) ? target : null;
}

async function sendStaticFile(
  res: ServerResponse,
  filePath: string,
  method: string,
  cacheControl: string
): Promise<boolean> {
  try {
    const file = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': STATIC_MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': cacheControl,
    });
    res.end(method === 'HEAD' ? undefined : file);
    return true;
  } catch {
    return false;
  }
}

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
        const candidatePaths = [
          resolve(process.cwd(), 'apps/web/src/dashboard.html'),
          resolve(process.cwd(), '../web/src/dashboard.html'),
          resolve(process.cwd(), 'src/dashboard.html'),
        ];
        let htmlPath = candidatePaths[0];
        for (const p of candidatePaths) {
          if (existsSync(p)) {
            htmlPath = p;
            break;
          }
        }
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
        const fileName = isJfif ? 'janitou.jfif' : 'logo.png';
        const candidateImgPaths = [
          resolve(process.cwd(), `apps/web/src/${fileName}`),
          resolve(process.cwd(), `../web/src/${fileName}`),
          resolve(process.cwd(), `src/${fileName}`),
        ];
        let imgPath = candidateImgPaths[0];
        for (const p of candidateImgPaths) {
          if (existsSync(p)) {
            imgPath = p;
            break;
          }
        }
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
    // Simple mobile app (Arabic RTL PWA) & uploaded photos
    // ----------------------------------------------------
    if (pathname === '/app' || pathname === '/app/') {
      const indexFile = APP_DIR_CANDIDATES.map((dir) => resolve(dir, 'index.html')).find((file) =>
        existsSync(file)
      );
      if (indexFile && (await sendStaticFile(res, indexFile, method, 'no-cache'))) return;
      sendError(res, 404, 'Not Found', 'Application mobile introuvable.');
      return;
    }

    if (pathname.startsWith('/app/')) {
      let relativePath = '';
      try {
        relativePath = decodeURIComponent(pathname.slice('/app/'.length));
      } catch {
        sendError(res, 400, 'Bad Request', 'Chemin invalide.');
        return;
      }
      for (const dir of APP_DIR_CANDIDATES) {
        const filePath = resolveInside(dir, relativePath);
        if (filePath && existsSync(filePath)) {
          if (await sendStaticFile(res, filePath, method, 'public, max-age=3600')) return;
        }
      }
      sendError(res, 404, 'Not Found', 'Ressource introuvable.');
      return;
    }

    if (pathname === '/client' || pathname === '/client/') {
      const indexFile = CLIENT_DIR_CANDIDATES.map((dir) => resolve(dir, 'index.html')).find((file) =>
        existsSync(file)
      );
      if (indexFile && (await sendStaticFile(res, indexFile, method, 'no-cache'))) return;
      sendError(res, 404, 'Not Found', 'Application client introuvable.');
      return;
    }

    if (pathname.startsWith('/client/')) {
      let relativePath = '';
      try {
        relativePath = decodeURIComponent(pathname.slice('/client/'.length));
      } catch {
        sendError(res, 400, 'Bad Request', 'Chemin invalide.');
        return;
      }
      for (const dir of CLIENT_DIR_CANDIDATES) {
        const filePath = resolveInside(dir, relativePath);
        if (filePath && existsSync(filePath)) {
          if (await sendStaticFile(res, filePath, method, 'public, max-age=3600')) return;
        }
      }
      sendError(res, 404, 'Not Found', 'Ressource introuvable.');
      return;
    }

    if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(pathname)) {
      const fileName = pathname.slice('/uploads/'.length);
      for (const dir of UPLOAD_DIR_CANDIDATES) {
        const filePath = resolveInside(dir, fileName);
        if (filePath && (await sendStaticFile(res, filePath, method, 'public, max-age=31536000, immutable'))) {
          return;
        }
      }
      sendError(res, 404, 'Not Found', 'Image introuvable.');
      return;
    }

    // ----------------------------------------------------
    // Legacy API (Phase 1 ERP) requires a staff session.
    // ----------------------------------------------------
    if (pathname.startsWith('/api/v1/') && !PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      const staff = authenticatedStaff(req);
      if (!staff) {
        sendError(res, 401, 'Unauthorized', 'Session staff requise.');
        return;
      }
      (req as IncomingMessage & { staffRole?: string }).staffRole = staff.role;
    }

    // ----------------------------------------------------
    // Modular Route Dispatchers
    // ----------------------------------------------------
    if (await handleAuthRoutes(req, res, pathname, method)) return;
    if (await handleSimpleRoutes(req, res, pathname, method, searchParams)) return;
    if (await handleClientRoutes(req, res, pathname, method, searchParams)) return;
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
