# ==========================================
# JANITOU FOOD — Production Dockerfile
# Multi-stage lightweight Bun container
# ==========================================

# 1. Build Stage
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy dependency manifests
COPY package.json tsconfig.json bun.lock ./
COPY packages/common/package.json ./packages/common/
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY packages/ ./packages/
COPY apps/ ./apps/

# Build internal packages
RUN bun run build:bun

# 2. Production Runtime Stage
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy application artifacts from builder
COPY --from=builder /app ./

# Create data directory for JSON persistence and set permissions
RUN mkdir -p /app/data && chown -R bun:bun /app

# Run as non-root user for security
USER bun

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4000/health || exit 1

CMD ["bun", "apps/api/src/server.ts"]
