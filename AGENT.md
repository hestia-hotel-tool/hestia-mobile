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
- Tailwind CSS v4 via **NativeWind v5 + react-native-css** (see Styling Rules)
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
  _layout.tsx                       # root layout: providers + Stack + global.css import
  (auth)/                           # login
  (tabs)/(home|rooms|tickets|lost_and_found|staff|chats|settings)/
  room/[roomId].tsx  chat/[chatId].tsx  assign-rooms/ ... etc
src/
  components/                       # shared UI — ui/ layout/ feedback/ Icon/ (barrel: @/components)
  config/                           # app constants
  constants/                        # shared constants (images.ts, ...)
  contexts/                         # React contexts (ToastContext, MessageModalContext)
  domain/                           # business logic independent of UI
    rbac/                           # permissions (generated), routePermissions, RouteGuard, usePermissions, <Can>
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
  theme/                            # design tokens, JS side (loads design-system.json)
  tw/                               # CSS-enabled wrappers (View, Text, Image, ...)
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

## Styling Rules (Tailwind v4 via NativeWind v5)

**Migration in progress.** The app is moving from `StyleSheet` to `className`.
Both idioms exist right now; a screen converts when it is refactored, not before.

- **New shared components and refactored screens: `className`.** Import the CSS
  wrappers from `src/tw/` (`View`, `Text`, `ScrollView`, `Pressable`, `TextInput`,
  `Link`, `TouchableHighlight`) and `Image` from `src/tw/image`.
- **Everything else: leave it on `StyleSheet`** until its turn. Do not convert a
  screen you are only passing through.

Migrated so far: `src/components/ui/*`, `src/components/Icon/*`,
`src/features/home/components/{CategoryCard,HomeHeader,HousekeepingDashboard,FloorsFilterSheet}`,
`src/features/auth/screens/SplashScreen`.

Key setup:

- `src/global.css` — **generated**, see Design tokens below. Imported once in
  `app/_layout.tsx`.
- No `tailwind.config.js` and no NativeWind Babel plugin — Tailwind v4 is
  configured through CSS and `metro.config.js` (`withNativewind`).

Usage:

```tsx
import { View, Text } from '@/tw';

<View className="flex-1 bg-surface-secondary p-lg">
  <Text className="font-hestia-primary text-ink-primary font-bold">Hello</Text>
</View>;
```

### Layout

Use flex and `gap` with spacing tokens. **Do not** position against the 440x956
design frame with `* scaleX` — that pattern is being removed. `useDesignScale()`
survives only for screens not yet migrated.

### Style exceptions

Use `StyleSheet` / inline styles when:

- The value is computed at runtime (animated values, a diameter from a prop)
- The component has no CSS wrapper (`SafeAreaView`, `KeyboardAvoidingView`,
  `Modal`) — or wrap it in `src/tw/` first
- Platform-specific props, or shadow syntax that differs per platform

### Shared components

`src/components/` is grouped: `ui/` (visual primitives), `layout/` (app chrome),
`feedback/` (overlays), `Icon/`. Import from `@/components`.

Anything only one feature uses belongs in that feature, not here.

### Design tokens

`design-system.json` (repo root) is the single source of truth.

```bash
npm run tokens:generate   # design-system.json -> src/global.css
npm run icons:generate    # assets/icons/**.svg -> src/components/Icon/registry.ts
```

**Never hand-edit `src/global.css` or `Icon/registry.ts`** — they are generated,
and the previous hand-mirroring drifted badly (the CSS lost the entire spacing
scale, 7 radii and 3 font sizes, and contradicted the JSON on font family).

Token names map onto Tailwind utilities. `text` and `background` are renamed to
`ink` and `surface` so utilities do not stutter:

| JSON | Token | Utility |
|---|---|---|
| `colors.text.primary` | `--color-ink-primary` | `text-ink-primary` |
| `colors.background.card` | `--color-surface-card` | `bg-surface-card` |
| `colors.status.dirty` | `--color-status-dirty` | `bg-status-dirty` |
| `spacing.lg` | `--spacing-lg` | `p-lg`, `gap-lg` |
| `borderRadius.xl` | `--radius-xl` | `rounded-xl` |
| `typography.fontSizes.lg` | `--text-hestia-lg` | `text-hestia-lg` |

The JS API is unchanged — `colors.text.primary` still reads from the same JSON
via `src/theme`.

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
- Render with `<Icon name="status-dirty" size={20} color={colors.status.dirty} />`.
  The registry is generated — see below.
- **Never `require()` an icon or image inside a screen/component.** Non-icon
  assets import through the `@assets` alias (`@assets/brand/logo.svg`), never
  deep relative paths.
