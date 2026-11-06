# Handoff — Rooms list: room card redesign (Figma 4553:262)

Branch `wallice-dev`. The card redesign is **uncommitted** (the user approves every commit). Earlier work (laundry view, card sizing) is committed in `e3c2239`, `9934302`, `ecc2875`; nothing has been pushed by Claude.

## What the card is now

One card for every state (it replaces the seven per-state styles of 3883:5570): white, `#e3e3e3` hairline, radius 9.

- **Header:** room number (bold 33), coloured type chips (Arrival/Departure = two chips, out of order = a grey chip), badge tiles 32.6×29.5 on the right.
- **Guest panel:** tinted, 84 tall for one guest and 160 for two. Lines: name / "EDT: 12:00  2 Adults, 2 Kids" / "07 Oct - 15 Oct". VIP code in a 35 disc with an ⓘ mark. Turndown disc is purple with a yellow moon; stayover disc is 25.
- **Footer:** "Room Attendant" + assignee on the left, a 207×70 pill on the right (glyph + label + chevron; "No Service", "DND").
- Priority rooms keep the red frame. Front Office keeps its status cap; porter cards show Guest in/out where the attendant would be.

## Decisions (user, 2026-11-06)

- Category/credit ("ST2K - 1.4") is dropped, to match the design.
- Dates read "07 Oct - 15 Oct" (the design's "07 Oct -15 Oct" was treated as a typo).
- The ⓘ is tappable: `RoomListCard.onGuestInfoPress(guest)` exists but **nothing passes it yet**; the user will supply the UI it opens.
- New copy stays inline (Rooms is not on i18n yet).

## Files

- `src/features/rooms/components/roomsList/`: `roomCardLayout.ts` (one `ROOM_CARD` spec, all measures from 4553:262), `RoomListCard.tsx` (now the only card; `SingleGuestRoomCard` and `ArrivalDepartureRoomCard` were merged in and deleted), `RoomCardHeader`, `RoomCardBody`, `RoomCardShell`, `GuestRow`, `RoomStatusPill`, `RoomBadgeTile`, `RoomAssigneeBlock`, `PorterStatusPill`, new `RoomCardFooter.tsx` and `RoomTypeChip.tsx`
- `allRooms/AssignRoomButton.tsx`: `compact` mode removed (the header no longer competes with it)
- `src/utils/formatting.ts`: added `formatDatesOfStayShort` and `formatGuestCountWords`; removed `formatDatesOfStayCompact`
- `src/features/rooms/utils/porter.ts`: removed `PORTER_SPEC_STATUS`
- New icons: `assets/icons/actions/action-info.svg`, `assets/icons/guest-status/guest-turndown-moon.svg` (registry regenerated)

## Status

- Typecheck clean; touched files lint clean. iOS and Android exports both succeed and contain the new strings and classes.
- **Not checked on a device.** The user tests on iOS; Android is unverified visually.
- Room Detail and the older `allRooms/RoomCard.tsx` were not touched.

## Open problems

1. Migration `20261030090000` (laundry variant) still not applied to `nkawubpnwkhzvwqkxhaz`; the client fallback covers it.
2. `supabase db push` is blocked: remote has `20260929000600`, which isn't in git. Don't `migration repair` it blind.
3. "Maximum update depth exceeded" (RouteGuard › TabLayout) was never reproduced. Its first suspect, the header's measure-and-relayout logic, has been removed. If it recurs, capture the full Metro trace.
4. Public Area Attendants get the laundry view through the fallback; this is unconfirmed.
5. Front-office labels come from `reservations.front_office_status`, so after the +29-day data shift some chips don't match their ETA/EDT dates.
6. A comment in `lost-and-found/.../lostAndFoundCardLayout.ts:40` still mentions the removed `ROOM_CARD.rightColumn`.

## Next steps

1. User checks the cards on iOS (and Android if possible) against 4553:262: one guest, Arrival/Departure, turndown, stayover, unassigned, priority, Front Office, porter, laundry (read-only pill: no chevron).
2. Commit after approval.
3. Wire `onGuestInfoPress` once the user sends the guest-info UI.
4. Then the backend items above: apply the migration, then investigate `20260929000600`.
