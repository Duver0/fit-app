# Routine Main View — AvatarStack Component

## Objetivo
Componente reutilizable `AvatarStack` que muestra hasta **4-5 avatares superpuestos** (stack) de ejercicios del día, con indicador de overflow `+N` y contador total simple. Reutiliza `Avatar` existente (`src/components/ui/Avatar.tsx`).

## Dependencias
- `src/components/ui/Avatar.tsx` (ya existe, soporta `imageUrl` + fallback iniciales)
- `01-visual-design.md` (consumido por tarjeta trabajo)
- `03-day-helpers.md` (provee ejercicios del día)

## Props
```typescript
interface AvatarStackProps {
  /** Ejercicios del día (array con { id, name, imageUrl }) */
  exercises: Array<{ id: string; name: string; imageUrl?: string | null }>;
  /** Tamaño individual de cada avatar (default: 32) */
  size?: number;
  /** Máximo avatares visibles en stack (default: 4) */
  maxVisible?: number;
  /** Espacio de solapamiento entre avatares (default: -8) */
  overlap?: number;
  /** Estilo contenedor adicional */
  style?: ViewStyle;
  /** Callback al presionar el stack (navegar a detalle día) */
  onPress?: () => void;
  /** Etiqueta accesibilidad contenedor */
  accessibilityLabel?: string;
}
```

## Comportamiento

### Renderizado
1. **0 ejercicios**: Mostrar estado vacío — círculo con `+` (o ghost avatar) + count `0`
2. **1-4 ejercicios**: Stack horizontal, cada avatar solapado `overlap` px
3. **5+ ejercicios**: Primeros `maxVisible-1` avatares + último slot = badge `+N` (N = total - maxVisible + 1)
4. **Contador total**: Siempre visible a la derecha del stack: número simple (ej. `7`), **sin** "ejercicios"

### Avatar Source Priority
```typescript
// Dentro de AvatarStack, para cada exercise:
const avatarProps = {
  name: exercise.name,
  size: props.size,
  avatarUrl: exercise.imageUrl, // Avatar.tsx ya resuelve getImageUrl + fallback iniciales
};
```

### Overflow Badge (`+N`)
- Mismo `size` que avatares
- Fondo: `colors.primary` light / `colors.primary` dark
- Texto: blanco (`#FFFFFF`), `fontWeight: '700'`, `fontSize: size * 0.35`
- Border radius: `size / 2` (circular)
- Accesibilidad: `accessibilityLabel={`${overflowCount} ejercicios más`}`

### Contador Total
- Posición: derecha del stack, centrado verticalmente
- Estilo: `fontSize: 14`, `fontWeight: '600'`, `color: colors.text`
- Margin left: `8` (separación del último avatar/badge)

## Ejemplos Visuales

### 3 ejercicios (sin overflow)
```
[Avatar1][Avatar2][Avatar3]  3
```

### 6 ejercicios (maxVisible=4, overlap=-8)
```
[Avatar1][Avatar2][Avatar3][+3]  6
```

### 0 ejercicios (estado vacío)
```
[Ghost/+]  0
```

## Accesibilidad
- Contenedor: `accessibilityRole="group"`, `accessibilityLabel={props.accessibilityLabel || \`\${exercises.length} ejercicios en este día\`}`
- Cada `Avatar`: `accessibilityLabel={\`Ejercicio: \${exercise.name}\`}` (ya en Avatar.tsx)
- Overflow badge: `accessibilityLabel={\`\${overflowCount} ejercicios adicionales\`}`
- Contador total: **no** focusable (texto informativo)
- Hit area: contenedor completo ≥ 44x44 (wrap en Pressable si `onPress`)

## Dark Mode
- Usa `useTheme()` → `colors.primary`, `colors.text`, `colors.surface`
- `Avatar` ya maneja su propio dark mode internamente

## Tests Requeridos
- [ ] Render 0 ejercicios → ghost + "0"
- [ ] Render 1-4 ejercicios → stack correcto, count = length
- [ ] Render 5+ ejercicios → maxVisible-1 avatares + badge +N, count = total
- [ ] `imageUrl` presente → Avatar muestra imagen
- [ ] `imageUrl` null → Avatar muestra iniciales (2 letras)
- [ ] `onPress` dispara callback
- [ ] `accessibilityLabel` correcto en contenedor
- [ ] Dark mode: colores resueltos vía theme

## Archivo Destino
`apps/mobile/src/components/ui/AvatarStack.tsx`

## Exportación
```typescript
export { AvatarStack } from './AvatarStack';
export type { AvatarStackProps } from './AvatarStack';
```

## Integración en Tarjeta (routine/index.tsx)
```tsx
<AvatarStack
  exercises={exercises.map(e => ({ id: e.id, name: e.name, imageUrl: e.imageUrl }))}
  size={32}
  maxVisible={4}
  overlap={-8}
  accessibilityLabel={`${dayName}, ${exercises.length} ejercicios`}
/>
```