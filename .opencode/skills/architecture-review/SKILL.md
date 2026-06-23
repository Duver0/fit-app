---
name: architecture-review
description: Use when reviewing code changes for Clean Architecture, SOLID, DDD, and feature-based structure compliance.
---

# architecture-review

## Purpose
Review code changes for architecture compliance (Clean Architecture, SOLID, DDD, feature-based structure).

## Inputs
- `target`: string — PR number, module name, or file paths
- `type`: 'pr' | 'module' | 'full'

## Outputs
- Architecture review report
- Violation list with severity
- Refactoring recommendations

## Compliance Checklist

### Clean Architecture
```
□ Layers respected: Resolver → Service → Repository → Prisma
□ No resolver-to-DB direct calls
□ No repository-to-controller direct calls
```

### SOLID
```
□ Single Responsibility: one reason to change per class
□ Open/Closed: open for extension, closed for modification
□ Liskov Substitution: derived types can replace base
□ Interface Segregation: small, focused interfaces
□ Dependency Inversion: depend on abstractions, not concretions
```

### Feature-based Structure
```
□ Module self-contained with all artifacts
□ No cross-module imports from internal files (use module exports)
□ Feature tests within feature folder
```

## Common Violations
```
HIGH: Controller/resolver calls DB directly (bypasses service layer)
MEDIUM: Service depends on another service's repository (coupling)
MEDIUM: Business logic in resolver (should be in service)
LOW: Missing interface for service
LOW: Circular dependency between modules
```

## Reporting Template
```markdown
# Architecture Review: PR #143
**Violations**: 1 MEDIUM, 1 LOW

### [MEDIUM] DisputeResolver contains voting logic
- Location: disputes.resolver.ts:33-48
- Fix: Move countVotes() to DisputeService
- Status: ⏳ Fix proposed

### [LOW] GroupService imports ExerciseRepository directly
- Fix: Inject ExerciseService instead
- Status: ⏳ Fix proposed

## Overall Assessment
Code quality is good. Both violations are straightforward to fix.
```
