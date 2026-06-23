---
name: create-hook
description: Use when generating a custom React hook for data fetching, mutations, or state management following consistent patterns.
---

# create-hook

## Purpose
Generate a custom React hook following consistent patterns for data fetching, state management, and GraphQL operations.

## Inputs
- `name`: string — hook name (e.g., "useRanking")
- `type`: 'query' | 'mutation' | 'store' | 'combined'
- `graphqlOperation?`: string
- `dependencies?`: string[]
- `returns?`: Array of `{ name, type, description }`

## Outputs
- New hook file in `apps/mobile/src/hooks/use{Name}.ts`
- Test file in `apps/mobile/__tests__/hooks/use{Name}.test.ts`

## Hook Pattern
```typescript
import { useQuery, gql } from '@apollo/client';
import { useCallback } from 'react';

const RANKING_QUERY = gql`...`;

interface UseRankingParams {
  exerciseId: string;
  groupId: string;
  page?: number;
  limit?: number;
}

export function useRanking({ exerciseId, groupId, page = 1, limit = 20 }: UseRankingParams) {
  const { data, loading, error, refetch, fetchMore } = useQuery(RANKING_QUERY, {
    variables: { exerciseId, groupId, page, limit },
    skip: !exerciseId || !groupId,
  });

  const handleFetchMore = useCallback((nextPage: number) => {
    fetchMore({ variables: { page: nextPage } });
  }, [fetchMore]);

  return { ranking: data?.ranking, loading, error, refetch, fetchMore: handleFetchMore };
}
```

## Best Practices
1. Query hooks always have `skip` condition for missing params
2. Mutation hooks return `[mutate, { loading, error }]` tuple
3. Store hooks subscribe with selectors for re-render minimization
4. Combined hooks compose smaller hooks, don't duplicate logic
5. Always expose loading, error, refetch states
6. Use TypeScript generics for type safety
7. Test: loading state → success state → error state

## Validation Checklist
```
□ Hook follows naming convention (use{PascalCase})
□ Query has skip condition for missing params
□ Returns: { data, loading, error, refetch }
□ TypeScript types exported and used
□ Unit test written (loading, success, error)
□ No side effects outside React lifecycle
```
