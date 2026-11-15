import type { IncomingMessage } from 'node:http';
import { janitouStore } from '../../services/store.js';
import type { DbStaffUser } from '../../data/mock-db.js';

export async function createStaffSession(userId: string): Promise<string> {
  return janitouStore.createStaffSession(userId);
}

export async function destroyStaffSession(req: IncomingMessage): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return;
  await janitouStore.deleteStaffSession(header.slice('Bearer '.length));
}

export function authenticatedStaff(req: IncomingMessage): DbStaffUser | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  const userId = janitouStore.getStaffSessionUserId(header.slice('Bearer '.length));
  if (!userId) return undefined;
  const user = janitouStore.getStaffUserById(userId);
  return user?.isActive ? user : undefined;
}
