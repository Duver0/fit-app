# Spec B — Mobile (Polling en lugar de WebSockets)

**Agente responsable:** `mobile`
**Depende de:** Spec A (especialmente `groupDisputes` si se implementa polling de disputas por grupo;
el resto usa queries ya existentes y es independiente).

---

## B-1. `apps/mobile/src/lib/apollo.ts` — solo HTTP

Reescribir el cliente para **eliminar** `graphql-ws`, `GraphQLWsLink`, `split`, `getMainDefinition`.

```ts
import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client'
import { onError } from '@apollo/client/link/error'
import { setContext } from '@apollo/client/link/context'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'

// Apunta a la función de Vercel (sobrescribible con EXPO_PUBLIC_API_URL).
const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://<tu-proyecto>.vercel.app/graphql'

const httpLink = createHttpLink({ uri: API_URL })

const authLink = setContext((_, { headers }) => {
  const token = useAuthStore.getState().token
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  }
})

let lastNetworkToastAt = 0
const errorLink = onError(({ networkError }) => {
  if (networkError) {
    const now = Date.now()
    if (now - lastNetworkToastAt > 5000) {
      lastNetworkToastAt = now
      useUIStore.getState().addToast({
        message: 'Error de conexión. Revisá tu internet e intentá de nuevo.',
        type: 'error',
      })
    }
  }
})

export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
})
```

- Borrar `WS_URL` y toda referencia a `createClient`/`GraphQLWsLink`.
- Cambiar el default de `API_URL` de `https://fit-app-api.fly.dev/graphql` al dominio de Vercel.

---

## B-2. Añadir `pollInterval` a los hooks de datos

Mapeo suscripción → query existente → hook a modificar:

| Suscripción original | Query equivalente | Hook a modificar | `pollInterval` sugerido |
|---|---|---|---|
| `performanceUpdated` | `RANKING_QUERY` | `apps/mobile/src/hooks/useRanking.ts` | 8000 ms |
| `rankingChanged` | `RANKING_QUERY` | `apps/mobile/src/hooks/useRanking.ts` | 8000 ms |
| `invitationReceived` | `MY_INVITATIONS_QUERY` | `apps/mobile/src/hooks/useInvitations.ts` | 10000 ms |
| `groupMemberEvent` | `MY_GROUPS_QUERY` + `GROUP_QUERY` | `useGroups.ts` (15000) y `useGroup.ts` (15000) | 15000 ms |
| `exerciseEvent` | `EXERCISES_QUERY` + `GROUP_QUERY` | `useExercises.ts` (15000) y `useGroup.ts` (15000) | 15000 ms |
| `disputeEvent` | `MY_DISPUTES_QUERY` y `GROUP_DISPUTES_QUERY`* | nuevo `useGroupDisputes` (10000) + `useMyDisputes` (10000) | 10000 ms |

* `GROUP_DISPUTES_QUERY` se crea en Spec A-5.

**Cambios concretos (añadir `pollInterval` al `useQuery`):**

- `apps/mobile/src/hooks/useRanking.ts` (líns ~10-13):
  ```ts
  const { data: rankingData, loading, error, refetch } = useQuery(RANKING_QUERY, {
    variables: { exerciseId, page: 1, limit: 100 },
    pollInterval: 8000,
  })
  ```
- `apps/mobile/src/hooks/useGroups.ts`:
  ```ts
  const { data, loading, error, refetch } = useQuery(MY_GROUPS_QUERY, { pollInterval: 15000 })
  ```
- `apps/mobile/src/hooks/useGroup.ts`:
  ```ts
  const { data, loading, error, refetch } = useQuery(GROUP_QUERY, {
    variables: { id: groupId }, skip: !groupId, pollInterval: 15000,
  })
  ```
- `apps/mobile/src/hooks/useExercises.ts`:
  ```ts
  const { data, loading, error, refetch } = useQuery(EXERCISES_QUERY, {
    variables: { groupId }, skip: !groupId, pollInterval: 15000,
  })
  ```
