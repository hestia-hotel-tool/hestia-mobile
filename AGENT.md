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
  components/                       # shared UI (BottomTabBar, TabBarItem, ...)
  config/                           # app constants (rolePermissions is deprecated — see RBAC)
  constants/                        # shared constants (images.ts, ...)
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
  theme/                            # design tokens (loads design-system.json)
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

The app uses **Tailwind CSS v4 + NativeWind v5 + react-native-css**. Styling is **CSS-first** — `className` on components.

Key setup:

- `src/global.css` — imports the Tailwind layers, defines Hestia design tokens via `@theme`. This is imported once in `app/_layout.tsx`.
- `src/tw/` — CSS-enabled wrapper components (`View`, `Text`, `ScrollView`, `Pressable`, `TextInput`, `Image`, `Link`, `TouchableHighlight`). **Import these instead of the raw RN components when using `className`.**
- No `tailwind.config.js` and no NativeWind Babel plugin — Tailwind v4 is configured through CSS and `metro.config.js` (`withNativewind`).

Usage:

```tsx
import { View, Text } from '@/tw';

<View className="flex-1 bg-bg-secondary p-4">
  <Text className="text-text-primary font-bold">Hello</Text>
</View>;
```

### Style exceptions

Use `StyleSheet` / inline styles when:

- The component has no CSS wrapper (`SafeAreaView`, `KeyboardAvoidingView`, `Modal`, native `Button`) — or wrap it in `src/tw/` first
- The value is dynamic/calculated at runtime (animated values, transforms, pressed states)
- Platform-specific props (iOS-only / Android-only)
- Shadow syntax differs per platform

When in doubt, ask: *"Should this use Tailwind classes or StyleSheet?"*

### Global utilities

Prefer reusable class patterns as utilities in `global.css`. If there is no utility for a repeated pattern, add one there following BEM conventions.

### Design tokens

Hestia design tokens live in `design-system.json` (project root, loaded via `src/theme/index.ts`). The same colors are mirrored as Tailwind theme vars in `src/global.css`. **Keep them in sync** when `design-system.json` changes.

---

## RBAC (Role-Based Access Control)

Security boundary is **server-side** (RLS + Edge Functions); client gating is UX only.

Source of truth is the database: `roles`, `permissions`, `role_permissions` tables (see `scripts/seedRolesAndPermissions.js`).

The client mirrors this in `src/domain/rbac/`:

- `permissions.ts` — canonical permission keys (e.g. `'tab.home.view'`, `'rooms.assign'`)
- `rolePolicy.ts` — role → permission set, kept in sync with the DB seed
- `usePermissions()` — resolves the current user's role + permissions, exposes `can()` / `canAny()` / `canAll()`
- `<Can permission={...}>` — conditional rendering component

Rules:

- **Never hardcode role names in screens.** Use permissions.
- Gate tabs/actions with `usePermissions()` or `<Can/>`.
- When you change permissions in the DB seed, update `rolePolicy.ts` in the same change.
- `src/config/rolePermissions.ts` is a deprecated shim — do not add new usages.

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
- Register each icon in `src/components/Icon/registry.ts`, then render it with
  `<Icon name="status-dirty" size={20} color={tokens.status.dirty} />`.
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
