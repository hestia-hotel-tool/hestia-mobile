# Hestia

Multi-tenant hotel housekeeping app — Expo (SDK 56) + React Native + TypeScript,
Expo Router, NativeWind v4/v5, Zustand, and Supabase (Auth, Postgres/RLS,
Storage, Realtime, Edge Functions).

## Engineering guide

**[`AGENT.md`](AGENT.md) is the single source of truth** for architecture,
folder structure, styling, RBAC, backend rules, and conventions. Read it before
contributing.

## Quickstart

```bash
npm install
npm start          # then press i (iOS) / a (Android)
npm run typecheck   # tsc --noEmit — the primary gate
npm run lint
```

Supabase credentials come from `EXPO_PUBLIC_*` env vars — see
[`docs/guides/SUPABASE_SETUP.md`](docs/guides/SUPABASE_SETUP.md) and
[`.env.example`](.env.example).

## Documentation

Full index: **[`docs/README.md`](docs/README.md)**. Design tokens live in
[`design-system.json`](design-system.json).
