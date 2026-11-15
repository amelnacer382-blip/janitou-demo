import { PrismaClient, Role } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type {
  DatabaseConfig,
  DatabaseHealth,
  DatabaseState,
  StateBackend,
} from './index.js';

const clients = new Map<string, PrismaClient>();

async function getClient(databaseUrl: string): Promise<PrismaClient> {
  const existing = clients.get(databaseUrl);
  if (existing) return existing;
  const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  clients.set(databaseUrl, client);
  return client;
}

function countRecords(state?: Omit<DatabaseState, 'metadata'>): { tables: Record<string, number>; total: number } {
  const tables: Record<string, number> = {
    suppliers: state?.suppliers?.length || 0,
    ingredients: state?.ingredients?.length || 0,
    recipes: state?.recipes?.length || 0,
    customers: state?.customers?.length || 0,
    mealPlans: state?.mealPlans?.length || 0,
    orders: state?.orders?.length || 0,
    productionBatches: state?.productionBatches?.length || 0,
    purchaseOrders: state?.purchaseOrders?.length || 0,
    deliveryRuns: state?.deliveryRuns?.length || 0,
    subscriptions: state?.subscriptions?.length || 0,
    kdsBatches: state?.kdsBatches?.length || 0,
    invoices: state?.invoices?.length || 0,
    payments: state?.payments?.length || 0,
    auditLogs: state?.auditLogs?.length || 0,
    staffUsers: state?.staffUsers?.length || 0,
    staffSessions: state?.staffSessions?.length || 0,
    clientSessions: state?.clientSessions?.length || 0,
    notifications: state?.notifications?.length || 0,
    outboundMessages: state?.outboundMessages?.length || 0,
  };
  return { tables, total: Object.values(tables).reduce((sum, count) => sum + count, 0) };
}

/**
 * Durable PostgreSQL backend. The Phase 1 domain store is persisted as one
 * atomic JSONB document; relational tables are adopted incrementally.
 */
export class PrismaStateBackend implements StateBackend {
  private readonly databaseUrl: string;
  private mirroredAuditIds = new Set<string>();

  constructor(databaseUrl: string) {
    this.databaseUrl = databaseUrl;
  }

  public getConfig(): DatabaseConfig {
    return {
      databaseUrl: this.databaseUrl,
      storageFilePath: '(postgresql:app_state)',
      autoPersist: true,
      provider: 'postgresql',
    };
  }

