# Feature: Notificaciones Push - Actualización de Progreso en Grupos

## Contexto

Los usuarios de fit-app necesitan ser notificados cuando un miembro de su grupo actualiza su progreso en un ejercicio. Las notificaciones son **solo informativas** y al tocarlas llevan al usuario directamente al grupo/ejercicio.

**Ejemplo de uso:**
> "Juan ha actualizado su progreso en Press de Banca. ¡Entra para ver el progreso!"

**Importante:** No hay historial de notificaciones ni pantalla dentro de la app. Las notificaciones push son el único medio de comunicación.

## Estado de Implementación

| Componente | Estado | Notas |
|------------|--------|-------|
| **Backend (NestJS)** | ✅ Completado | Observer pattern + NotificationsModule |
| **Mobile (Expo)** | ✅ Completado | Servicio + hook + deep linking |
| **Base de Datos** | ✅ Completado | Migración aplicada en Neon |
| **Infraestructura** | ⚠️ Pendiente | Configurar keys de push notifications |

## Arquitectura Implementada

### Patrón Observer para Detección de Cambios

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE SERVICE                          │
│  upsert() → afterUpsert() → PerformanceUpdatedEvent            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  EVENT EMITTER (NestJS)                         │
│  @nestjs/event-emitter emite PerformanceUpdatedEvent            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│           PROGRESS UPDATE OBSERVER                              │
│  1. Obtiene miembros del grupo (excepto autor)                  │
│  2. Busca sus device tokens                                    │
│  3. Envía push via API de notificaciones                       │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo Detallado

1. **Usuario A** actualiza su progreso → `PerformanceService.upsert()`
2. Se emite evento `PerformanceUpdatedEvent` con datos del cambio
3. **ProgressUpdateObserver** recibe el evento
4. **NotificationsService** envía push a todos los miembros del grupo (excepto el autor)
5. Los miembros reciben notificación push en su dispositivo
6. Al tocar la notificación → navega al grupo/ejercicio correspondiente

## Archivos Creados/Modificados

### Backend (NestJS)

| Archivo | Descripción |
|---------|-------------|
| `prisma/schema.prisma` | Modelo `DeviceToken` + relación en `User` |
| `prisma/migrations/20260915000000_add_device_tokens/migration.sql` | Migración SQL |
| `src/modules/events/events.module.ts` | EventsModule con EventEmitter |
| `src/modules/notifications/` | Módulo completo de notificaciones |
| `src/modules/performance/performance.service.ts` | Emitir evento después de upsert |
| `src/app.module.ts` | Importar nuevos módulos |

### Mobile (Expo)

| Archivo | Descripción |
|---------|-------------|
| `src/lib/notifications.ts` | Servicio de registro de tokens |
| `src/hooks/useNotifications.ts` | Hook para inicializar y deep linking |
| `app/(app)/_layout.tsx` | Integrar hook en layout |

## Configuración de Push Notifications

### Importante: App Nativa vs PWA

El proyecto tiene **dos formas** de ejecutarse:

| Plataforma | Tecnología Push | Configuración Necesaria |
|------------|-----------------|------------------------|
| **iOS/Android (Expo Go o app nativa)** | Expo Push Notifications | Token de Expo + Project ID |
| **Web PWA (Vercel/GitHub Pages)** | Web Push API (VAPID) | VAPID keys públicas/privadas |

### Opción 1: App Nativa (Expo Push)

**Para apps compiladas con EAS Build o Expo Go:**

1. **Crear cuenta en Expo:** https://expo.dev
2. **Obtener Access Token:**
   - Ir a: https://expo.dev/accounts/[username]/settings/access-tokens
   - Crear un nuevo token
   - Agregar a `.env`:
     ```
     EXPO_ACCESS_TOKEN=tu_token_aqui
     ```

