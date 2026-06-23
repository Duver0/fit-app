---
name: security-review
description: Use when performing a security review of a module, endpoint, or feature against OWASP Top 10 and project security requirements.
---

# security-review

## Purpose
Perform a security review of a module, endpoint, or feature against OWASP Top 10 and project-specific security requirements.

## Inputs
- `target`: string — module/feature name or file path
- `scope`: 'full' | 'auth' | 'input' | 'data' | 'config'
- `threatModel`: boolean (default: false)

## Outputs
- Security review report with findings
- Risk ratings (Critical, High, Medium, Low)
- Remediation recommendations
- Threat model diagram (if requested)

## Key Checklist Areas

### Authentication
```
□ JWT validated on every request (except public endpoints)
□ Token signature verified (RS256, JWKS endpoint)
□ Token expiry checked (iat, exp claims)
□ Refresh token rotation enabled
□ MFA enforced for admin accounts
```

### Authorization
```
□ RBAC guards on all mutations
□ GroupOwnerGuard checks ownership correctly
□ Super admin actions restricted to isSuperAdmin = true
□ No privilege escalation paths
□ User can only access own data (unless role allows)
```

### Input Validation
```
□ All DTOs validated with class-validator
□ GraphQL variables validated
□ File upload: type (magic bytes), size limit (5MB)
□ SQL injection impossible (Prisma parameterized queries)
□ No eval() or dynamic require()
```

### Risk Rating
```
Critical: Remote code execution, auth bypass, data exfiltration
High: Privilege escalation, SQL injection, XSS (persistent)
Medium: Information disclosure, CSRF, missing rate limiting
Low: Missing security headers, verbose error messages
```

## Reporting Template
```markdown
# Security Review: [Module]
**Date**: YYYY-MM-DD | **Scope**: ...

## Summary
- Critical: 0 | High: 1 | Medium: 2 | Low: 3

## Findings
### [HIGH] Missing GroupOwnerGuard on deleteExercise
- Location: exercises.service.ts:45
- Issue: Any authenticated user can delete
- Remediation: Add @UseGuards(GroupOwnerGuard)
- Status: ✅ Fixed

## Conclusion
Module is generally secure. All critical and high findings addressed.
```
