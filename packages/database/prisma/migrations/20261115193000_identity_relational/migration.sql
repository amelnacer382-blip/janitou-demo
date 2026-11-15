-- Staff accounts, sessions and audit logs move out of the JSONB snapshot.
CREATE TABLE IF NOT EXISTS "staff_accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "passwordSalt" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mfaSecret" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recoveryCodeHashes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "staff_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "staff_accounts_email_key" ON "staff_accounts"("email");

CREATE TABLE IF NOT EXISTS "staff_sessions" (
    "tokenHash" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "staff_sessions_pkey" PRIMARY KEY ("tokenHash")
);

CREATE INDEX IF NOT EXISTS "staff_sessions_staffId_idx" ON "staff_sessions"("staffId");
CREATE INDEX IF NOT EXISTS "staff_sessions_expiresAt_idx" ON "staff_sessions"("expiresAt");
ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "staff_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "client_sessions" (
    "tokenHash" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_sessions_pkey" PRIMARY KEY ("tokenHash")
);

CREATE INDEX IF NOT EXISTS "client_sessions_customerId_idx" ON "client_sessions"("customerId");
CREATE INDEX IF NOT EXISTS "client_sessions_expiresAt_idx" ON "client_sessions"("expiresAt");

-- The table may predate this migration with the same columns (entityId NOT NULL).
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "audit_logs" ALTER COLUMN "entityId" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");
CREATE INDEX IF NOT EXISTS "audit_logs_entityType_action_idx" ON "audit_logs"("entityType", "action");
