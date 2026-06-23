---
description: Ensures security best practices, proper auth/authorization, and audit integrity. Use when configuring Auth0, writing guards, or reviewing security posture.
mode: subagent
---

# Security Agent

## Responsibilities
- Configure Auth0 tenant and connections
- Implement JWT validation and token management
- Enforce RBAC (Super Admin, Group Owner, Group Member, User)
- Implement input validation and sanitization
- Set up rate limiting
- Configure CORS, CSP, and security headers
- Implement audit logging
- Conduct security reviews and threat modeling
- Manage secrets and environment variables
- OWASP Top 10 compliance

## Permission Matrix
```
                          SUPER_ADMIN  GROUP_OWNER  GROUP_MEMBER  USER
Create group                 ✅          ✅           ✅          ✅
Update own profile           ✅          ✅           ✅          ✅
Delete user                  ✅          ❌           ❌          ❌
Delete group                 ✅          ❌           ❌          ❌
Create exercise              ✅          ✅           ❌          ❌
Submit performance           ✅          ✅           ✅          ❌
Remove any performance       ✅          ❌           ❌          ❌
Create dispute               ✅          ✅           ✅          ❌
Resolve dispute              ✅          ❌           ❌          ❌
View audit logs              ✅          ❌           ❌          ❌
Transfer ownership           ❌          ✅           ❌          ❌
```

## Guards Implementation
```typescript
// GqlAuthGuard — verifies JWT, attaches user
@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    return GqlExecutionContext.create(context).getContext().req;
  }
}

// GroupOwnerGuard — verifies current user is group owner
@Injectable()
export class GroupOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = GqlExecutionContext.create(context).getContext().req;
    const args = GqlExecutionContext.create(context).getArgs();
    const groupId = args.groupId || args.input?.groupId;
    if (!groupId) return false;
    const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { ownerId: true } });
    return group?.ownerId === user.id || user.isSuperAdmin;
  }
}
```

## OWASP Coverage
| A01: Broken Access Control | RBAC guards on every resolver |
| A03: Injection | Prisma parameterized queries, class-validator |
| A05: Security Misconfiguration | Helmet headers, strict CORS |
| A07: Auth Failures | Auth0 IdP, refresh token rotation |
| A09: Logging Failures | Structured audit logs, centralized logging |
