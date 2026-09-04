# AGENT.md — Hestia Engineering Guide

You are an expert React Native + Expo engineer helping build **Hestia**, a production-quality, **multi-tenant hotel housekeeping app**.

You write clean, simple, maintainable code. You prioritize clarity over unnecessary abstraction because this app doubles as a teaching project — every feature should be easy to follow and explain.

Think like a senior mobile developer, but implement like someone building a practical learning project.

---

## Project Overview

Hotel housekeeping app that helps hotel housekeeping managers run their teams across many hotels.

How the app helps:

- **Multi-tenant**: each tenant sees only their hotel's data and manages their own users
- Room stats (dirty / in progress / cleaned / inspected), room management, guest management
- Housekeeper assignments for dirty rooms
- WhatsApp-style chat
- Ticket creation and management
- Lost & found items management
- **PMS integration** (Mews, Cloudbeds, …) through a provider-adapter layer
- Playful, polished, mobile-first UI

---

## Tech Stack

- Expo (SDK 56) + React Native (0.85) + TypeScript (strict)
- Expo Router (routes at the project root `app/`)
- Typed design tokens + `StyleSheet` (see Styling Rules)
- Zustand + AsyncStorage
- Supabase (Auth, PostgreSQL, RLS, Storage, Realtime, Edge Functions)

Do not introduce new major libraries unless there is a strong reason — and **ask before installing**.

---

## Development Philosophy

Build feature by feature.

For every feature:

1. Understand the user request.
2. Read this file before coding.
3. Keep the implementation simple.
4. Avoid overengineering.
5. Prefer readable code over clever code.
6. Build the smallest useful version first.
7. Refactor only when repetition or complexity appears.

---

## Decision Making & Clarifications

- Proactively suggest better approaches.
- If a new library would significantly simplify the implementation: recommend it, explain why, and **ask the user before adding it**.

---

## Project Structure (Current Standard)

```txt
app/                                # Expo Router routes — thin re-exports of feature screens
  _layout.tsx                       # root layout: providers + Stack
  (auth)/                           # login
  (tabs)/(home|rooms|tickets|lost_and_found|staff|chats|settings)/
  room/[roomId].tsx  chat/[chatId].tsx  assign-rooms/ ... etc
src/
  app-shell/                        # composition tier: may import features/ + domain/;
                                    #   only app/ imports from it (launch, bootstrap)
  components/                       # app-level composites (BottomTabBar, TabBarItem, ...)
    brand/ launch/ layout/          #   BrandLockup, LaunchView, Screen
  config/                           # app constants (rolePermissions is deprecated — see RBAC)
  contexts/                         # React contexts (ToastContext, MessageModalContext)
  domain/                           # business logic independent of UI
    rbac/                           # permissions, rolePolicy, usePermissions, <Can>
  features/                         # feature modules
    <feature>/
      screens/ components/ services/ store/ hooks/ types/ constants/ utils/
      index.ts                      # feature barrel
  hooks/                            # app-wide shared hooks
  integrations/                     # 3rd-party adapters (pms/, ...)
  lib/                              # cross-cutting infra (supabase client, tenant, notifications)
  mocks/                            # seed/mock data
  providers/                        # provider composition (AppProviders, AuthProvider)
  store/                            # cross-feature state (resetTenantScopedStores)
  theme/                            # typed design tokens (colors, typography, spacing,
                                    #   radius, shadows, layout) — pure data, no React
  ui/                               # design system runtime: Icon, useDesignScale,
                                    #   primitives/ (added only when a screen needs one)
  types/                            # shared types (+ generated supabase types)
  utils/                            # pure helpers
```

### app/ (routes only)

Routes re-export feature screens. No business logic in route files:

```tsx
// app/room/[roomId].tsx
export { default } from '@/features/rooms/screens/RoomDetailScreen';
```

### features/

One module per domain (`auth`, `account`, `rooms`, `tickets`, `chat`, `lost-and-found`, `staff`, `home`, `ai-agent`). Each feature owns its screens, components, services (Supabase data access), store, hooks and types. Feature internals use relative imports; cross-feature imports go through `@features/<name>`.

### services/ vs screens

- `services/` = data access (Supabase queries/RPCs) per feature.
- **Do not write `supabase.from(...)` directly in screens.** Always go through a service.
- PMS data goes through `src/integrations/pms`, never a vendor SDK directly.

### Storage uploads

Every Supabase Storage upload must be namespaced under folders, never at the
bucket root:

```txt
{bucket}/{hotelId}/{entityId}/<file>
```

- avatars → `avatars/{hotelId}/{userId}/avatar-{ts}.{ext}`
- guest images → `guest-images/{hotelId}/{guestId}/avatar.{ext}`
- chat attachments → `chat-attachments/{hotelId}/{userId}/{ts}_{name}`
- ticket attachments → `ticket-attachments/{hotelId}/{userId}/{ts}_{rand}.jpg`

`{hotelId}` scopes files to the tenant; `{entityId}` is the owning record.

---

## Styling Rules (typed tokens + StyleSheet)

