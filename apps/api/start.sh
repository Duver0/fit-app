#!/bin/sh
set -e

echo "=== Creating uploads directory ==="
mkdir -p /app/uploads/avatars /app/uploads/groups /app/uploads/exercises

echo "=== Running Prisma migrations ==="
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

echo "=== Starting API ==="
exec node apps/api/dist/main
