---
name: deployment-review
description: Use when reviewing deployment configurations, Dockerfiles, CI/CD pipelines, and infrastructure code for correctness and security.
---

# deployment-review

## Purpose
Review deployment configurations, Dockerfiles, CI/CD pipelines, and infrastructure code for correctness and security.

## Inputs
- `target`: string — PR number, environment, or file paths
- `environment`: 'development' | 'staging' | 'production'

## Outputs
- Deployment review report
- Infrastructure issues
- Security misconfigurations
- Optimization recommendations

## Review Areas

### Docker
```
□ Multi-stage build (builder → production)
□ No root user in production containers
□ Image size optimized (alpine, .dockerignore)
□ Health check configured
□ Resource limits set
□ No secrets in build args
```

### CI/CD
```
□ Secrets stored in GitHub secrets (not in YAML)
□ Cache npm/pnpm dependencies
□ Test database isolated per run
□ Quality gates enforced
□ Manual approval for production
□ Rollback procedure documented
```

### Infrastructure
```
□ Environment variables validated at startup
□ Database migrations as separate step
□ Health check responds correctly
□ Readiness probe configured
□ No public exposure of internal ports
```

### Security
```
□ No hardcoded secrets in Dockerfile or compose
□ CORS restricts to known origins
□ Rate limiting enabled
□ TLS/SSL configured
```

## Reporting Template
```markdown
# Deployment Review: Production v1.2.0
**Issues**: 1 HIGH, 2 LOW

### [HIGH] Root user in production container
- docker/Dockerfile.api:20 — `USER root`
- Fix: Switch to non-root before CMD
- Status: ✅ Fixed

### [LOW] No resource limits for Redis
- docker-compose.yml:15
- Fix: Add deploy.resources.limits
- Status: ⏳ Scheduled

## Configuration
✅ Multi-stage build, non-root
✅ CI quality gates pass
✅ Rollback prepared
```
