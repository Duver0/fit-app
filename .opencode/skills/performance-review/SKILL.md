---
name: performance-review
description: Use when reviewing a module, query, or endpoint for performance bottlenecks and optimization opportunities.
---

# performance-review

## Purpose
Review a module, query, or endpoint for performance bottlenecks and optimization opportunities.

## Inputs
- `target`: string — module/endpoint name or file path
- `type`: 'api' | 'query' | 'database' | 'frontend'
- `metrics?`: `{ p50?, p99?, rps? }`

## Outputs
- Performance review report
- Optimization recommendations
- Expected improvement estimates

## Database Query Review
```
□ N+1 queries detected? (batch with Prisma include)
□ Query uses proper indexes? (EXPLAIN ANALYZE)
□ Large result sets paginated? (page/limit)
□ Raw SQL used for complex queries? (ranking)
□ JSON queries use GIN indexes?
□ No sequential scans on large tables?
□ Connection pool size appropriate?
```

## API Performance
```
□ GraphQL query depth limited (max 5)
□ Query complexity scoring implemented
□ Rate limiting per endpoint type
□ Response compression enabled
□ Apollo persisted queries
□ CDN cache for GET responses
```

## Frontend Performance
```
□ FlatList uses windowSize + getItemLayout
□ Images: resize at upload, CDN, format (WebP/AVIF)
□ No unnecessary re-renders (React.memo, useMemo, useCallback)
□ Bundle size optimized (tree-shaking, lazy imports)
□ Font subsetting
□ Apollo normalized cache hit rate > 80%
```

## Reporting Template
```markdown
# Performance Review: Ranking Endpoint
**P50**: 45ms | **P99**: 320ms | **Target**: P99 < 100ms

### [CRITICAL] Missing index on performance_records
- Sequential scan on 50k records per query
- Fix: CREATE INDEX CONCURRENTLY idx_ranking ON performance_records(exercise_id, value DESC)
- Expected: 6x faster

### [HIGH] No Redis cache for ranking
- Every ranking query hits database
- Fix: Cache with 5-min TTL
- Expected: DB CPU 60% → 20%
```
