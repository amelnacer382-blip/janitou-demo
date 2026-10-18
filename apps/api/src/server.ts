import http from 'node:http';
import { handleRequest } from './router.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

export const server = http.createServer((req, res) => {
  void handleRequest(req, res);
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`[JANITOU FOOD API] Server running on port ${PORT}`);
  });
}
