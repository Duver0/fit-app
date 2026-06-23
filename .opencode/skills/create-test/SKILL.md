---
name: create-test
description: Use when generating test files for backend services, resolvers, guards, or frontend hooks, components, and stores.
---

# create-test

## Purpose
Generate test files for backend services, resolvers, guards, or frontend hooks, components, and stores.

## Inputs
- `target`: string — source file path to test
- `type`: 'unit' | 'integration' | 'e2e' | 'component'
- `framework`: 'jest' | 'vitest' | 'cypress'
- `mockDeps`: string[] — dependencies to mock
- `testCases`: Array of `{ name, scenario, setup?, expect }`

## Patterns by Type

### Backend Unit Test
```typescript
describe('PerformanceService', () => {
  let prisma: DeepMockProxy<PrismaClient>;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PerformanceService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
        { provide: RankingService, useValue: mockDeep<RankingService>() },
      ],
    }).compile();
    service = module.get(PerformanceService);
    prisma = module.get(PrismaService);
  });

  it('should create record when none exists', async () => {
    prisma.performanceRecord.upsert.mockResolvedValue(mockRecord);
    const result = await service.upsert('user-1', 'exercise-1', { value: 100 });
    expect(result.value).toBe(100);
  });
});
```

### Frontend Store Test
```typescript
describe('authStore', () => {
  beforeEach(() => useAuthStore.setState(initialState));
  it('should set token on login', () => {
    useAuthStore.getState().login({ token: 'abc', user: mockUser });
    expect(useAuthStore.getState().token).toBe('abc');
  });
  it('should clear state on logout', () => {
    useAuthStore.getState().login({ token: 'abc', user: mockUser });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().token).toBeNull();
  });
});
```

## Best Practices
1. One `describe` block per class/component
2. One `it` per behavior assertion
3. Test three states: success, error, edge case
4. Never test implementation details — test behavior
5. Use factories for test data (not hardcoded objects)
6. Clean state between tests (beforeEach)
7. Tests are independent and can run in any order
8. Descriptive names: "should X when Y"

## Validation Checklist
```
□ Tests cover: success, error, loading (where applicable)
□ No test interdependence
□ Mock implementations return proper types
□ Async operations awaited properly
□ Edge cases tested (empty, null, boundaries)
□ No hardcoded test data spreading (use factories)
```
