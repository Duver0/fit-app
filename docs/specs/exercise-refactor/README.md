# Refactor del Módulo de Ejercicios — Imagen por ejercicio y simplificación del Group Dashboard

> **Estado general: 🟡 PARCIALMENTE COMPLETADO** (4/5 specs implementadas)

## Descripción
Se agrega la posibilidad de asociar una imagen (`imageUrl`) a cada ejercicio. El group dashboard se simplifica eliminando el registro inline de marcas y el top 3 inline, moviendo esa funcionalidad exclusivamente a la pantalla de detalle del ejercicio. Cada ejercicio en el dashboard se muestra como una tarjeta con imagen (o placeholder), nombre, unidad y un tap que navega al detalle completo.

## Estado por spec

| Spec | Estado | Commit |
|------|--------|--------|
| `01-database.md` | ✅ Completado (falta `migrate dev` en BD) | `ac8fe56` |
| `02-api.md` | ✅ Completado | `ac8fe56` |
| `03-backend.md` | ✅ Completado | `ac8fe56` |
| `04-frontend.md` | ✅ Completado | `ac8fe56` |
| `05-tests.md` | ❌ Pendiente | — |

## Dependencias externas
- R2 Storage / S3: Sí (para alojar las imágenes de ejercicios, asumiendo misma infraestructura que avatars)
- Auth0: No (auth local JWT existente)
- FCM: No

## Orden de implementación
1. ~~`01-database.md` — esquema de datos (Prisma schema + migración)~~ ✅
2. ~~`02-api.md` — contratos GraphQL (queries y mutations actualizadas)~~ ✅
3. ~~`03-backend.md` — lógica de negocio (service, resolver, input)~~ ✅
4. ~~`04-frontend.md` — UI y experiencia (dashboard simplificado, detalle enriquecido)~~ ✅
5. `05-tests.md` — verificación (tests de backend y frontend) ❌

## Notas
- La imagen se almacena como URL string opcional; la subida se maneja desde el frontend con un upload presignado (similar a avatars). Esta spec solo cubre almacenar y mostrar la URL.
- No se agrega soporte para editar imagen por separado en la primera iteración; se podrá al crear el ejercicio y luego mediante una mutation `updateExerciseImage`.
- El `TOP3_RANKING_QUERY` existente puede eliminarse del dashboard ya que ya no se usa ahí, pero se mantiene por si otro screen lo necesita. Se deja de llamar en el dashboard.
