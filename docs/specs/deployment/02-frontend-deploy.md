# Frontend — GitHub Action para Deploy a GitHub Pages

## Objetivo

Automatizar el build y despliegue del frontend SPA a GitHub Pages cada vez que se haga push a `main`.

## Dependencias

- `01-frontend-build.md` debe completarse (script `build:web` debe existir)
- GitHub Pages debe estar habilitado en el repo (ver Tarea B.1)
- Token `GITHUB_TOKEN` es automático en GitHub Actions; no necesita configuración extra

## Tareas

---

### Tarea 2.1: Crear workflow `.github/workflows/deploy-frontend.yml`

**Qué**: Crear un workflow de GitHub Actions que:
1. Se active en `push` a `main` y manualmente (`workflow_dispatch`)
2. Use `actions/checkout@v4`
3. Configure Node.js 20
4. Instale dependencias con `npm ci` desde la raíz del monorepo
5. Ejecute `npm run build:web -w apps/mobile`
6. Despliegue la carpeta `apps/mobile/dist/` a GitHub Pages usando `actions/deploy-pages@v4`

**Por qué**: Automatiza el despliegue continuo del frontend sin intervención manual.

**Archivos afectados**: `.github/workflows/deploy-frontend.yml` (nuevo)

**Categoría**: **A** (agente devops)

**Contenido del archivo**:

```yaml
name: Deploy Frontend to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'apps/mobile/**'
      - 'packages/shared/**'
      - 'package.json'
      - 'package-lock.json'
  workflow_dispatch:

# Permisos necesarios para GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Solo un deploy a la vez
concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build web
        run: npm run build:web -w apps/mobile
        env:
          EXPO_PUBLIC_API_URL: ${{ vars.EXPO_PUBLIC_API_URL || 'https://fitapp.duckdns.org/graphql' }}
          NODE_ENV: production

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: apps/mobile/dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

### Tarea 2.2: Configurar variable de entorno del repo (`EXPO_PUBLIC_API_URL`)

**Qué**: Agregar `EXPO_PUBLIC_API_URL` como variable de entorno del repositorio en GitHub (Settings → Secrets and variables → Actions → Variables).

**Por qué**: Para que el workflow use la URL correcta del backend sin hardcodearla en el YAML.

**Valor**: `https://fitapp.duckdns.org/graphql` (o el subdominio DuckDNS real)

**Categoría**: **B** (manual — configuración en GitHub UI)

---

### Tarea 2.3: Configurar GitHub Pages en el repositorio

**Qué**: Habilitar GitHub Pages para que publique desde GitHub Actions (no desde una rama).

**Pasos**:
1. Ir a Settings → Pages del repositorio
2. En "Source", seleccionar **GitHub Actions**

**Por qué**: El workflow `deploy-pages` necesita que Pages esté habilitado y configurado para recibir artifacts desde Actions.

**Categoría**: **B** (manual — configuración en GitHub UI)

---

### Tarea 2.4: Crear `.github/workflows/deploy-frontend-preview.yml` (opcional — PR previews)

**Qué**: Workflow que despliegue una preview del frontend en cada PR, usando `actions/deploy-pages` con un ambiente temporal.

**Por qué**: Permite revisar cambios visuales antes de mergear a `main`.

**Archivos afectados**: `.github/workflows/deploy-frontend-preview.yml` (nuevo)

**Categoría**: **A** (agente devops — opcional)

**Contenido del archivo**:

```yaml
name: Deploy Frontend Preview (PR)

on:
  pull_request:
    paths:
      - 'apps/mobile/**'
      - 'packages/shared/**'

permissions:
  contents: read
  pull-requests: write

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build:web -w apps/mobile
        env:
          EXPO_PUBLIC_API_URL: ${{ vars.EXPO_PUBLIC_API_URL || 'https://fitapp.duckdns.org/graphql' }}
      - name: Upload preview artifact
        uses: actions/upload-artifact@v4
        with:
          name: preview-${{ github.event.number }}
          path: apps/mobile/dist
      - name: Comment PR with preview link
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `✅ Preview build complete for commit ${context.sha.slice(0, 7)}.\nDownload artifact: \`preview-${context.issue.number}\``
            })
```

---

## Criterios de Aceptación

- [ ] Al hacer push a `main` con cambios en `apps/mobile/`, el workflow se ejecuta
- [ ] El artifact se despliega correctamente a GitHub Pages
- [ ] La URL `https://duver0.github.io/fit-app/` carga la SPA
- [ ] Las rutas internas funcionan (e.g., navegar a `/groups/abc` sin 404)
- [ ] La API_URL usada en el build corresponde a `https://fitapp.duckdns.org/graphql`
