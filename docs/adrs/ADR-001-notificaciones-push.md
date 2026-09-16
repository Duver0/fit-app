# ADR-001: Sistema de Notificaciones Push para Actualización de Progreso

## Estado
**Implementado** - Backend y Mobile completados. Pendiente configuración de keys de push.

## Contexto

Los usuarios de fit-app necesitan ser notificados cuando un miembro de su grupo actualiza su progreso en un ejercicio. Actualmente:
- No existe sistema de notificaciones push
- Solo existe una campana de invitaciones con polling

El usuario solicitó:
- Usar el patrón Observer para detectar cambios y disparar notificaciones
- **No** querer historial de notificaciones ni pantalla dentro de la app
- Las notificaciones son solo informativas y al tocarlas llevan al grupo/ejercicio

## Decisión

### 1. Patrón Observer para Detección de Cambios

**Implementado con `@nestjs/event-emitter` v3.1.0.**

**Cómo funciona:**
```
PerformanceService.upsert()
    ↓ (después de guardar)
EventEmitter.emit('performance.updated')
    ↓
ProgressUpdateObserver.handle()
    ↓
NotificationsService.sendPush()
```

### 2. Plataforma de Push Notifications

El proyecto tiene dos formas de ejecutarse:

| Plataforma | Estado | Tecnología |
|------------|--------|------------|
| **iOS/Android (Expo)** | ✅ Implementado | Expo Push Notifications |
| **Web PWA (Vercel)** | ⚠️ Requiere config | Web Push API (VAPID) |

**Para app nativa (Expo):**
- Requiere cuenta en Expo (gratis)
- Requiere EXPO_ACCESS_TOKEN
- Requiere Project ID en app.json

**Para PWA en Vercel:**
- Requiere VAPID keys (generadas localmente)
- Requiere Service Worker configurado
- Requiere HTTPS (Vercel lo proporciona)

### 3. Modelo de BD: Solo Device Tokens

**Implementado:**
- Tabla `device_tokens` con relación a `User`
- Migración aplicada en Neon PostgreSQL

**No se crea tabla de notificaciones** porque:
- No hay historial de notificaciones
- Las notificaciones son informativas y se descartan
- Reduce complejidad

## Implementación Completada

### Backend (NestJS)

| Componente | Archivo | Estado |
|------------|---------|--------|
| EventsModule | `src/modules/events/events.module.ts` | ✅ |
| NotificationsModule | `src/modules/notifications/` | ✅ |
| ProgressUpdateObserver | `observers/progress-update.observer.ts` | ✅ |
| NotificationsService | `notifications.service.ts` | ✅ |
| NotificationsResolver | `notifications.resolver.ts` | ✅ |
| PerformanceService | Modificado para emitir eventos | ✅ |

### Mobile (Expo)

| Componente | Archivo | Estado |
|------------|---------|--------|
| Servicio push | `src/lib/notifications.ts` | ✅ |
| Hook | `src/hooks/useNotifications.ts` | ✅ |
| Layout | `app/(app)/_layout.tsx` | ✅ |

### Base de Datos

| Componente | Estado |
|------------|--------|
| Modelo DeviceToken | ✅ |
| Migración SQL | ✅ Aplicada en Neon |

## Pendiente: Configurar Push Notifications

### Opción A: Expo Push (App Nativa)

```env
# Agregar en apps/api/.env
EXPO_ACCESS_TOKEN=tu_token_de_expo
```

**Obtener token:**
1. Crear cuenta en https://expo.dev
2. Ir a Settings → Access Tokens
3. Crear nuevo token

### Opción B: Web Push (PWA en Vercel)

```env
# Agregar en apps/api/.env
VAPID_PUBLIC_KEY=tu_public_key
VAPID_PRIVATE_KEY=tu_private_key
VAPID_EMAIL=mailto:t@email.com
```

**Generar keys:**
```bash
npx web-push generate-vapid-keys
```

### Opción C: Firebase (Recomendado para producción)

Funciona para ambas plataformas (nativa + web).

## Referencias

- [NestJS EventEmitter](https://docs.nestjs.com/techniques/events)
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)

## Participation

- **Autor:** Orchestrator Agent
- **Fecha:** 2026-09-15
- **Estado:** Implementado, pendiente configuración
