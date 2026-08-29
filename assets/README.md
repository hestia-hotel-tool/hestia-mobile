# Assets

## Layout

```
assets/
  app/              Expo config assets — icon / splash / adaptive-icon / favicon.
                    MUST stay PNG (Expo requirement). Referenced from app.config.ts.
  brand/            Logos and wordmarks. SVG preferred.
  icons/            UI glyphs — SVG ONLY, one concept per file.
    nav/            tab bar + header nav: home, rooms, tickets, chat, staff, settings, lost-found, back, more
    room-status/    dirty, in-progress, cleaned, inspected, out-of-order, out-of-service
    guest-status/   arrival, departure, stayover, turndown, checked-in, checked-out, vacant, occupied
    departments/    engineering, it, reception, concierge, hsk-portier, laundry, in-room-dining
    actions/        plus, search, flag, print, download, recover, thumbs-up, thumbs-down, tick, priority
    misc/           anything that doesn't fit above
  illustrations/    Larger vector art — empty states, success screens. SVG.
  images/           Raster only, where the content is genuinely photographic.
    products/       Minibar / amenity shots. Prefer serving these from the DB.
```

Person avatars are **not** assets — they belong with mock data (`src/mocks/`) or
come from the DB (`users.avatar_url`).

## Naming

- `kebab-case`, lowercase, ASCII. No spaces, underscores, capitals.
- **No `-icon` / `-image` suffix** — the folder already says what it is.
- Pattern: **`domain-concept[-variant]`** so names cluster in autocomplete:
  `status-dirty.svg`, `status-in-progress.svg`, `guest-arrival.svg`,
  `dept-engineering.svg`, `nav-home.svg`, `action-flag.svg`.
- One file per concept. Drive size and colour from props, not extra files.
- Variants only when the shape differs: `-outline` / `-filled`, `-active`.

## Icons: authoring

Export from Figma, then before committing:

- 24×24 `viewBox` for UI icons, 1.5px strokes, snapped to the pixel grid.
- Fills/strokes set to `currentColor` (so `<Icon color=…>` tints them).
- Remove hardcoded `width` / `height`; keep `viewBox`.
- Run through SVGO (Figma "SVGO Compressor" plugin, or `npx svgo`).
- No embedded rasters or `<image>` tags.

## Consuming

Icons: register in [`src/components/Icon/registry.ts`](../src/components/Icon/registry.ts),
then `<Icon name="status-dirty" size={20} color={tokens.status.dirty} />`.
Never `require()` an icon inside a screen or component.

Other assets: import through the `@assets` alias —
`import splash from '@assets/brand/logo.svg'` — not deep relative paths.
