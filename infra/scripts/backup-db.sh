#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/srv/fit-app/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/fitapp_${DATE}.sql.gz"
DB_NAME="${POSTGRES_DB:-fitapp_production}"
DB_USER="${POSTGRES_USER:-fitapp}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting backup of ${DB_NAME}..."

docker compose exec -T postgres pg_dump \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --clean \
  --if-exists \
  | gzip > "${BACKUP_FILE}"

if [ -s "${BACKUP_FILE}" ]; then
  echo "[$(date)] Backup created: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
else
  echo "[$(date)] ERROR: Backup file is empty!"
  rm -f "${BACKUP_FILE}"
  exit 1
fi

find "${BACKUP_DIR}" -name "fitapp_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Old backups cleaned (retention: ${RETENTION_DAYS} days)"
echo "[$(date)] Backup complete."
