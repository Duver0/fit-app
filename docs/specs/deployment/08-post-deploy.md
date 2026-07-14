# Post-Deploy — Health Checks, Monitoreo y Mantenimiento

## Objetivo

Establecer mecanismos de monitoreo básico, health checks automatizados, y procedimientos de mantenimiento para el backend en Raspberry Pi.

## Dependencias

- `07-initial-deploy.md` — el sistema debe estar corriendo en producción

## Tareas

---

### Tarea 8.1: Agregar endpoint `/health` al backend

**Qué**: Crear un endpoint REST en NestJS que verifique conectividad a PostgreSQL, Redis, y devuelva el estado general.

**Por qué**: Nginx usa este endpoint para health checks. También permite monitoreo externo (e.g., UptimeRobot).

**Archivos afectados**: Nuevo módulo `apps/api/src/health/` o agregar a `app.controller.ts`

**Categoría**: **A** (agente backend)

**Ejemplo de implementación**:

```typescript
// apps/api/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import Redis from 'ioredis'

@Controller('health')
export class HealthController {
  private redis: Redis

  constructor(private prisma: PrismaService) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
    })
  }

  @Get()
  async check() {
    const checks: Record<string, string> = {}

    try {
      await this.prisma.$queryRaw`SELECT 1`
      checks.database = 'ok'
    } catch {
      checks.database = 'error'
    }

    try {
      await this.redis.ping()
      checks.redis = 'ok'
    } catch {
      checks.redis = 'error'
    }

    const allOk = Object.values(checks).every(s => s === 'ok')
    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    }
  }
}
```

**Registrar en `AppModule`**:

```typescript
// apps/api/src/app.module.ts
import { HealthController } from './health/health.controller'

@Module({
  controllers: [HealthController],
  // ...
})
```

---

### Tarea 8.2: Agregar monitoreo externo (UptimeRobot o similar)

**Qué**: Usar un servicio gratuito de monitoreo (e.g., UptimeRobot, Better Uptime, o Healthchecks.io) que verifique cada 5 minutos que el endpoint `/health` responde HTTP 200.

**Por qué**: Notificar al usuario si el servidor deja de responder (caída de internet, corte de luz, etc.).

**Categoría**: **B** (manual — registrar cuenta y configurar monitor)

**Pasos**:
1. Crear cuenta en https://uptimerobot.com (plan gratuito: 50 monitores)
2. Agregar monitor:
   - Tipo: HTTP(s)
    - URL: `https://dbfitapp.duckdns.org/health`
   - Interval: 5 minutos
3. Configurar alertas por email

---

### Tarea 8.3: Backup automático de PostgreSQL

**Qué**: Script para hacer backup diario de la base de datos PostgreSQL y mantener los últimos 7 días.

**Por qué**: La base de datos contiene datos de usuarios, grupos, y registros de rendimiento. Sin backup, un fallo del disco SD del Pi significa pérdida total.

**Categoría**: **A** (agente devops — script) + **B** (configurar cron en Pi)

**Script de backup** (`infra/scripts/backup-db.sh`):

```bash
#!/bin/bash
# infra/scripts/backup-db.sh
# Backup de PostgreSQL — ejecutar diariamente vía cron

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

# Verificar backup
if [ -s "${BACKUP_FILE}" ]; then
  echo "[$(date)] Backup created: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
else
  echo "[$(date)] ERROR: Backup file is empty!"
  rm -f "${BACKUP_FILE}"
  exit 1
fi

# Limpiar backups antiguos
find "${BACKUP_DIR}" -name "fitapp_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Old backups cleaned (retention: ${RETENTION_DAYS} days)"

echo "[$(date)] Backup complete."
```

**Configurar cron en el Pi**:

```bash
# Agregar al crontab del usuario (no sudo)
crontab -e

# Ejecutar backup a las 3:00 AM todos los días
0 3 * * * cd /srv/fit-app && BACKUP_DIR=/srv/fit-app/backups && \
  /srv/fit-app/scripts/backup-db.sh >> /srv/fit-app/logs/backup.log 2>&1
```

---

### Tarea 8.4: Restaurar desde backup (procedimiento documentado)

**Qué**: Crear script de restauración y documentar el procedimiento.

**Por qué**: Tener un plan de recuperación ante desastres.

**Categoría**: **A** (agente devops — script)

**Script** (`infra/scripts/restore-db.sh`):

```bash
#!/bin/bash
# infra/scripts/restore-db.sh
# Restaurar PostgreSQL desde un backup
# Uso: ./restore-db.sh /path/to/backup.sql.gz

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
```

---

### Tarea 8.5: Logs rotativos de Docker

**Qué**: Configurar Docker para que los logs de los contenedores no llenen el disco SD del Pi (que típicamente es pequeño, 16-32GB).

