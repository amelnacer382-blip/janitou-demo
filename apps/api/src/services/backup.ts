import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { JanitouStore } from './store.js';

const DEFAULT_BACKUP_DIR = resolve(process.cwd(), 'data/backups');
const DEFAULT_RETENTION = 7;

export async function createBackupFile(
  store: JanitouStore,
  directory = DEFAULT_BACKUP_DIR,
  retentionCount = DEFAULT_RETENTION
): Promise<string> {
  const backup = store.createDatabaseBackup();
  await mkdir(directory, { recursive: true });
  const stamp = backup.timestamp.replace(/[:.]/g, '-');
  const filePath = join(directory, `backup-${stamp}.json`);
  await writeFile(filePath, JSON.stringify(backup, null, 2), 'utf-8');
  await pruneBackups(directory, retentionCount);
  return filePath;
}

async function pruneBackups(directory: string, retentionCount: number): Promise<void> {
  if (retentionCount <= 0) return;
  const files = (await readdir(directory))
    .filter((file) => file.startsWith('backup-') && file.endsWith('.json'))
    .sort();
  const stale = files.slice(0, Math.max(0, files.length - retentionCount));
  await Promise.all(stale.map((file) => rm(join(directory, file), { force: true })));
}

export function startBackupScheduler(store: JanitouStore): void {
  const intervalHours = Number(process.env.BACKUP_INTERVAL_HOURS ?? '24');
  if (!Number.isFinite(intervalHours) || intervalHours <= 0) return;
  const retention = Number(process.env.BACKUP_RETENTION ?? String(DEFAULT_RETENTION));

  const run = (): void => {
    void createBackupFile(store, DEFAULT_BACKUP_DIR, retention)
      .then((file) => console.log(`[BACKUP] ${file}`))
      .catch((error) => console.error('[BACKUP] Failed:', error));
  };

  run();
  const timer = setInterval(run, intervalHours * 60 * 60 * 1000);
  timer.unref();
}
