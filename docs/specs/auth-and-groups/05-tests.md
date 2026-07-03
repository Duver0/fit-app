# Auth & Groups — Tests

> **Status: ✅ COMPLETADO** — 4 suites de tests con 20 tests unitarios pasando (AuthService, GroupsService, PerformanceService, DisputesService). Jest configurado en `apps/api/`.

## Objetivo
Garantizar la calidad de cada capa mediante unit tests, integration tests y E2E tests.

## Dependencias
- Todas las specs anteriores deben estar implementadas.

---

## Estrategia de testing

| Capa | Framework | Coverage esperado |
|---|---|---|
| Backend (services) | Jest | 90%+ |
| Backend (resolvers) | Jest + Apollo Testing | 85%+ |
| Backend (guards) | Jest | 100% |
| Frontend (hooks) | Vitest + React Testing Library | 85%+ |
| Frontend (screens) | Vitest + React Testing Library | 70%+ |
| Frontend (stores) | Vitest | 90%+ |
| E2E | Cypress | Happy paths críticos |

---

## 01 — Backend Unit Tests

### AuthService
| Test | Descripción |
|---|---|
| `register: crea usuario con password hasheado` | Mock bcrypt.hash, verificar passwordHash en DB |
| `register: error si email ya existe` | Mock findUnique devuelve usuario → lanza ConflictException |
| `login: devuelve token válido` | Mock bcrypt.compare true, verificar JWT generado |
| `login: error si password incorrecto` | Mock bcrypt.compare false → UnauthorizedException |
| `login: error si no existe passwordHash` | Usuario sin passwordHash → UnauthorizedException |
| `validateUser: retorna usuario si existe` | Buscar por auth0Id → retorna User |
| `validateUser: lanza si no existe` | auth0Id no encontrado → UnauthorizedException |

### GroupsService
| Test | Descripción |
|---|---|
| `createGroup: crea grupo + owner membership` | Verificar Group y GroupMember creados |
| `createGroup: con avatar sube a disco` | Mock UploadService → verificar upload llamado |
| `updateGroup: owner puede editar` | Usuario es owner → éxito |
| `updateGroup: member NO puede editar` | Usuario es member → ForbiddenException |
| `deleteGroup: owner elimina su grupo` | Cascade check |
| `leaveGroup: member puede salir` | Verificar GroupMember eliminado + perfomances eliminadas |
| `leaveGroup: owner NO puede salir` | Lanza BadRequestException — debe transferir o eliminar |

### InvitationsService
| Test | Descripción |
|---|---|
| `inviteToGroup: crea invitación` | Verificar estado PENDING |
| `inviteToGroup: error si ya es miembro` | Email ya en GroupMember → lanza error |
| `acceptInvitation: crea GroupMember` | Cambia status a ACCEPTED + crea membership |
| `acceptInvitation: error si expirada` | Invitation expirada → lanza error |

### PerformanceService
| Test | Descripción |
|---|---|
| `upsertPerformance: crea nuevo record` | No existe previo → create |
| `upsertPerformance: actualiza existente` | Ya existe → update (mismo id) |
| `upsertPerformance: usuario no miembro` | No es miembro del grupo → ForbiddenException |

### RankingService
| Test | Descripción |
|---|---|
| `getRanking: ordena por value DESC` | Insertar 3 marcas con valores distintos → rank 1,2,3 |
| `getRanking: paginación correcta` | 10 marcas, page=1 limit=3 → 3 items, totalPages=4 |
| `getTop3: solo 3 mejores` | 5 marcas → solo 3 devueltas |

### DisputesService
| Test | Descripción |
|---|---|
| `createDispute: crea dispute + expiresAt` | expiresAt = now + 7 días |
| `createDispute: error si ya hay dispute OPEN` | Misma performance con OPEN → lanza error |
| `voteOnDispute: voto true lleva a 51%` | Mock con 3 miembros, 2 votan true → status APPROVED, record eliminado |
| `voteOnDispute: voto false no llega a 51%` | 3 miembros, 1 vota true → status OPEN |
| `voteOnDispute: upsert voto existente` | Mismo usuario vota otra vez → se actualiza |
| `DisputeResolutionProcessor: expira y rechaza` | <51% al expirar → REJECTED |
| `DisputeResolutionProcessor: expira y aprueba` | >=51% al expirar → APPROVED + record eliminado |

### Guards
| Test | Descripción |
|---|---|
| `GqlAuthGuard: token válido` | Mock JWT válido → permite acceso |
| `GqlAuthGuard: token inválido` | Mock JWT inválido → 401 |
| `RolesGuard: SUPER_ADMIN permitido` | user.role = SUPER_ADMIN → allow |
| `RolesGuard: USER denegado para admin` | user.role = USER → deny |
| `RolesGuard: OWNER check con groupId` | user es owner del groupId → allow |
| `RolesGuard: MEMBER check` | user es member → allow para [OWNER, MEMBER] |

---

## 02 — Backend Integration Tests

| Test | Descripción |
|---|---|
| `Register → Login → CreateGroup → Invite → Accept → UpsertPerformance → Ranking` | Happy path completo |
| `Dispute flow: crear marca → disputar → votar → 51% → marca eliminada` | Flujo completo de disputa |
| `Super Admin: eliminar grupo` | Verificar que grupo y relaciones se borran |

---

## 03 — Frontend Unit Tests

### Hooks
| Test | Descripción |
|---|---|
| `useAuth: login exitoso` | Mock Apollo mutation → verifica authStore se actualiza |
| `useAuth: login falla` | Mock error → verifica error state |
| `useGroups: carga grupos` | Mock query → verifica lista |
| `useGroups: error` | Mock error → verifica error state |
| `useRanking: ranking + myPerformance` | Mock query con datos → verifica orden |
| `useRanking: upsertPerformance` | Mock mutation → verifica refetch llamado |
| `usePWA: canInstall true` | Mock beforeinstallprompt → canInstall = true |
| `useDisputes: voto cambia estado` | Mock mutation → verifica dispute status |

### Stores
| Test | Descripción |
|---|---|
| `authStore: setAuth/clearAuth` | Verificar token y user se guardan/limpian |
| `themeStore: toggle dark/light` | Verificar isDark toggle |
| `uiStore: addToast/removeToast` | Verificar cola de toasts |

### Components
| Test | Descripción |
|---|---|
| `GroupCard: renderiza info` | Props name, avatar, memberCount → renderiza correctamente |
| `Podium: 3 posiciones` | Props con 3 usuarios → orden oro/plata/bronce |
| `RankingRow: muestra rank y valor` | Props con rank=1, value=100 → renderiza |
| `EmptyState: mensaje correcto` | Props message → se muestra |

---

## 04 — E2E Tests (Cypress)

| Test | Descripción |
|---|---|
| `Register → Login flow` | Llenar formulario, submit, redirect a groups list |
| `Register → Login flow` | Llenar formulario, submit, redirect a groups list |
| `Create group → se ve en lista` | Crear grupo, verificar que aparece |
| `Invite user → accept → se ve en miembros` | Flujo completo de invitación |
| `Owner crea ejercicio → se ve en dashboard` | Crear ejercicio, verificar top 3 empty |
| `User registra marca → se ve en ranking` | Upsert marca, ver ranking actualizado |
| `User disputa marca → voto → 51% elimina` | Flujo completo de disputa |
| `Super Admin elimina grupo` | Panel admin → eliminar → grupo ya no visible |
| `Dark mode toggle` | Toggle → verificar clases dark |
| `PWA install banner` | Verificar que banner aparece en web |
