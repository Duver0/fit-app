#!/bin/bash
set -euo pipefail

BACKUP_FILE="${1:-}"
if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  echo "Available backups:"
  ls -lh /srv/fit-app/backups/
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "[$(date)] Restoring from ${BACKUP_FILE}..."
echo "WARNING: This will replace ALL data in the database!"
read -p "Continue? (y/N): " confirm
if [ "${confirm}" != "y" ]; then
  echo "Aborted."
  exit 0
fi

gunzip -c "${BACKUP_FILE}" | docker compose exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
echo "[$(date)] Restore complete."