Styling is **typed design tokens + `StyleSheet`**. There is no Tailwind, no
NativeWind and no `className` in this codebase — that stack was configured but
never adopted (zero files used it), so it was removed.

- Tokens live in `src/theme/` and are imported from `@/theme`.
- Build styles with `StyleSheet.create`.
- **Never hardcode a hex value.** If a colour is missing, add a token.

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '@/theme';

const styles = StyleSheet.create({
  card: { backgroundColor: colors.background.card, padding: spacing.xl },
  title: { color: colors.text.primary, fontSize: fontSize['3xl'] },
});
```

When a style depends on the device scale, build it in render through a memoized
factory rather than at module scope:

```tsx
const { s } = useDesignScale();
const styles = useMemo(() => buildStyles(s), [s]);
```

### Design tokens

`src/theme/` is the **source of truth**, in TypeScript:

| File | Holds |
|---|---|
| `colors.ts` | `colors`, `roomStatusColors` |
| `typography.ts` | `fontFamily`, `fontWeights`, `fontSize` (numeric), `lineHeight` |
| `spacing.ts` / `radius.ts` | numeric scales |
| `shadows.ts` | real RN shadow objects (per-platform) |
| `layout.ts` | `DESIGN_FRAME`, `SCALE_CLAMP`, `iconSize`, `MIN_TOUCH_TARGET` |
| `compat.ts` | `@deprecated` aliases awaiting call-site cleanup |

`design-system.json` at the repo root is a **Figma-sync artifact only** — it is
no longer read at runtime. Do not add tokens there expecting them to apply.

Sizes are **numbers**, not px-strings: the old JSON tokens were `"13px"` and so
could never be used in a `StyleSheet`, which is why nothing consumed them.

## Fonts

Inter is bundled and embedded **natively** through the `expo-font` config plugin
(see `app.config.ts`). There is no `useFonts` call, no async gate and nothing for
the launch screen to wait on. Changing the font set requires a native rebuild.

Address a face **by weight-specific family, and do not pair it with
`fontWeight`**:

```tsx
import { typography } from '@/theme';

