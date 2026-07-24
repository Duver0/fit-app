# Dispute System — Sistema de Disputas de Marcas

## Descripción
Sistema de disputas donde cualquier miembro de un grupo puede disputar una marca de rendimiento de otro miembro. Si el 51% o más de los miembros activos del grupo votan a favor, la marca se elimina. Las disputas expiran automáticamente a los 7 días si no alcanzan el 51%.

## Dependencias externas
- Auth: Local (JWT + bcrypt)
- Storage: Local (uploads en disco)
- FCM: Sí (notificaciones de disputa creada, voto recibido, disputa resuelta)
- Redis + Bull: Sí (cola para procesamiento de expiración de disputas y notificaciones)

## Orden de implementación
1. `01-database.md` — Esquema de datos (Prisma models, enums, índices, migraciones)
2. `02-api.md` — Contratos GraphQL (queries, mutations, inputs, permissions/guards)
3. `03-backend.md` — Lógica de negocio (servicios, validaciones, eventos, colas Bull)
4. `04-frontend.md` — UI/UX (screens, componentes, hooks, stores, notificaciones push)
5. `05-tests.md` — Tests (unitarios, integración, E2E)

## Dependencias entre capas
- `01-database.md` → `02-api.md` (schema Prisma debe existir antes de GraphQL types)
- `02-api.md` → `03-backend.md` (contratos GraphQL antes que resolvers/servicios)
- `02-api.md` → `04-frontend.md` (tipos TypeScript generados desde schema GraphQL)
- `03-backend.md` → `05-tests.md` (servicios listos para test unitario/integración)
- `04-frontend.md` → `05-tests.md` (UI lista para E2E)

## Bounded Context (DDD)
| Contexto | Módulo NestJS | Descripción |
|---|---|---|
| Disputes | `disputes` | Creación de disputas, votación, expiración, resolución, notificaciones |

## Roles y permisos
| Rol | Permisos en Disputas |
|---|---|
| `GROUP_MEMBER` | Crear disputa, votar en disputas de su grupo, ver disputas de su grupo |
| `GROUP_OWNER` | Mismos que miembro + ver todas las disputas del grupo |
| `SUPER_ADMIN` | Ver todas las disputas, eliminar cualquier disputa |

## Notas importantes
- **Umbral**: 51% de miembros **activos** del grupo (excluye owner? No, owner cuenta como miembro)
- **Expiración**: 7 días (168 horas) desde creación si no alcanza 51%
- **Un voto por miembro**: Un miembro no puede votar dos veces en la misma disputa
- **Auto-voto**: El creador de la disputa **NO** vota automáticamente; debe votar explícitamente
- **Auto-voto del dueño de la marca**: El dueño de la marca disputada **NO** puede votar en su propia disputa
- **Notificaciones FCM**: 
  - Al crear disputa → notificar al dueño de la marca y al owner del grupo
  - Al votar → notificar al creador de la disputa
  - Al resolver (aprobar/rechazar/expirar) → notificar a creador y dueño de la marca
- **Expiración**: Procesada via Bull queue (job programado a 7 días o job cron cada hora)
- **Eliminación de marca**: Si disputa aprueba → soft delete de `PerformanceRecord` (soft delete con `deletedAt`)
- **Notificaciones FCM**: Usar cola Bull para envío asíncrono

## Criterios de aceptación (High-level)
- [ ] Miembro puede crear disputa en marca de otro miembro de su grupo
- [ ] Miembro no puede disputar su propia marca
- [ ] Miembro no puede votar en su propia disputa
- [ ] Dueño de marca no puede votar en disputa de su marca
- [ ] Un voto por miembro por disputa
- [ ] Al alcanzar 51% votos a favor → marca eliminada (soft delete), disputa resuelta "APPROVED"
- [ ] Al expirar 7 días sin 51% → disputa resuelta "REJECTED", marca intacta
- [ ] Notificaciones FCM en: crear, votar, resolver
- [ ] Expiración procesada por Bull queue (job programado)
- [ ] Soft delete en PerformanceRecord (campo `deletedAt`)
- [ ] Rankings excluyen marcas con `deletedAt` no null
- [ ] Tests: unit (servicios), integración (resolvers), E2E (flujo completo disputa)