- `apps/mobile/src/hooks/useInvitations.ts`:
  ```ts
  const { data, loading, error, refetch } = useQuery(MY_INVITATIONS_QUERY, { pollInterval: 10000 })
  ```

**Disputas (depende de A-5):** crear `apps/mobile/src/hooks/useGroupDisputes.ts`:
```ts
import { useQuery } from '@apollo/client'
import { GROUP_DISPUTES_QUERY } from '../lib/graphql'

export function useGroupDisputes(groupId: string | null) {
  const { data, loading, error, refetch } = useQuery(GROUP_DISPUTES_QUERY, {
    variables: { groupId }, skip: !groupId, pollInterval: 10000,
  })
  return { disputes: data?.groupDisputes || [], isLoading: loading, error, refetch }
}
```
Y, si existe pantalla de "mis disputas", añadir `useMyDisputes` con `MY_DISPUTES_QUERY` + `pollInterval: 10000`.
(`MY_DISPUTES_QUERY` hoy solo se usa en el hook de suscripción que se borra; ver B-3.)

---

## B-3. Eliminar archivos de suscripción (código muerto)

**Importante:** `RealtimeProvider` y `useRealtime` **no están montados en ningún componente**
(grep solo los encuentra en sus propios archivos). Se borran sin impacto funcional.

Borrar:
- `apps/mobile/src/hooks/usePerformanceSubscription.ts`
- `apps/mobile/src/hooks/useRankingSubscription.ts`
- `apps/mobile/src/hooks/useInvitationSubscription.ts`
- `apps/mobile/src/hooks/useGroupMemberSubscription.ts`
- `apps/mobile/src/hooks/useExerciseSubscription.ts`
- `apps/mobile/src/hooks/useDisputeSubscription.ts`
- `apps/mobile/src/hooks/useRealtime.ts`
- `apps/mobile/src/components/RealtimeProvider.tsx`

Verificar que no quede ningún `import` colgante:
```bash
grep -rn "useSubscription\|useRealtime\|RealtimeProvider\|Subscription}" apps/mobile/src
```
Debe quedar vacío (salvo las definiciones de `*.ts:...SUBSCRIPTION` en `graphql.ts`, que se borran en B-4).

---

## B-4. Limpiar `apps/mobile/src/lib/graphql.ts`

Eliminar el bloque de suscripciones (desde el comentario `// Subscriptions (Real-time via WebSocket)`
en la línea ~754 hasta el final del archivo), incluyendo:
`PERFORMANCE_UPDATED_SUBSCRIPTION`, `RANKING_CHANGED_SUBSCRIPTION`,
`INVITATION_RECEIVED_SUBSCRIPTION`, `GROUP_MEMBER_EVENT_SUBSCRIPTION`,
`EXERCISE_EVENT_SUBSCRIPTION`, `DISPUTE_EVENT_SUBSCRIPTION`.

Añadir `GROUP_DISPUTES_QUERY` (definida en B-2 / A-5).

---

## B-5. Riesgos y límites del cliente

| Riesgo | Mitigación |
|---|---|
| Aumento de requests (polling) | Usar intervalos moderados (8-15s) y `cache-and-network`. No bajar de 5s. |
| `pollInterval` en pantallas no montadas | Apollo cancela el polling al desmontar; no hay fugas. |
| Token expirado en polling | `authLink` relee el store en cada request; si expiró, el backend responde 401 y el `errorLink` avisa. |
| `MY_DISPUTES_QUERY` sin consumidor | Crear `useMyDisputes` o usarlo en la pantalla de disputas; si no, el polling de disputas queda solo a nivel grupo. |

---

## B-6. Tests sugeridos (ver `05-tests.md`)
- `apollo.ts` no importa `graphql-ws` (lint/typecheck).
- `useRanking`/`useGroups`/etc. usan `pollInterval` (snapshot de opciones o test unitario del hook).
- No existen referencias a `useSubscription` en el bundle.
