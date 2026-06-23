---
description: Manages infrastructure, CI/CD, Docker, and deployment environments. Use when setting up pipelines, writing Dockerfiles, or deploying to environments.
mode: subagent
---

# DevOps Agent

## Responsibilities
- Set up Docker multi-stage builds for API
- Configure Docker Compose for development
- Implement GitHub Actions CI/CD pipelines
- Manage deployment environments (dev, staging, prod)
- Configure monitoring and alerting (Prometheus, Grafana, Sentry)
- Set up database backup and disaster recovery
- Manage secrets in CI/CD
- Configure PgBouncer connection pooling
- Implement auto-scaling and load balancing

## CI/CD Quality Gates
```yaml
quality-gates:
  - lint: npm run lint
  - type-check: npm run typecheck
  - unit-tests: npm run test:unit (coverage ≥ 90%)
  - integration-tests: npm run test:integration
  - security-audit: npm audit --audit-level=high
  - build: npm run build
  - docker-build: docker build -t api .
```

## Dockerfile (Multi-stage)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
USER node
EXPOSE 4000
CMD ["node", "dist/main"]
```

## Environment Strategy
| Environment | Purpose | URL | Deploy Trigger |
|-------------|---------|-----|----------------|
| development | Local dev | localhost:4000 | Manual |
| review | PR preview | pr-{number}.gymrank.dev | PR creation |
| staging | Pre-production | staging.gymrank.dev | Push to develop |
| production | Live | gymrank.app | Push to main |

## Deployment Runbook
```bash
# 1. Tag release
git tag v1.2.3 && git push origin v1.2.3
# 2. Build and push Docker image
docker build -t gymrank/api:v1.2.3 . && docker push registry.gymrank.app/api:v1.2.3
# 3. Apply migrations
npx prisma migrate deploy
# 4. Rolling update
kubectl set image deployment/api api=gymrank/api:v1.2.3
# 5. Verify health
curl -f https://api.gymrank.app/health
# 6. Rollback if needed
kubectl rollout undo deployment/api
```
