---
name: create-screen
description: Use when generating a complete Expo Router screen with layout, data fetching, state handling, and tests.
---

# create-screen

## Purpose
Generate a complete screen component for the Expo Router app, including layout, data fetching, state handling, and tests.

## Inputs
- `route`: string — route path (e.g., "group/[groupId]/exercises/[exerciseId]")
- `name`: string — display name
- `type`: 'list' | 'detail' | 'form' | 'dashboard'
- `authRequired`: boolean (default: true)
- `adminOnly`: boolean (default: false)

## Outputs
- Screen file at `apps/mobile/app/{route}.tsx`
- `_layout.tsx` if route group needs one

## State Coverage
Every screen must handle:
1. **Loading**: Skeleton components mimicking content layout
2. **Error**: ErrorState component with retry button
3. **Empty**: EmptyState with contextual message and action
4. **Offline**: OfflineBanner at top (if data is stale)
5. **Success**: Normal content render
6. **Refetching**: Pull-to-refresh indicator (don't show skeleton again)

```typescript
// Example: app/group/[groupId]/exercises/[exerciseId]/index.tsx
export default function ExerciseDetailScreen() {
  const { groupId, exerciseId } = useLocalSearchParams<{ groupId: string; exerciseId: string }>();
  const { ranking, loading, error, refetch } = useRanking({ exerciseId, groupId });

  return (
    <Screen loading={loading} error={error} onRetry={refetch}>
      {/* content */}
    </Screen>
  );
}
```

## Best Practices
1. Use `useLocalSearchParams` for route params (Expo Router)
2. Wrap content in `<Screen>` component (SafeArea, ScrollView)
3. Screen component is default export (Expo Router convention)
4. Separate business logic into hooks, keep screens thin
5. Use `ErrorBoundary` at layout level for catastrophic errors
6. Accessible: proper heading hierarchy starting with h1
7. Keyboard avoidance on forms (KeyboardAvoidingView)

## Validation Checklist
```
□ File-based route matches path convention
□ Auth guard applied (if authRequired)
□ Accessible (headings, labels)
□ Loading state (Skeleton)
□ Error state (ErrorState + retry)
□ Empty state (EmptyState + action)
□ Pull-to-refresh (PullToRefresh)
□ Dark mode renders correctly
□ Responsive: phone, tablet, web
```
