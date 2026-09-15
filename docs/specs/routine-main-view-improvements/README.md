# Routine Main View Improvements

## Descripción
Rediseño de la vista principal de rutina (`apps/mobile/app/(app)/routine/index.tsx`) para mejorar la experiencia visual y de usabilidad:

1. **Día de descanso obligatorio**: Siempre al menos 1 día de descanso visual. Máximo 6 días de trabajo + 1 día descanso = 7 cards simétricas. Sin texto adicional ("Descanso", "Trabajo"). Diferenciación solo visual (estilo tarjeta distinta: fondo, borde, icono, opacidad). El día de descanso puede ser fijo (ej. Domingo) o configurable (preferencia usuario).

2. **Avatar Group (Avatar Stack) por día**: Reemplazar "N ejercicio(s)" / "Sin ejercicios" por stack de avatares de los ejercicios del día (máx 4-5 visibles + overflow "+N"). Avatar usa `exercise.imageUrl` si existe, si no: 2 iniciales del nombre (ej. "PR" para "Press Banca"). Reutiliza componente `Avatar` existente (`src/components/ui/Avatar.tsx`). Total count número simple junto al stack (sin palabra "ejercicios").

3. **Eliminar numeración día 1-7**: Quitar badge circular inferior con número. Los días se identifican por nombre abreviado (Lun, Mar, Mié, Jue, Vie, Sáb, Dom) en la tarjeta.

4. **Mantener**: grid 2 cols, nombre día custom editable, navegación a día individual, tema oscuro/claro, accesibilidad.

## Dependencias externas
- Ninguna (backend sin cambios: query `MY_ROUTINE_DAYS_QUERY` ya trae `imageUrl`)

## Orden de implementación
1. `01-visual-design.md` — Diseño visual tarjetas (trabajo vs descanso), theme tokens
2. `02-avatar-stack.md` — Componente `AvatarStack` reutilizable
3. `03-day-helpers.md` — Helpers `dayOfWeek`, abreviaciones, lógica descanso
4. `04-grid-responsive.md` — Grilla responsive 2 cols, accesibilidad
5. `05-main-screen.md` — Integración en `routine/index.tsx`
6. `06-tests.md` — Verificación por capa

## Notas
- La preferencia de día de descanso configurable requiere store/AsyncStorage (fase futura). Para MVP: domingo fijo (index 6).
- `Avatar.tsx` ya soporta `imageUrl` + fallback iniciales. `AvatarStack` será wrapper que gestiona overflow y count.
- No hay cambios en GraphQL schema ni resolvers.