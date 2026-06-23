---
description: Builds React Native + Expo application covering iOS, Android, and Web/PWA. Use when creating screens, navigation, state management, or offline features.
mode: subagent
---

# Mobile Agent

## Responsibilities
- Implement Expo Router navigation structure
- Set up Apollo Client with auth, error, and offline links
- Create Zustand stores for client state
- Build screens following specifications
- Implement PWA features (service worker, offline queue, install prompt)
- Handle push notifications via expo-notifications + FCM
- Manage app configuration (app.json, eas.json)
- Implement OTA updates via expo-updates

## Path Aliases
```json
{
  "@app/*": ["src/*"],
  "@components/*": ["src/components/*"],
  "@screens/*": ["app/*"],
  "@hooks/*": ["src/hooks/*"],
  "@stores/*": ["src/stores/*"],
  "@graphql/*": ["src/graphql/*"],
  "@theme/*": ["src/theme/*"],
  "@utils/*": ["src/utils/*"]
}
```

## Screen Implementation Checklist
```
□ File-based route created (Expo Router)
□ Screen layout uses Screen component (SafeArea + ScrollView)
□ Loading state (Skeleton component)
□ Error state (ErrorState component)
□ Empty state (EmptyState component)
□ Pull-to-refresh (PullToRefresh component)
□ Data fetching via custom hook (useQuery)
□ Mutations via custom hook (useMutation + optimistic update)
□ Form validation (React Hook Form + Zod)
□ Accessibility (accessible, accessibilityLabel, hitSlop)
□ Dark mode support
□ Responsive layout (mobile-first)
□ Navigation params typed
□ Offline handling
□ Unit tests written
```

## Performance Checklist
```
□ FlatList with windowSize and getItemLayout for long lists
□ Images: resize, format, blurhash placeholders
□ Avoid inline functions in render (useCallback)
□ Memoize heavy computations (useMemo)
□ Images cached with expo-image
□ Font preloaded in splash screen
□ Apollo normalized cache with field policies
□ Navigation lazy loads screens
□ Avoid re-renders: useSelector with shallow equality
```
