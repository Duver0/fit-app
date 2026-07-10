# Variables de Entorno — Configuración de Producción

## Objetivo

Definir el archivo `.env` de producción que debe existir en la Raspberry Pi para que Docker Compose inyecte las variables a los contenedores.

## Dependencias

- `04-docker-compose.md` — el `docker-compose.yml` referencia estas variables con `${VAR_NAME}`
- Postgres y Redis deben tener credenciales definidas aquí

## Tareas

---

### Tarea 6.1: Crear `infra/.env.example` como plantilla

**Qué**: Crear un archivo de ejemplo con TODAS las variables de entorno necesarias para producción, con valores de ejemplo y comentarios.

**Por qué**: Sirve como documentación y plantilla. El usuario copia este archivo a `.env` y completa los valores reales.

**Archivos afectados**: `infra/.env.example` (nuevo)

**Categoría**: **A** (agente devops)

**Contenido del archivo**:

```bash
# =============================================================================
# fit-app — Variables de Entorno para Producción (Raspberry Pi)
# =============================================================================
# Copiar este archivo a .env y completar los valores.
#   cp infra/.env.example /srv/fit-app/.env
#   nano /srv/fit-app/.env
# =============================================================================

# --- PostgreSQL ---
POSTGRES_USER=fitapp
POSTGRES_PASSWORD=CHANGE_ME_GENERATE_STRONG_PASSWORD
POSTGRES_DB=fitapp_production

# --- Redis ---
REDIS_PASSWORD=CHANGE_ME_GENERATE_ANOTHER_STRONG_PASSWORD

# --- JWT ---
JWT_SECRET=CHANGE_ME_GENERATE_JWT_SECRET_AT_LEAST_32_CHARS

# --- DuckDNS ---
DUCKDNS_TOKEN=your-duckdns-token-here

# --- Opcionales (generalmente no necesitan cambio) ---
# API_PORT=4000
# CORS_ORIGIN=https://duver0.github.io
# NODE_ENV=production
# UPLOAD_DIR=/app/uploads
```

> **Seguridad**: Todos los valores marcados con `CHANGE_ME` deben ser reemplazados por contraseñas fuertes. Generar con:
> ```bash
> openssl rand -base64 32  # para JWT_SECRET
> openssl rand -base64 16  # para contraseñas de BD/Redis
> ```

---

### Tarea 6.2: Agregar `infra/.env` al `.gitignore` global

**Qué**: Asegurar que `infra/.env` (y cualquier `.env` en el repo) esté en el `.gitignore` raíz.

**Por qué**: Nunca comitear credenciales reales al repositorio.

**Archivos afectados**: `.gitignore` (raíz)

**Categoría**: **A** (agente devops)

**Contenido a agregar**:

```gitignore
# Environment files
.env
.env.local
.env.production
*.env

# infra
infra/.env
```

---

### Tarea 6.3: Crear el `.env` real en el Raspberry Pi

**Qué**: Copiar `infra/.env.example` a `/srv/fit-app/.env` en el Pi y completar valores.

**Por qué**: Docker Compose lee este archivo para inyectar variables a los contenedores.

**Categoría**: **B** (manual — en el Pi)

**Pasos**:

```bash
# En el Raspberry Pi
mkdir -p /srv/fit-app
nano /srv/fit-app/.env

# Copiar contenido de infra/.env.example y reemplazar valores
```

**Contenido esperado del `.env`**:

```bash
# PostgreSQL
POSTGRES_USER=fitapp
POSTGRES_PASSWORD=<generar-contraseña-fuerte>
POSTGRES_DB=fitapp_production

# Redis
REDIS_PASSWORD=<generar-otra-contraseña-fuerte>

# JWT
JWT_SECRET=<generar-secreto-jwt-de-32-caracteres>

# DuckDNS
DUCKDNS_TOKEN=<token-de-duckdns>

# Opcionales (usar defaults)
# CORS_ORIGIN=https://duver0.github.io
# NODE_ENV=production
```

---

### Tarea 6.4: Verificar que ninguna variable hardcodeada quede en `docker-compose.yml`

**Qué**: Revisar `infra/docker-compose.yml` para asegurar que no haya passwords o secretos escritos directamente en el archivo YAML — todo debe venir de variables `${VAR_NAME}`.

**Por qué**: Prevenir exposición accidental de credenciales en el repositorio.

**Categoría**: **A** (agente devops — verificación)

**Regla**: En `docker-compose.yml`, NUNCA escribir:
```yaml
environment:
  POSTGRES_PASSWORD: mypassword123  # MAL
```

Siempre:
```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # BIEN
```

---

## Criterios de Aceptación

- [ ] `infra/.env.example` contiene todas las variables necesarias con ejemplos y comentarios
- [ ] El `.gitignore` global ignora `**/.env` y `infra/.env`
- [ ] El archivo `.env` real existe en `/srv/fit-app/.env` en el Pi
- [ ] `docker compose config` (sin flags) verifica que las variables se resuelven correctamente
- [ ] No hay secretos hardcodeados en ningún archivo YAML
