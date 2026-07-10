# Backend — GitHub Action Multi-Arch para imagen Docker

## Objetivo

Automatizar el build y push de la imagen Docker del backend a GitHub Container Registry (ghcr.io) con soporte para arquitectura `linux/arm/v7` (Raspberry Pi 3) y `linux/amd64`.

## Dependencias

- Dockerfile existente en `apps/api/Dockerfile` (verificar que funcione)
- Cuenta GitHub con acceso a GitHub Container Registry

## Tareas

---

### Tarea 3.1: Crear workflow `.github/workflows/deploy-backend.yml`

**Qué**: Workflow de GitHub Actions que construye la imagen Docker del backend en multi-arquitectura y la publica en `ghcr.io/duver0/fit-app-api`.

**Por qué**: La Raspberry Pi 3 es ARMv7. Necesitamos una imagen que corra nativamente en esa arquitectura (sin emulación). QEMU + Docker Buildx permite build cruzado.

**Archivos afectados**: `.github/workflows/deploy-backend.yml` (nuevo)

**Categoría**: **A** (agente devops)

**Contenido del archivo**:

```yaml
name: Build & Push Backend Image

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'packages/shared/**'
      - 'package.json'
      - 'package-lock.json'
      - 'Dockerfile'
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}-api

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=,suffix=,format=short
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/api/Dockerfile
          platforms: linux/amd64,linux/arm/v7
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

### Tarea 3.2: Verificar que el Dockerfile existente funcione con el monorepo

**Qué**: Revisar y ajustar el Dockerfile actual para que compile correctamente el backend en un entorno CI.

**Por qué**: El Dockerfile actual (`apps/api/Dockerfile`) hace `COPY` de `apps/api` y `packages/shared`, pero debe verificar que:
1. `npm ci` se ejecute desde la raíz del monorepo (el `package.json` raíz tiene las workspaces)
2. `npx prisma generate` apunte al schema correcto
3. `npm run api:build` compile sin errores

**Archivos afectados**: `apps/api/Dockerfile` (posible ajuste)

**Categoría**: **A** (agente backend)

**Revisión del Dockerfile actual**:

```dockerfile
# apps/api/Dockerfile (actual)
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm ci

COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run api:build

EXPOSE 4000

CMD ["node", "apps/api/dist/main"]
```

**Problemas potenciales**:
- La imagen usa `node:20-alpine` que es `linux/amd64`. Para ARMv7 se necesita `node:20-alpine` con soporte multi-arch (Docker lo maneja automáticamente con Buildx).
- `npm ci` desde la raíz debe funcionar en un contexto limpio de CI. Si hay paquetes que requieren `sharp` u otras librerías nativas, pueden necesitar `python3` y `make` en Alpine.

**Solución preventiva**: Si hay errores de compilación nativa, agregar dependencias build-essential:

```dockerfile
# Antes de npm ci, agregar si es necesario:
RUN apk add --no-cache python3 make g++
```

---

### Tarea 3.3: Verificar que el tag `latest` se etiquete correctamente

**Qué**: Confirmar que la metadata action genera tags como:
- `ghcr.io/duver0/fit-app-api:latest` (solo en push a main)
- `ghcr.io/duver0/fit-app-api:sha-<commit>` (todos los pushes)

**Por qué**: Para que el `docker-compose.yml` en el Pi pueda referenciar `:latest` y siempre tire la versión más reciente.

**Categoría**: **A** (verificación)

---

### Tarea 3.4: Configurar visibilidad del paquete en GHCR

**Qué**: Una vez que el workflow se ejecute exitosamente, ir a la página del paquete en GitHub (https://github.com/orgs/Duver0/packages) y configurar la visibilidad como **público**.

**Por qué**: Si el paquete es privado, el Raspberry Pi necesitará autenticarse para hacer `docker pull`. Público es más simple para un proyecto personal.

**Categoría**: **B** (manual — configuración en GitHub UI)

---

## Criterios de Aceptación

- [ ] El workflow `deploy-backend.yml` ejecuta exitosamente en push a `main`
- [ ] La imagen `ghcr.io/duver0/fit-app-api:latest` existe y es multi-arch (`linux/amd64`, `linux/arm/v7`)
- [ ] `docker pull ghcr.io/duver0/fit-app-api:latest` funciona desde la Raspberry Pi (ARMv7)
- [ ] El contenedor inicia correctamente en ARMv7 y responde en puerto 4000
