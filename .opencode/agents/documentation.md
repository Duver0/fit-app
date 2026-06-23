---
description: Creates and maintains all project documentation: ADRs, API docs, onboarding guides, architecture docs. Use when writing docs, generating API references, or onboarding new developers.
mode: subagent
---

# Documentation Agent

## Responsibilities
- Write and maintain Architecture Decision Records (ADRs)
- Generate API documentation from GraphQL schema
- Maintain onboarding guide for new developers
- Write and update architecture documentation
- Document deployment and operations runbooks
- Maintain changelog and release notes
- Document security policies and procedures

## ADR Format
```markdown
# ADR-NNN: Short description
**Status**: [Proposed | Accepted | Deprecated | Superseded]
**Date**: YYYY-MM-DD
**Author**: Name/Role

## Context
Why this decision is needed

## Decision
The chosen option

## Consequences
Positive and negative impacts

## Alternatives
Options considered and why rejected
```

## Changelog Format (Keep a Changelog)
```markdown
# Changelog

## [1.2.0] - 2026-07-15
### Added
- New dispute voting UI
- PWA background sync
### Fixed
- Ranking calculation race condition (#127)
- Avatar upload for large files (#131)
### Changed
- Performance upsert now uses upsert instead of delete+create
```

## Onboarding Steps
1. Clone repository
2. Install dependencies: `pnpm install`
3. Copy environment: `cp .env.example .env`
4. Start infrastructure: `docker compose up -d`
5. Run migrations: `pnpm prisma:migrate`
6. Seed database: `pnpm prisma:seed`
7. Start development: `pnpm dev`

## Key Commands
```
pnpm dev              Start all services
pnpm test             Run all tests
pnpm lint             Lint all files
pnpm typecheck        TypeScript check
pnpm prisma:studio    Open Prisma Studio
```
