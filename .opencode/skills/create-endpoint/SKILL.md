---
name: create-endpoint
description: Use when generating a GraphQL resolver or REST endpoint with validation, authorization, and tests.
---

# create-endpoint

## Purpose
Generate a complete API endpoint (GraphQL resolver or REST controller) with validation, authorization, and tests.

## Inputs
- `module`: string — module name (e.g., "groups")
- `type`: 'query' | 'mutation' | 'rest'
- `name`: string — operation name (e.g., "createGroup")
- `input`: `{ name, fields: [{ name, type, required }] }`
- `returnType`: string
- `authRequired`: boolean (default: true)
- `roles?`: string[] — required roles
- `groupOwnerGuard?`: boolean (default: false)
- `validateInput`: boolean (default: true)

## Outputs
- GraphQL resolver method in `{module}.resolver.ts`
- DTO input class in `{module}/dto/`
- Service method (if not exists)
- Test file update
- GraphQL SDL or REST route documentation

## Best Practices
1. All endpoints require authentication by default
2. Resolver methods are thin — delegate to service
3. Input DTOs validated with class-validator decorators
4. Return types match GraphQL schema
5. Error handling via exceptions (never catch-and-return-200)
6. Audit log for all state-changing operations
7. Rate limiting applied based on endpoint sensitivity
8. Cache GET-type queries where appropriate

## Validation Checklist
```
□ Endpoint has proper @UseGuards auth guard
□ DTO has @InputType() and field decorators
□ Validation rules: @IsString, @IsOptional, @Min, @Max, etc.
□ Resolver has @Mutation() or @Query() decorator
□ Service has unit test
□ Integration test covers: success + validation error + auth error
□ Audit logging added for mutations
```
