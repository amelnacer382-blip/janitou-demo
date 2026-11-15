# ==========================================
# JANITOU FOOD — Production Dockerfile
# Multi-stage Bun container with Prisma
# ==========================================

# 1. Build Stage
FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json tsconfig.json bun.lock ./
COPY packages/common/package.json ./packages/common/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Prisma schema is required by the database workspace postinstall hook.
COPY packages/database/prisma ./packages/database/prisma

RUN bun install --frozen-lockfile

COPY packages/ ./packages/
COPY apps/ ./apps/

RUN bun run build:bun

# 2. Production Runtime Stage
FROM oven/bun:1 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app ./
COPY deploy/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
  && mkdir -p /app/data /app/data/backups \
  && chown -R bun:bun /app

USER bun

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:4000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
