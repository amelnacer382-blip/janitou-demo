import type { IncomingMessage, ServerResponse } from 'node:http';

declare global {
  interface PromiseConstructor {
    withResolvers<T>(): {
      promise: Promise<T>;
      resolve: (value: T | PromiseLike<T>) => void;
      reject: (reason?: unknown) => void;
    };
  }
}

if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// In-memory sliding window rate limiter
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitBucket>();

export function checkRateLimit(
  req: IncomingMessage,
  maxRequests = 200,
  windowMs = 60000
): { allowed: boolean; remaining: number } {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1';

  const now = Date.now();
  let bucket = rateLimitMap.get(ip);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 1, resetAt: now + windowMs };
    rateLimitMap.set(ip, bucket);
    return { allowed: true, remaining: maxRequests - 1 };
  }

  bucket.count++;
  if (bucket.count > maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: maxRequests - bucket.count };
}

export function sanitizeString(val: string): string {
  if (typeof val !== 'string') return '';
  return val.replace(/<[^>]*>/g, '').trim();
}

export function setSecurityHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Role');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

export function readJsonBody<T>(req: IncomingMessage, maxBytes = 2 * 1024 * 1024): Promise<T> {
  const { promise, resolve, reject } = Promise.withResolvers<T>();
  let body = '';

  req.on('data', (chunk: Buffer | string) => {
    body += chunk;
    if (body.length > maxBytes) {
      reject(new Error('Payload too large'));
    }
  });

  req.on('end', () => {
    try {
      resolve(body.length > 0 ? (JSON.parse(body) as T) : ({} as T));
    } catch {
      reject(new Error('Invalid JSON payload'));
    }
  });

  req.on('error', (err) => reject(err));
  return promise;
}

export function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

export function sendError(
  res: ServerResponse,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void {
  sendJson(res, statusCode, {
    error: code,
    message,
    ...(details !== undefined ? { details } : {}),
    timestamp: new Date().toISOString(),
  });
}

export function checkRoleAccess(req: IncomingMessage, allowedRoles: string[]): boolean {
  const roleHeader = req.headers['x-user-role'] as string | undefined;
  if (!roleHeader) return true;
  return allowedRoles.includes(roleHeader.toUpperCase());
}
