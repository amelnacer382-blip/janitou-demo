import http from 'node:http';
import { handleRequest } from './router.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

export const server = http.createServer((req, res) => {
  void handleRequest(req, res);
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`[JANITOU FOOD API] Serveur actif sur le port ${PORT}`);
    console.log(`→ Dashboard Web : http://localhost:${PORT}/dashboard`);
    console.log(`→ Alternative   : http://127.0.0.1:${PORT}/dashboard`);
    console.log(`→ API Health    : http://localhost:${PORT}/health`);
    console.log(`======================================================\n`);
  });
}
