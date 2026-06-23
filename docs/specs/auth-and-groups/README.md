# Fit App — Plataforma de Ranking de Gimnasio

## Descripción
Aplicación móvil (Expo/React Native) + PWA donde usuarios crean grupos de gimnasio, registran su progreso en ejercicios y compiten en rankings. Incluye autenticación con Auth0 (Google SSO + email/password), sistema de disputas por mayoría simple, y panel de super admin.

## Funcionalidades core
1. **Auth**: Login/registro con Auth0 (Google + email/password). Datos: nombre, email, celular, contraseña.
2. **Grupos**: CRUD de grupos, avatar del grupo, invitar miembros, un usuario puede pertenecer a N grupos.
3. **Ejercicios**: Solo el dueño del grupo crea ejercicios dentro del grupo.
4. **Progreso**: Upsert de marca por ejercicio — un usuario solo puede tener 1 marca por ejercicio, la actualiza.
5. **Ranking**: Al entrar al grupo se ven top 3 por ejercicio. Al entrar a un ejercicio se ve ranking completo.
6. **Disputas**: Cualquier miembro puede disputar una marca. Si ≥51% del grupo la refuta, se elimina.
7. **Super Admin**: Panel para eliminar/editar grupos, usuarios, ejercicios.
8. **PWA**: Instalable desde el navegador, funciona offline parcialmente.

## Dependencias externas
- Auth0: Sí (email/password + Google SSO)
- Cloudflare R2: Sí (avatares de usuarios y grupos)
- Firebase Cloud Messaging: Sí (notificaciones de invitación y disputas)
- Redis + Bull: Sí (colas para procesamiento de disputas y notificaciones)

## Orden de implementación
1. `01-database.md` — Esquema de datos (Prisma)
2. `02-api.md` — Contratos GraphQL (queries, mutations, inputs, permisos)
3. `03-backend.md` — Lógica de negocio (servicios, validaciones, eventos)
4. `04-frontend.md` — UI/UX (screens, componentes, hooks, stores, PWA)
5. `05-tests.md` — Tests (unitarios, integración, E2E)

## Bounded contexts (DDD)
| Contexto | Módulo NestJS | Descripción |
|---|---|---|
| Identity | `auth` | Auth0 integración, registro, perfil |
| Users | `users` | Perfil de usuario, avatar, roles |
| Groups | `groups` | CRUD grupos, membresías, invitaciones |
| Exercises | `exercises` | Definición de ejercicios por grupo |
| Performance | `performance` | Registro de marcas, rankings |
| Disputes | `disputes` | Sistema de votación para refutar marcas |
| Admin | `admin` | Panel de super administrador |

## Roles
| Rol | Permisos |
|---|---|
| `SUPER_ADMIN` | Todo: eliminar grupos, usuarios, ejercicios, editar nombres |
| `GROUP_OWNER` | Crear ejercicios, editar grupo, eliminar miembros |
| `GROUP_MEMBER` | Registrar/actualizar marca, disputar, ver rankings |
| `USER` | Solo ver grupos y perfil (sin membresía) |

## Notas
- Los rankings usan SQL con ventanas (`RANK()` o `ROW_NUMBER()`) para eficiencia.
- Las disputas expiran si no alcanzan 51% en 7 días.
- PWA se sirve desde el mismo dominio web; `exp-pwa` + service worker con Workbox.
- Modo oscuro con NativeWind `dark:` variant y persistencia en Zustand.