3. **Obtener Project ID:**
   - Ir a tu proyecto en Expo Dashboard
   - Copiar el Project ID
   - Agregar en `app.json`:
     ```json
     {
       "expo": {
         "extra": {
           "eas": {
             "projectId": "tu-project-id"
           }
         }
       }
     }
     ```

### Opción 2: PWA en Vercel (Web Push API)

**Para la versión web (PWA):**

Las notificaciones push en web usan **Web Push API** con **VAPID keys**, no Expo Push.

1. **Generar VAPID keys:**
   ```bash
   npx web-push generate-vapid-keys
   ```

2. **Agregar variables de entorno en Vercel:**
   ```
   VAPID_PUBLIC_KEY=tu_public_key
   VAPID_PRIVATE_KEY=tu_private_key
   VAPID_EMAIL=mailto:tu@email.com
   ```

3. **Configurar Service Worker** (ya existe en `src/lib/registerSW.ts`)

4. **Modificar el servicio de notificaciones** para usar Web Push en web:
   ```typescript
   // En notifications.ts - detectar plataforma
   if (Platform.OS === 'web') {
     // Usar Web Push API con VAPID keys
   } else {
     // Usar Expo Push API
   }
   ```

### Opción 3: Firebase Cloud Messaging (FCM) - Recomendado para producción

**Funciona tanto para app nativa como para PWA:**

1. **Crear proyecto en Firebase:** https://console.firebase.google.com
2. **Habilitar Cloud Messaging** para iOS y Android
3. **Obtener credenciales:**
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_DATABASE_URL` (opcional)

4. **Agregar SDK en mobile:**
   ```bash
   npx expo install @react-native-firebase/app @react-native-firebase/messaging
   ```

5. **Configurar backend** con Firebase Admin SDK:
   ```bash
   npm install firebase-admin
   ```

## Variables de Entorno

### Backend (.env)

```env
# Base de Datos (ya configurado)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Redis (ya configurado)
REDIS_HOST=...
REDIS_PORT=...
REDIS_PASSWORD=...

# JWT (ya configurado)
JWT_SECRET=...

# Push Notifications (opcional según plataforma)
EXPO_ACCESS_TOKEN=tu_token_expo  # Solo para app nativa
VAPID_PUBLIC_KEY=...             # Solo para PWA
VAPID_PRIVATE_KEY=...            # Solo para PWA
VAPID_EMAIL=mailto:t@email.com   # Solo para PWA
```

### Mobile (app.json)

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "tu-project-id-expo"
      }
    }
  }
}
```

## Verificar que Funciona

### Backend
```bash
cd apps/api
npm run build
npm run start:dev
```

### Mobile
```bash
cd apps/mobile
npm start
```

### Probar notificación
1. Abrir la app en tu dispositivo (Expo Go o app compilada)
2. Aceptar permisos de notificación
3. Ir a un grupo → seleccionar un ejercicio
4. Actualizar progreso (reps o peso)
5. Los demás miembros del grupo deben recibir la notificación

## Troubleshooting

### "No device tokens found for group members"
- Los usuarios no han registrado sus tokens
- Verificar que se aceptaron permisos de notificación
- Revisar consola del mobile para errores

### Notificaciones no llegan en web (PWA)
- Las notificaciones push nativas no funcionan en todas las PWA
- Necesita HTTPS (Vercel lo提供)
- Necesita Service Worker registrado
- Algunos navegadores limitan notificaciones push

### Error "Invalid Expo push token"
- Verificar que EXPO_ACCESS_TOKEN es válido
- El token de Expo es diferente al token del dispositivo
- Recrear token desde Expo Dashboard

## Próximos Pasos

1. **Decidir plataforma:**
   - Si solo app nativa (iOS/Android): usar Expo Push
   - Si PWA + nativa: usar Firebase Cloud Messaging

2. **Configurar la opción elegida** siguiendo las instrucciones arriba

3. **Probar end-to-end** con al menos 2 usuarios en el mismo grupo