**Categoría**: **A** (agente devops — config) + **B** (aplicar en Pi)

**Crear/editar `/etc/docker/daemon.json` en el Pi**:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

**Aplicar**:

```bash
sudo systemctl restart docker
```

---

### Tarea 8.6: Health check automático de disco y memoria

**Qué**: Script simple que verifique espacio en disco, uso de RAM, y uptime del sistema.

**Por qué**: La Raspberry Pi 3 tiene recursos limitados. Monitorear disco y RAM ayuda a detectar problemas antes de que causen caídas.

**Categoría**: **A** (agente devops — script)

**Script** (`infra/scripts/system-health.sh`):

```bash
#!/bin/bash
# infra/scripts/system-health.sh
# Verificar salud del sistema (disco, memoria, uptime)

THRESHOLD_DISK=80   # % de uso de disco para alertar
THRESHOLD_MEM=90    # % de uso de RAM para alertar

echo "=== System Health Report $(date) ==="
echo ""

# Uptime
echo "Uptime:"
uptime -p
echo ""

# Disco
echo "Disk Usage:"
USED_PCT=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
df -h / | awk 'NR==2 {print "  " $3 " used / " $2 " (" $5 ")"}'
if [ "${USED_PCT}" -gt "${THRESHOLD_DISK}" ]; then
  echo "  ⚠️  WARNING: Disk usage is ${USED_PCT}% (threshold: ${THRESHOLD_DISK}%)"
fi
echo ""

# Memoria
echo "Memory Usage:"
MEM_TOTAL=$(free -m | awk 'NR==2 {print $2}')
MEM_USED=$(free -m | awk 'NR==2 {print $3}')
MEM_PCT=$(( MEM_USED * 100 / MEM_TOTAL ))
echo "  ${MEM_USED}MB / ${MEM_TOTAL}MB (${MEM_PCT}%)"
if [ "${MEM_PCT}" -gt "${THRESHOLD_MEM}" ]; then
  echo "  ⚠️  WARNING: Memory usage is ${MEM_PCT}% (threshold: ${THRESHOLD_MEM}%)"
fi
echo ""

# Docker containers
echo "Docker containers:"
docker compose ps --status running | tail -n +2
echo ""

echo "=== End ==="
```

---

### Tarea 8.7: Actualizar despliegue (deploy subsecuente)

**Qué**: Procedimiento documentado para actualizar el backend después de hacer cambios en `main`.

**Por qué**: El workflow de GitHub Actions ya publica la imagen automáticamente en GHCR. Solo falta actualizar en el Pi.

**Categoría**: **B** (manual — procedimiento)

**Pasos**:

```bash
ssh pi@192.168.1.100
cd /srv/fit-app

# 1. Descargar última imagen
docker compose pull api

# 2. Recrear contenedor api
docker compose up -d --force-recreate --no-deps api

# 3. Ejecutar migraciones pendientes
make migrate

# 4. Verificar health
make health
```

> **Nota**: Si también cambian las configs de Nginx o Docker Compose, sincronizar primero:
> ```bash
> rsync -avz --progress infra/ pi@192.168.1.100:/srv/fit-app/
> # luego reiniciar servicios afectados
> docker compose up -d --force-recreate nginx
> ```

---

### Tarea 8.8: Dashboard de monitoreo opcional

**Qué**: Configurar un contenedor de monitoreo ligero (e.g., Netdata, cAdvisor, o un script con `docker stats`) para tener visibilidad del rendimiento del Pi.

**Por qué**: Útil para detectar cuellos de botella de recursos.

**Categoría**: **A** (agente devops — configuración opcional)

**Agregar al `docker-compose.yml`**:

```yaml
services:
  # ... existing services ...
  netdata:
    image: netdata/netdata:latest
    container_name: fit-netdata
    restart: unless-stopped
    ports:
      - "19999:19999"
    cap_add:
      - SYS_PTRACE
    security_opt:
      - apparmor:unconfined
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /etc/passwd:/host/etc/passwd:ro
    networks:
      - fit-network
```

> **Nota**: Netdata consume ~100MB RAM, que es significativo para un Pi de 1GB. Evaluar si es necesario.

---

## Criterios de Aceptación

- [ ] `/health` endpoint responde con estado detallado (db, redis, timestamp)
- [ ] Backups diarios se generan en `/srv/fit-app/backups/`
- [ ] Backups antiguos (>7 días) se eliminan automáticamente
- [ ] El script de restauración funciona correctamente
- [ ] Logs de Docker están limitados a 10MB por archivo, máximo 3 archivos
- [ ] El script `system-health.sh` reporta uso de disco, RAM, y contenedores
- [ ] El procedimiento de actualización está documentado y funciona
- [ ] (Opcional) Netdata o similar muestra métricas en tiempo real
