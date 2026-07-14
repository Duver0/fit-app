# Frontend — Build Script + Configuración GitHub Pages

## Objetivo

Preparar el frontend Expo/React Native Web para ser compilado como SPA estática y desplegado en GitHub Pages.

## Dependencias

- Ninguna (puede hacerse en paralelo con otras tareas)

## Tareas

---

### Tarea 1.1: Crear script `build:web` en `apps/mobile/package.json`

**Qué**: Agregar script `"build:web"` que ejecute `expo export --platform web` para generar la SPA estática.

**Por qué**: `expo export` produce un build listo para hosting estático en la carpeta `dist/`. GitHub Pages necesita este output.

**Archivos afectados**: `apps/mobile/package.json`

**Categoría**: **A** (agente mobile)

**Ejemplo de cambio**:

```json
// apps/mobile/package.json — agregar en "scripts":
"build:web": "expo export --platform web",
"clean": "rm -rf dist"
```

**Verificación**: `npm run build:web -w apps/mobile` debe generar la carpeta `apps/mobile/dist/` con `index.html`, archivos JS empaquetados, y assets.

---

### Tarea 1.2: Crear archivo `apps/mobile/public/404.html` para SPA routing

**Qué**: Crear un archivo `404.html` en la carpeta `public/` de Expo que redirija a `index.html`. GitHub Pages sirve `404.html` cuando una ruta no existe, y al redirigir al `index.html`, el router SPA (expo-router) toma el control.

**Por qué**: Sin este archivo, las rutas directas (e.g., `/groups/abc`) devuelven 404 en GitHub Pages porque no existen como archivos físicos.

**Archivos afectados**: `apps/mobile/public/404.html` (nuevo)

**Categoría**: **A** (agente mobile)

**Contenido del archivo**:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Fit App</title>
  <script type="text/javascript">
    // Redirigir a index.html preservando la ruta
    var path = window.location.pathname.replace(/^\/fit-app/, '')
    window.location.href = '/fit-app/?redirect=' + encodeURIComponent(path)
  </script>
</head>
<body>
  <p>Redirigiendo...</p>
</body>
</html>
```

> **Nota**: El prefijo `/fit-app` es el slug definido en `app.json`. Expo export genera todas las rutas bajo `/<slug>/`. Ajustar si el slug cambia.

---

### Tarea 1.3: Verificar que `expo export` funcione correctamente en el monorepo

**Qué**: Probar el comando `npx expo export --platform web` desde `apps/mobile/` para asegurar que Metro resuelva correctamente los paquetes del monorepo (`packages/shared`).

**Por qué**: Expo export necesita empaquetar todo el JS. Si hay errores de resolución de módulos del workspace, el build falla.

**Categoría**: **A** (agente mobile)

**Posibles problemas y soluciones**:
- Si Metro no resuelve `packages/shared`, verificar que `metro.config.js` tenga configurado `watchFolders` y `nodeModulesPaths` (ya existe en la config actual).
- Si hay errores de `react-native` en web, asegurar que `react-native-web` y `react-dom` están en dependencias (ya existen).

---

### Tarea 1.4: Crear archivo `.env` para producción en `apps/mobile/`

**Qué**: Crear `apps/mobile/.env` con la variable `EXPO_PUBLIC_API_URL` apuntando al backend en producción.

**Por qué**: El Apollo Client usa `process.env.EXPO_PUBLIC_API_URL` (prefijo `EXPO_PUBLIC_` para exponer al cliente). Sin este archivo, el build web usará el fallback `http://localhost:4000/graphql`.

**Archivos afectados**: `apps/mobile/.env` (nuevo, **no** comitear — agregar a `.gitignore`)

**Categoría**: **B** (manual — contiene URL real del despliegue)

**Contenido**:

```env
EXPO_PUBLIC_API_URL=https://dbfitapp.duckdns.org/graphql
```

> **Nota**: Reemplazar `dbfitapp.duckdns.org` por el subdominio DuckDNS real.

---

### Tarea 1.5: Agregar `.env` y `dist/` al `.gitignore` de mobile

**Qué**: Asegurar que `apps/mobile/.gitignore` ignore el archivo `.env` y el directorio `dist/`.

**Por qué**: `.env` contiene URLs de producción y no debe comitearse. `dist/` es output del build y no debe estar en el repo.

**Archivos afectados**: `apps/mobile/.gitignore`

**Categoría**: **A** (agente mobile)

**Contenido a agregar**:

```gitignore
# production build output
dist/

# environment variables
.env
```

---

### Tarea 1.6: Verificar que `"web.output": "single"` esté en `app.json`

**Qué**: Confirmar que `app.json` tiene `"web": { "output": "single" }` para que Expo export genere una SPA de una sola página.

**Por qué**: Sin `"single"`, Expo genera múltiples archivos HTML para cada ruta, incompatible con el router dinámico de expo-router.

**Archivos afectados**: `apps/mobile/app.json` (ya configurado — verificar)

**Categoría**: **A** (agente mobile — verificación)

**Estado actual**: ✅ Ya existe `"output": "single"` en `app.json`.

---

## Criterios de Aceptación

- [ ] `npm run build:web -w apps/mobile` genera `apps/mobile/dist/` sin errores
- [ ] `apps/mobile/public/404.html` existe y redirige correctamente
- [ ] `apps/mobile/.env` existe con `EXPO_PUBLIC_API_URL` correcta
- [ ] `.gitignore` ignora `.env` y `dist/`
- [ ] El build de producción funciona con `web.output: single`
