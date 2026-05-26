# Feature modules

Each feature owns its screens, components, hooks, services, store, types, and constants. Cross-feature imports go through the feature barrel (`@features/<name>`) for components/screens, and through `@features/<name>/types` for types. Never reach into another feature's internals.

## Target layout

```text
features/
  auth/             Login, Splash, useAuthStore
  account/          Settings, UserProfile, useUserStore
  home/             Home dashboard
  rooms/            AllRooms, RoomDetail, ArrivalDepartureDetail (incl. allRooms + roomDetail components)
  tickets/          Tickets, CreateTicket, SelectTicketLocation, CreateTicketForm
  chat/             Chat, ChatDetail, NewChat, CreateChatGroup
  lost-and-found/   LostAndFound
  staff/            Staff
  ai-agent/         AIChatOverlay
```

## Per-feature structure

```text
<feature>/
  screens/
  components/
  hooks/
  services/
  store/
  types/
  constants/
  index.ts        Public barrel — only screens and types that other features need
```

## Out of scope for features

- Theme, supabase client, shared UI primitives, formatting/scaling utils, cross-cutting hooks (`useScale`, `useDesignScale`, `useFetch`, `useRefresh`), toast/message-modal contexts → `src/shared/`
- `App.tsx`, navigation shell (AppNavigator, BottomTabBar, MorePopup), providers → `src/app/`
- Mock data → `src/data/` (kept at root for now)
