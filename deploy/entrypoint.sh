#!/bin/sh
set -eu

if [ -n "${DATABASE_URL:-}" ]; then
  echo "[ENTRYPOINT] Applying Prisma migrations..."
  until bun run --cwd packages/database db:migrate; do
    echo "[ENTRYPOINT] Database not ready, retrying in 2s..."
    sleep 2
  done
fi

exec bun apps/api/src/server.ts
