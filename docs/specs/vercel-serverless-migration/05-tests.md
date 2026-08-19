# Spec 05 — Tests y verificación

Valida que la migración eliminó WebSockets y que el polling funciona contra la función de Vercel.

## Backend (NestJS)
- **Compilación/arranque:** `AppModule` se instancia sin `SubscriptionsModule` ni `PubSubModule`;
  `GraphQLModule` no declara `subscriptions`. (`nest build` o typecheck debe pasar).
- **Sin WS en schema:** el SDL generado (`autoSchemaFile: true`) NO contiene tipo `Subscription`
  ni las 6 suscripciones (`performanceUpdated`, `rankingChanged`, `invitationReceived`,
  `groupMemberEvent`, `exerciseEvent`, `disputeEvent`).
- **Handler serverless:** `api/graphql.ts` exporta `default async (req,res)`. Un test de integración
  levanta la app con `ExpressAdapter` y hace `POST /graphql` con `{ __typename }` → 200.
- **groupDisputes:** query devuelve disputas filtradas por `groupId` (incluye `votes`, `performance`).

## Mobile (Expo/RN)
- **apollo.ts:** typecheck confirma que no importa `graphql-ws`/`GraphQLWsLink`/`split`.
- **Sin useSubscription:** `grep -rn "useSubscription" apps/mobile/src` queda vacío.
- **Polling:** tests unitarios de `useRanking`, `useGroups`, `useGroup`, `useExercises`,
  `useInvitations` (y `useGroupDisputes`) confirman `pollInterval` en las opciones de `useQuery`.
- **Build web:** `EXPO_PUBLIC_API_URL` apunta a `https://<proyecto>.vercel.app/graphql`.

## DevOps / E2E
- **Deploy:** `vercel deploy` aplica migraciones (`prisma migrate deploy`) sin error en build.
- **HTTP GraphQL:** `curl -X POST https://<proyecto>.vercel.app/graphql` responde para una query
  simple; `/graphql` (rewrite) también funciona.
- **CORS:** una petición desde el origen web/devuelve headers `Access-Control-Allow-Origin`.
- **Polling real:** con la app móvil, crear una performance/disputa/invitación desde otro usuario y
  verificar que la UI del primero se actualiza dentro del `pollInterval` (sin WS).

## Database
- `prisma validate` con `binaryTargets` nuevos.
- `prisma generate` produce cliente con engine `rhel-openssl-3.0.x`.
- `prisma migrate deploy` es idempotente (2 corridas seguidas no fallan).