- `assets/app/*` (Expo icon/splash/adaptive/favicon) stays PNG. Photographic
  content stays raster or comes from the DB; person avatars are mock/DB data,
  not assets.

#### ALWAYS check before downloading an icon

**Check the registry first. Do not export an icon from Figma that already exists.**

```bash
npm run icons:list          # every registered icon, by group
```

Then, in order:

1. **Is the concept already registered?** Reuse it. The same glyph appears in
   many designs — `action-search` serves the Home search bar, the chat header,
   the reassign panel and the staff picker. One file, many call sites.
2. **Is it the same concept under a different name?** Reuse the registered one
   and do not add a synonym. The old PNG folder is a warning: it accumulated
   `flag.png` next to `flag-icon.png`, `priority-icon.png` next to
   `prioirty-icon.png` next to `priority-status.png`, `settings-icon.png` next
   to `setting-icon.png`, and `laundry-icon.png` byte-identical to
   `thumbs-up-icon.png`. 117 PNGs collapse to roughly 60 real concepts.
3. **Does it differ only in colour or size?** Reuse it and pass `size` / `color`.
   Never commit a second file for a recolour.
4. **Only if genuinely new**, export it from Figma and add it.

Adding a genuinely new icon:

```bash
# 1. export the SVG from Figma into a scratch dir, then normalise it
node scripts/normalizeSvg.js <file>.svg --mono '#5A759D'   # single-colour only
# 2. move it to the right group, named domain-concept
mv <file>.svg assets/icons/<group>/
# 3. regenerate the registry
npm run icons:generate
```

`--mono` rewrites the listed colours to `currentColor` so `<Icon color=…>` tints
the glyph. **Do not pass it for two-tone brand marks** (`nav-home`,
`nav-lost-found`, the Hestia logo) — flattening them to one colour destroys the
mark. `<Icon>` warns in dev if you pass `color` to one of those.

Icons keep their natural aspect ratio: `<Icon size={n}>` sets the height and
derives width from the viewBox, so a 28×14 glyph renders 28×14, not 14×14.

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
- **Keep typecheck fast.** Some packages make `tsc` pathologically slow when imported into shared modules. If a dependency makes typecheck crawl, exclude it from the type graph or find a lighter pattern, and document why. Measure before assuming — `react-native-reanimated` was long suspected here and, when finally added, moved typecheck from 10.68s to 9.66s, i.e. not at all.

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

## Cross-Platform Rule (iOS AND Android)

**Every change must work on both platforms. Never verify only the one you happen
to be running.** This app ships to both; a change that builds on iOS and breaks
on Android is not done.

### Verify both, every time

```bash
npm run typecheck
npx expo export --platform ios
npx expo export --platform android
```

**Typecheck is not enough, and neither is the bundler's exit code.**

- `tsc` does not check `require()` of an image. Moving a file with
  `require('../../assets/…')` in it type-checks perfectly and fails at bundle
  time. Use the `@assets` alias so paths survive moves.
- An export can **succeed while silently compiling no CSS at all**, producing a
  screen with no styling. Confirm the output actually contains your work:

  ```bash
  strings <output>/_expo/static/js/<platform>/*.hbc | grep -c "bg-status-dirty"
  ```

  Validate the check itself with a string you know is present, so a zero means
  "missing", not "grep cannot read this file".

### Where the platforms diverge

- **Fonts.** Helvetica and Inter exist on iOS; Android has neither, and this app
  bundles no font files. Resolved centrally — `src/theme` uses `Platform.select`
  and `global.css` has an `@media android` block — so **use
  `typography.fontFamily` or `font-hestia-*`, never a literal font name.** An
  unrecognised family on Android also makes `fontWeight` unreliable.
- **Shadows.** iOS reads `shadow*`; Android needs `elevation`. Set both.
- **Rounded corners.** Android does not clip children to `borderRadius` — add
  `overflow: 'hidden'` when a child (an image, usually) must be clipped.
- **Safe areas.** Use `useSafeAreaInsets()`. Do not hardcode a status-bar height.
- **Native modules** (reanimated, worklets, svg, …) need
  `npx expo prebuild` and a rebuild of **both** dev clients. A JS reload will not
  pick them up, and "works on my simulator" usually means only one was rebuilt.

### When you cannot test both

Say so explicitly and name what is unverified. Do not imply parity you have not
checked.

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

Before calling anything done:

- `npm run typecheck` and `npm run lint` clean
- **Bundle for iOS *and* Android**, and confirm the output contains your change
  — see the Cross-Platform Rule. Exit code alone is not evidence.
