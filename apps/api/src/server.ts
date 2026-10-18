import http from 'node:http';
import { UserRole, OrderStatus, MealServiceTime } from '@janitou/common';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

export const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const { pathname } = url;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check endpoint
  if (pathname === '/health' || pathname === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'JANITOU FOOD API',
      version: '0.1.0'
    }));
    return;
  }

  // API Discovery & Status endpoint
  if (pathname === '/api' || pathname === '/api/v1') {
    res.writeHead(200);
    res.end(JSON.stringify({
      name: 'JANITOU FOOD Management API',
      version: 'v1',
      modules: {
        customers: '/api/v1/customers',
        orders: '/api/v1/orders',
        menus: '/api/v1/menus',
        recipes: '/api/v1/recipes',
        production: '/api/v1/production',
        purchasing: '/api/v1/purchasing',
        delivery: '/api/v1/delivery',
      },
      roles: Object.values(UserRole),
      serviceTimes: Object.values(MealServiceTime),
      orderStatuses: Object.values(OrderStatus),
    }));
    return;
  }

  // Default 404
  res.writeHead(404);
  res.end(JSON.stringify({
    error: 'Not Found',
    message: `Cannot ${req.method} ${pathname}`,
  }));
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`[JANITOU FOOD API] Server running on port ${PORT}`);
  });
}
