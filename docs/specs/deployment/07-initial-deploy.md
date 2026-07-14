# Despliegue Inicial — Cómo llevar todo al Pi por primera vez

## Objetivo

Guía paso a paso para realizar el primer despliegue completo del backend en la Raspberry Pi y verificar que todo funcione.

## Dependencias

- `01-frontend-build.md` ✅ — Frontend compila y se despliega a Pages
- `02-frontend-deploy.md` ✅ — GitHub Action de frontend funcional
- `03-docker-multiarch.md` ✅ — Imagen multi-arch publicada en GHCR
- `04-docker-compose.md` ✅ — docker-compose.yml listo
- `05-raspberry-setup.md` ✅ — Pi configurado (Docker, DuckDNS, puertos)
- `06-env-config.md` ✅ — `.env` creado en el Pi

## Tareas

---

### Tarea 7.1: Sincronizar archivos de infraestructura al Pi

**Qué**: Copiar los archivos de infraestructura del repo al Raspberry Pi.

**Por qué**: El Pi necesita `docker-compose.yml`, configs de Nginx, y scripts.

**Categoría**: **B** (manual — ejecutar comandos)

**Método A — rsync (recomendado)**:

```bash
# Desde tu máquina local, en la raíz del repo
rsync -avz --progress \
  infra/ \
  pi@192.168.1.100:/srv/fit-app/
```

**Método B — git clone directo en el Pi**:

```bash
# En el Raspberry Pi
cd /srv
git clone https://github.com/Duver0/fit-app.git
ln -s fit-app/infra /srv/fit-app
```

**Método C — SCP**:

```bash
scp infra/docker-compose.yml pi@192.168.1.100:/srv/fit-app/
scp -r infra/nginx pi@192.168.1.100:/srv/fit-app/
scp infra/scripts/* pi@192.168.1.100:/srv/fit-app/scripts/
```

> **Recomendación**: Usar rsync para deploys subsecuentes. Es incremental y rápido.

---

### Tarea 7.2: Crear estructura de directorios en el Pi

**Qué**: Asegurar que existan los directorios necesarios para volúmenes Docker.

**Categoría**: **B** (manual — en el Pi)

```bash
ssh pi@192.168.1.100

# Crear estructura
sudo mkdir -p /srv/fit-app/nginx/ssl
sudo mkdir -p /srv/fit-app/nginx/conf.d
sudo mkdir -p /srv/fit-app/scripts
sudo mkdir -p /srv/fit-app/uploads

# Ajustar permisos para uploads
sudo chown -R 1000:1000 /srv/fit-app/uploads
```

---

### Tarea 7.3: Iniciar servicios con Docker Compose

**Qué**: Levantar todos los servicios.

**Categoría**: **B** (manual — en el Pi)

```bash
ssh pi@192.168.1.100

cd /srv/fit-app

# Verificar que el .env existe
ls -la .env

# Descargar imágenes más recientes
docker compose pull

# Iniciar servicios
docker compose up -d

# Ver estado
docker compose ps

# Ver logs
docker compose logs -f
```

---

### Tarea 7.4: Ejecutar migraciones de Prisma

**Qué**: Una vez que PostgreSQL esté saludable, correr `prisma migrate deploy` para crear las tablas.

**Categoría**: **A** (script) + **B** (ejecución manual)

**Opción 1 — Ejecutar comando directo**:

```bash
docker compose exec api npx prisma migrate deploy \
  --schema=apps/api/prisma/schema.prisma
```

**Opción 2 — Usar Makefile**:

```bash
cd /srv/fit-app && make migrate
```

**Verificar migraciones**:

```bash
docker compose exec api npx prisma migrate status \
  --schema=apps/api/prisma/schema.prisma
```

---

### Tarea 7.5: Crear seed inicial (opcional)

**Qué**: Si existe un seed de Prisma, ejecutarlo para poblar datos de prueba.

**Categoría**: **A** (si existe script) + **B** (ejecución)

```bash
docker compose exec api npx prisma db seed \
  --schema=apps/api/prisma/schema.prisma
```

> Si no existe seed, se puede crear en tarea futura.

---

### Tarea 7.6: Health check completo

**Qué**: Verificar que todos los servicios responden correctamente.

**Categoría**: **B** (manual — verificación)

```bash
# 1. Health endpoint del API
curl -s http://localhost/health
# Esperado: {"status":"ok","timestamp":"..."}

# 2. GraphQL endpoint (desde internet)
curl -s https://dbfitapp.duckdns.org/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
# Esperado: {"data":{"__typename":"Query"}}

# 3. Frontend
curl -s https://duver0.github.io/fit-app/ | head -5
# Debe contener HTML de la SPA

# 4. PostgreSQL
docker compose exec postgres pg_isready -U fitapp -d fitapp_production

# 5. Redis
docker compose exec redis redis-cli -a $REDIS_PASSWORD ping
# Esperado: PONG
```

---

### Tarea 7.7: Configurar CORS para el frontend de producción

**Qué**: Verificar que `CORS_ORIGIN` en el `.env` del Pi incluya `https://duver0.github.io`.

**Por qué**: GitHub Pages hace requests desde `https://duver0.github.io`. Si CORS no permite ese origen, el navegador bloquea las requests.

**Categoría**: **B** (verificación manual)

```bash
# Verificar en el .env
grep CORS_ORIGIN /srv/fit-app/.env
# Debe mostrar: CORS_ORIGIN=https://duver0.github.io
```

La API ya parsea `CORS_ORIGIN` como lista separada por comas (ver `main.ts`):

```typescript
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : '*'
```

Si se necesita añadir más orígenes (e.g., desarrollo local):
```env
CORS_ORIGIN=https://duver0.github.io,http://localhost:8081
```

---

## Criterios de Aceptación

- [ ] `docker compose ps` muestra todos los servicios como `Up`
- [ ] `curl http://localhost/health` responde 200 OK
- [ ] GraphQL endpoint responde queries desde internet
- [ ] Frontend en GitHub Pages carga y se conecta al backend
- [ ] Migraciones de Prisma ejecutadas sin errores
- [ ] Uploads funcionan (subir avatar y servirse por Nginx)
- [ ] CORS configurado permite requests desde GitHub Pages
- [ ] No hay errores en logs de Nginx, API, Postgres o Redis
