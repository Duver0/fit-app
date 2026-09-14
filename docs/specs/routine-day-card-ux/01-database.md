# Mejora tarjeta rutina-día — 01-database

## Objetivo
Verificar que NO se requiere ningún cambio de esquema para esta mejora UX. Dejar constancia para que los agents de database no ejecuten migraciones.

## Dependencias
- Ninguna. Esta spec es la primera del orden y bloquea a `02-api.md` / `03-backend.md` solo como "verificado sin cambios".

## Database
- **Sin cambios.** El campo `sortOrder` (usado en `[day].tsx:755` como `#{item.sortOrder}`) ya existe en el modelo de `RoutineDayExercise` / tabla equivalente y ya es persistido por `REORDER_EXERCISES_MUTATION`.
- No se agregan modelos, índices ni migraciones.
- Verificación esperada por el implementador:
  ```bash
  # desde C:\Github\fit-app\api o carpeta del backend Prisma
  npx prisma validate
  # y grep de sortOrder en schema
  rg "sortOrder" --glob "*.prisma"
  ```
  Debe existir `sortOrder Int @default(0)` (o similar) en la relación día↔ejercicio.

## API
- N/A para esta capa.

## Backend
- N/A para esta capa.

## Frontend
- N/A para esta capa (ver `04-frontend.md`).

## Tests
- N/A (ver `05-tests.md`).

## Criterios de Aceptación
- [ ] `rg "sortOrder" prisma/schema.prisma` retorna el campo existente
- [ ] No se genera ni aplica ninguna migración (`prisma migrate status` limpio)
- [ ] Se confirma que el orden visual deriva 1:1 del `sortOrder` del servidor (sin columna extra)