  public async loadState(): Promise<DatabaseState | null> {
    const client = await getClient(this.databaseUrl);
    const row = await client.appState.findUnique({ where: { id: 'main' } });
    if (!row) return null;
    const payload: unknown = row.payload;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Invalid app_state payload');
    }
    // Identity, sessions and audit are relational sources; the JSONB payload
    // remains the bootstrap/legacy fallback for these collections.
    const auditCutoff = new Date();
    auditCutoff.setFullYear(auditCutoff.getFullYear() - 2);
    const [accounts, staffSessions, clientSessions, auditLogs] = await Promise.all([
      client.staffAccount.findMany(),
      client.staffSession.findMany(),
      client.clientSession.findMany(),
      client.auditLog.findMany({ where: { timestamp: { gte: auditCutoff } }, orderBy: { timestamp: 'desc' } }),
    ]);
    this.mirroredAuditIds = new Set(auditLogs.map((log) => log.id));
    const state = payload as DatabaseState;
    if (accounts.length > 0) {
      state.staffUsers = accounts.map((account) => ({
        id: account.id,
        email: account.email,
        fullName: account.fullName,
        role: account.role,
        passwordSalt: account.passwordSalt,
        passwordHash: account.passwordHash,
        isActive: account.isActive,
        createdAt: account.createdAt.toISOString(),
        mfaSecret: account.mfaSecret ?? undefined,
        mfaEnabled: account.mfaEnabled,
        recoveryCodeHashes: account.recoveryCodeHashes,
      }));
    }
    if (staffSessions.length > 0 || accounts.length > 0) {
      state.staffSessions = staffSessions.map((session) => ({
        tokenHash: session.tokenHash,
        userId: session.staffId,
        expiresAt: session.expiresAt.toISOString(),
      }));
    }
    if (clientSessions.length > 0) {
      state.clientSessions = clientSessions.map((session) => ({
        tokenHash: session.tokenHash,
        customerId: session.customerId,
        expiresAt: session.expiresAt.toISOString(),
      }));
    }
    if (auditLogs.length > 0) {
      state.auditLogs = auditLogs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        userId: log.userId,
        userName: log.userName,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId ?? undefined,
        beforeSnapshot: log.beforeSnapshot ?? undefined,
        afterSnapshot: log.afterSnapshot ?? undefined,
      }));
    }
    return state;
  }

  public async persistState(state: Omit<DatabaseState, 'metadata'>): Promise<void> {
    const client = await getClient(this.databaseUrl);
    const { tables, total } = countRecords(state);
    const payload = JSON.parse(
      JSON.stringify({
        ...state,
        metadata: {
          lastPersistedAt: new Date().toISOString(),
          version: '1.0.0-phase1',
          totalRecords: total,
          tables,
        },
      })
    ) as Prisma.InputJsonValue;
    const staffUsers = state.staffUsers || [];
    const staffSessions = state.staffSessions || [];
    const clientSessions = state.clientSessions || [];
    const auditLogs = state.auditLogs || [];
    const safeDate = (value: unknown, fallback = new Date()): Date => {
      const parsed = typeof value === 'string' ? new Date(value) : fallback;
      return Number.isNaN(parsed.getTime()) ? fallback : parsed;
    };
    const auditRows = auditLogs
      .filter((log): log is Record<string, unknown> => Boolean(log && typeof log === 'object'))
      .filter((log) => typeof log.id === 'string' && !this.mirroredAuditIds.has(log.id))
      .map((log) => ({
        id: String(log.id),
        timestamp: safeDate(log.timestamp),
        userId: String(log.userId || 'system'),
        userName: String(log.userName || 'System'),
        action: String(log.action || 'UNKNOWN'),
        entityType: String(log.entityType || 'UNKNOWN'),
        entityId: typeof log.entityId === 'string' ? log.entityId : null,
        beforeSnapshot: log.beforeSnapshot === undefined ? undefined : (log.beforeSnapshot as Prisma.InputJsonValue),
        afterSnapshot: log.afterSnapshot === undefined ? undefined : (log.afterSnapshot as Prisma.InputJsonValue),
      }));
    await client.$transaction(async (tx) => {
      const userIds: string[] = [];
      for (const raw of staffUsers) {
        const user = raw as Record<string, unknown>;
        const id = String(user.id);
        userIds.push(id);
        const data = {
          email: String(user.email).toLowerCase(),
          fullName: String(user.fullName),
          role: user.role as Role,
          passwordSalt: String(user.passwordSalt),
          passwordHash: String(user.passwordHash),
          isActive: user.isActive !== false,
          mfaSecret: typeof user.mfaSecret === 'string' ? user.mfaSecret : null,
          mfaEnabled: Boolean(user.mfaEnabled),
          recoveryCodeHashes: Array.isArray(user.recoveryCodeHashes)
            ? user.recoveryCodeHashes.map(String)
            : [],
          createdAt: safeDate(user.createdAt),
        };
        await tx.staffAccount.upsert({
          where: { id },
          create: { id, ...data },
          update: data,
        });
      }
      if (userIds.length > 0) {
        await tx.staffAccount.deleteMany({ where: { id: { notIn: userIds } } });
      }
      await tx.staffSession.deleteMany();
      if (staffSessions.length > 0) {
        await tx.staffSession.createMany({
          data: staffSessions.map((raw) => {
            const session = raw as Record<string, unknown>;
            return {
              tokenHash: String(session.tokenHash),
              staffId: String(session.userId),
              expiresAt: safeDate(session.expiresAt),
            };
          }),
          skipDuplicates: true,
        });
      }
      await tx.clientSession.deleteMany();
      if (clientSessions.length > 0) {
        await tx.clientSession.createMany({
          data: clientSessions.map((raw) => {
            const session = raw as Record<string, unknown>;
            return {
              tokenHash: String(session.tokenHash),
              customerId: String(session.customerId),
              expiresAt: safeDate(session.expiresAt),
            };
          }),
          skipDuplicates: true,
        });
      }
      const retentionCutoff = new Date();
      retentionCutoff.setFullYear(retentionCutoff.getFullYear() - 2);
      await tx.auditLog.deleteMany({ where: { timestamp: { lt: retentionCutoff } } });
      if (auditRows.length > 0) {
        await tx.auditLog.createMany({ data: auditRows, skipDuplicates: true });
        for (const row of auditRows) this.mirroredAuditIds.add(row.id);
      }
      await tx.appState.upsert({
        where: { id: 'main' },
        create: { id: 'main', payload },
        update: { payload },
      });
    });
  }

  public getHealth(state?: Omit<DatabaseState, 'metadata'>): DatabaseHealth {
    const { tables, total } = countRecords(state);
    return {
      status: 'connected',
      provider: 'PostgreSQL',
      connectionUrl: this.databaseUrl.replace(/:[^:@]*@/, ':****@'),
      storageFile: '(postgresql:app_state)',
      totalRecords: total,
      tables,
      lastPersistedAt: new Date().toISOString(),
    };
  }

  public async close(): Promise<void> {
    const client = clients.get(this.databaseUrl);
    if (client) {
      await client.$disconnect();
      clients.delete(this.databaseUrl);
    }
  }
}
