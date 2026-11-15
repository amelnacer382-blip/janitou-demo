import http from 'node:http';
import { handleRequest } from './router.js';
import { janitouStore } from './services/store.js';
import { startBackupScheduler } from './services/backup.js';
import { startMessagingDispatcher } from './services/messaging.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

export const server = http.createServer((req, res) => {
  void handleRequest(req, res);
});

async function main(): Promise<void> {
  await janitouStore.ready();
  if (process.env.BACKUP_ENABLED !== '0') startBackupScheduler(janitouStore);
  if (process.env.MESSAGING_ENABLED !== '0') startMessagingDispatcher(janitouStore);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`[JANITOU FOOD API] Serveur actif sur le port ${PORT}`);
    console.log(`→ Dashboard Web : http://localhost:${PORT}/dashboard`);
    console.log(`→ Alternative   : http://127.0.0.1:${PORT}/dashboard`);
    console.log(`→ API Health    : http://localhost:${PORT}/health`);
    console.log(`======================================================\n`);
  });

  const shutdown = (signal: string): void => {
    console.log(`[JANITOU FOOD API] ${signal} reçu, arrêt propre...`);
    server.close();
    void janitouStore.flush().finally(() => process.exit(0));
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

if (process.env.NODE_ENV !== 'test') {
  void main();
}
