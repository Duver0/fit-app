---
name: create-component
description: Use when generating a reusable UI component following the design system with accessibility, dark mode, and tests.
---

# create-component

## Purpose
Generate a reusable UI component following the design system, with proper styling, accessibility, dark mode support, and tests.

## Inputs
- `name`: string — PascalCase component name
- `category`: 'ui' | 'layout' | 'common' | '{feature}'
- `props`: Array of `{ name, type, required, default?, description }`
- `variants?`: Array of `{ name, props }`
- `hasDarkMode`: boolean (default: true)
- `hasLoadingState`: boolean (default: false)

## Outputs
- Component file `apps/mobile/src/components/{category}/{Name}.tsx`
- Test file `apps/mobile/__tests__/components/{Name}.test.tsx`

## Component Pattern
```typescript
export function Card({ title, subtitle, onPress, loading, style, ...rest }: CardProps) {
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface }, style]}>
        <Skeleton width="60%" height={20} />
        <Skeleton width="40%" height={14} style={{ marginTop: spacing.xs }} />
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.surface, opacity: pressed ? 0.9 : 1 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}
      {...rest}
    >
      <Text variant="body" weight="semibold">{title}</Text>
      {subtitle && <Text variant="caption" color={theme.textSecondary}>{subtitle}</Text>}
    </Pressable>
  );
}
```

## Best Practices
1. Every component accepts `style` override (ViewProps extension)
2. `useTheme()` for dynamic colors (never hardcode)
3. Accessibility: `accessibilityRole`, `accessibilityLabel`, hitSlop (44x44)
4. Variants via boolean/enum props (not separate components)
5. Loading state: Skeleton matching component layout
6. Composition over configuration — small focused components
7. Default exports for screen components, named exports for reusable

## Validation Checklist
```
□ Component accepts ViewProps style override
□ Dark mode support via useTheme()
□ Minimum 44x44 hit area on interactive elements
□ accessibilityLabel on all touchable elements
□ Loading state (if hasLoadingState)
□ No hardcoded colors or spacing (uses theme tokens)
□ TypeScript types exported
□ Unit test: renders, onPress fires, loading state
```