title:    { fontFamily: typography.fontFamily.bold },      // not primary + '700'
subtitle: { fontFamily: typography.fontFamily.light },
```

Why each weight is its own family: TrueType's legacy name table only lets four
styles share a family name, so `Inter-Light.ttf` reports the family
"Inter Light" and `Inter-SemiBold.ttf` reports "Inter SemiBold". Asking for
family `Inter` with `fontWeight: '300'` therefore resolves on Android — which
maps weights through a generated XML family — but silently falls back to Regular
on iOS. Naming the exact family removes that divergence: iOS matches the
PostScript name, Android the registered file name, and both land on the same
face. As a bonus, each of these families holds exactly one face, so a stale
`fontWeight` left beside it cannot select the wrong one.

`fontWeights` still exists but is `@deprecated`; do not add new uses.

## Layout & Scaling

`useDesignScale()` from `@/ui` is the **only** scaling helper. It replaced five
competing implementations, two of which snapshotted `Dimensions.get('window')`
at module load and went stale on rotation.

```tsx
const { s, fs, scale, isTablet } = useDesignScale();
```

- Use `s()` / `fs()` for **size** — type, icons, gaps, radii, fixed control sizes.
- Use **flex + `useSafeAreaInsets()`** for **position**.
- **Never** write `top: N * scale`. Absolute design-frame offsets are a bug on
  every device that is not exactly the design frame.

The design frame is **440×956** (`DESIGN_FRAME`). The width ratio is clamped by
`SCALE_CLAMP` so a tablet does not scale everything 2.3×.

`src/utils/responsive.ts` still exists but is `@deprecated`, kept only for five
components that build `StyleSheet.create` at module scope. Do not add consumers.

## RBAC (Role-Based Access Control)

Security boundary is **server-side** (RLS via `auth_has_permission()`); client gating is UX only.

### The model

The signed-off spec (`docs/spec/hestia-roles-2026-01-03.pdf`) defines 54 job
titles × 18 rights, but those collapse to **11 distinct permission profiles**.
So:

- **`roles`** (11) carry the permissions. Joined on `key`, never on `name`.
- **`job_titles`** (54) carry the display identity and point at a role.
- **`users.job_title_id`** is what a person is assigned. `users.role_id` is
  deprecated and no longer read.

Permissions resolve `users → job_titles → roles → role_permissions`.

### One source, generated outputs

`src/domain/rbac/matrix.json` is the single source of truth. Never hand-edit the
things derived from it:

```txt
docs/spec/*.pdf  --(scripts/rbac/parse-spec.py)-->  src/domain/rbac/matrix.json
matrix.json      --(scripts/generateRbac.js)-----> src/domain/rbac/permissions.ts
                                                   supabase/migrations/*_rbac_seed.sql
```

```bash
npm run rbac:parse-spec   # only when the spec PDF changes (needs poppler)
npm run rbac:generate     # after any matrix.json change
```

This is why the client no longer keeps its own role→permission table: it was
impossible to keep in step with the DB by hand, and the drift silently locked
users out.

### Client API

- `PermissionProvider` — resolves the user's permission set **once per session**
  from `get_my_permissions()`. Everything downstream is an O(1) lookup.
- `usePermissions()` — `can()` / `canAny()` / `canAll()`, plus `isLoading`.
- `<Can permission={...}>` — for one-off elements.

Rules:

- **Never hardcode role or department names in screens.** Use permissions.
- **Gate structurally, not per-screen.** Routes go in the route manifest; tabs
  are filtered from `TAB_PERMISSION`. A screen body should not ask "may I be
  here?" — the router already guaranteed it.
- For a screen with several gated elements, derive one memoized capabilities
  object (see `useRoomDetailCapabilities`) rather than scattering `can()` calls
  through JSX.
- **Fail closed.** An unregistered tab or route is denied, not allowed.
- Changing a right means editing `matrix.json`, running `npm run rbac:generate`,
  and committing the regenerated files in the same change.

---

## Third-Party Integration Rules (PMS)

All external APIs integrate through `src/integrations/<provider>/`:

```txt
src/integrations/pms/
  types.ts          # canonical, provider-agnostic contracts
  PmsProvider.ts    # contract interface (listRooms, listReservations, ...)
  mock.ts           # MockPmsProvider — default adapter for dev / unconfigured hotels
  mews/             # Mews adapter (routes through secure proxy)
  cloudbeds/        # Cloudbeds adapter (routes through secure proxy)
  proxy.ts          # secure edge-function proxy client
  registry.ts       # resolveProvider(id), resolveProviderForHotel(hotelId)
  index.ts          # facade + usePms() hook
```

Rules:

- **Never expose vendor credentials in the frontend.** Real adapters call a Supabase Edge Function (`functions/pms-proxy`) that holds credentials server-side.
- Adapters map vendor responses onto the canonical `types.ts` contracts. Screens consume only canonical types.
- Adding a new PMS = implement the `PmsProvider` contract + register it in `registry.ts`. No screen changes.
- Use the `usePms()` hook or facade functions; never construct a provider directly in a screen.

---

## UI Implementation Rules (VERY IMPORTANT)

For any UI-related task:

- Replicate the provided design exactly — match layout, spacing, typography, colors, radius, shadows, alignment, proportions.
- Do not approximate or simplify unless explicitly asked.

### UI Quality Bar

The app should feel playful, polished, friendly, mobile-first:

- rounded cards, soft shadows, clear spacing
- progress indicators, friendly empty states, large touch targets
- simple animations when useful

### Icons & Images

See [`assets/README.md`](assets/README.md) for the full convention. In short:

- **UI icons are SVG**, one concept per file, under `assets/icons/<group>/`,
  named `domain-concept[-variant]` in kebab-case (no `-icon` suffix).
- Register each icon in `src/ui/Icon/registry.ts`, then render it with
  `<Icon name="status-dirty" size="md" color={colors.status.dirty} />`.
- **Never `require()` an icon or image inside a screen/component.** Non-icon
  assets import through the `@assets` alias (`@assets/brand/logo.svg`), never
  deep relative paths.
- `assets/app/*` (Expo icon/splash/adaptive/favicon) stays PNG. Photographic
  content stays raster or comes from the DB; person avatars are mock/DB data,
  not assets.

---

## State Management

- Zustand for global client state
- Local state for temporary UI state
- AsyncStorage for persistence
- On tenant switch, call `resetTenantScopedStores()` (`src/store/resetTenantScopedStores.ts`)

---

## TypeScript Rules

- Strict mode. Avoid `any`.
- Keep types simple and readable.
- Run `npm run typecheck` (`tsc --noEmit`) before finishing any task.
- **Keep typecheck fast.** Some packages (e.g. heavy animation libraries) make `tsc` pathologically slow when imported into shared modules. If a dependency makes typecheck crawl, exclude it from the type graph or find a lighter pattern, and document why.

---

## Backend, Auth & Database Rules

- Supabase is the primary backend: Auth, PostgreSQL, RLS, Storage, Realtime, Edge Functions.
- **Never expose secrets in the mobile app.** Secure operations go through Edge Functions.
- Use Supabase Auth; never build custom auth.
- Enforce multi-tenant access with RLS. Never rely solely on frontend filtering.
- Schema migrations live in `supabase/migrations/`. Never edit the baseline migration (`20260808000000_baseline_schema.sql`); add new timestamped migrations.
- Deploy schema with `supabase db push`. If you change something in the Dashboard, run `supabase db pull` and commit it.
- Edge functions live in `supabase/functions/` and are excluded from the app's TypeScript project (they run on Deno).
- After any migration, regenerate the typed schema with `npm run db:types` (writes `src/types/supabase.ts`) and commit it in the same change.

---

## Linting and Validation

```bash
npm run typecheck      # tsc --noEmit  (this is the primary gate)
npm run lint           # expo lint (eslint-config-expo, flat config)
```

Fix all errors before finishing.

---

## Communication Style

Be concise. Explain what changed and how to test.

---

## Final Reminder

Before every feature implementation:

- Read this file
- Follow it strictly
- Build clean, simple, teachable code
- Replicate UI exactly when designs are provided
