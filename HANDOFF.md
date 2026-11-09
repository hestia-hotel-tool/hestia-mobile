# Handoff — Rooms list: card, header, VIP codes

Branch `wallice-dev`. The card redesign (Figma 4553:262) is committed as `85f6135` by the user. The header, filter and priority-pill work is **staged by the user**; the VIP work below is **unstaged**. The user approves every commit. Nothing has been pushed by Claude.

## Room card (committed)

One card for every state: number + type chips + badge tiles; a tinted guest panel (name / "EDT 12:00  2 Adults, 2 Kids" / "07 Oct - 15 Oct", VIP disc with ⓘ); footer with "Room Attendant" + assignee and a 207×70 pill. Built from `roomsList/roomCardLayout.ts` (`ROOM_CARD`) and `RoomListCard.tsx` (the only card). The Priority pill is a red gradient with a glow (it vanished on the tinted priority frame).

Figma update (4577:72, 2026-11-06): a priority room is one card (`#feefef`, 1pt `#f92424`, white panel; `PRIORITY_CARD`), not a red frame; its pill is solid red with the running figure (`action-priority`). Unassigned rooms show `AssignRoomPill` (169.6×62, person-plus SVG, "Assign Room"; read-only: "Unassigned") centred on the pill, no "Room Attendant" label. Two-guest cards: pill 12 under the panel, 14 above the bottom (316 tall). Cards are 427 wide (gutter 6.5) and every offset counts from the outer edge, border included (`RoomCardShell`). The Rooms screen uses SVG only (no Ionicons, no PNG). Open question: Figma prints "V2" in one VIP disc; the app prints the code.

Header badge icons are Figma's 1pt-stroke glyphs (4553:856): `badge-bell` and `badge-lost-found` replaced in place, the flag added as `action-flag-outline-thin` (chat task cards keep the 2pt `action-flag-outline`).

## Rooms header (staged)

- Every Rooms variant now uses the new screen: `default` (bellboys, concierge, engineering, IT, IRD, Hotel Manager) moved off the legacy header and flat list on 2026-11-06. `AllRoomsHeader` and the legacy `allRooms/RoomCard` are now unreachable from AllRoomsScreen (dead code, not yet deleted).

- No "Rooms" title. Attendants get "Rooms finished" + the 3/8 pill; laundry gets "View only" + the linen summary.
- `hooks/useCollapsingHeader.ts`: scrolling down folds the profile band away and pins the search; a flick up or reaching the top brings it back. It stays in the layout (not an overlay) because `GroupedRoomsList` floats the In Progress band at the list's top. Frozen while the status popover or filter sheet is open.
- AM/PM switch: until the new shift's rooms arrive the store still holds the other shift's (a fetch fills both `rooms` and `roomsPM` with one shift), so the list shows `RoomListSkeleton` instead and hides the refresh spinner (`switchingShift` in AllRoomsScreen). A banded list gets an 8pt gap under the search (`listGap`), since its band heading brings 32.
- Filter sheet hangs from the header's measured bottom (`AllRoomsFilterModal.anchorTop`, `FilterModalOverlay.windowCoordinates`). The filter button shows open (disc) and applied (dot).

## VIP codes (unstaged, user-approved phase 1, 2026-11-06)

- Hotel codes are **1–10** (1 = most important); no code = regular guest (no disc). They're grouped into tiers per hotel: V1 = 1–2, V2 = 3–4, V3 = 5–6, V4 = 7–8, V5 = 9–10. **Drawn neutral everywhere** (`VIP_NEUTRAL`: Figma's grey disc, code `#334866`). Colour is kept for status (client, 2026-11-06); tier colours stay in `vip_tiers`, unused.
- Migration `20261106120000_vip_tiers.sql`: a `vip_tiers` table (RLS read per hotel, seeded for every hotel + a trigger for new ones). `guests.vip_code` limited to 1–10; other values are **cleared** (data change). `_guest_vip` (used by `upsert_guest`) enforces the same rule.
- Client: `src/domain/vip` (pure: `vipTierFor`, `normalizeVipCode`, defaults = the seed), `src/store/vipTiers.ts` (loads the hotel's tiers, defaults until then, cleared on tenant reset), `components/ui/VipCode.tsx` (inline tag). `vipCode` is now text (the `parseInt` is gone).
- Shown on: the room card disc, Room Detail's guest rows (the same `VipDisc` at the row's right, Figma 2333:312; tapping opens the same popover, `useRevealBelow` on the Overview ScrollView; each guest's own code, no inherited `numberBadge`), the room picker, the Lost & Found confirm step. The Rooms filter has a "VIP" section (V1–V5, room counts); the filter bar says "VIP V1".
- Tapping a VIP disc (code or ⓘ) opens `roomsList/VipInfoPopover.tsx` (user screenshot, 2026-11-06): a card-wide popover that always opens downward from the ⓘ (the list scrolls to make room first: `hooks/useRevealBelow.ts`, which also pads the list's end and freezes the collapsing header), everything blurred but the tapped card's strip: "Code: V3" (tier), "VIP GUEST", "Use {room credits} credits…", "Need Assistance?" and a button that opens the assistant already asking "What are the VIP guest requirements?" (`useAIChatOverlay().open(question)`). Built from a screenshot, so measures are approximate; no Figma node yet.
- Phase 2 (not built): special-attention flags, operational rules (inspection / auto-priority for VIP arrivals), Mews/Cloudbeds mapping, back-office tier editing.

## Status

- Typecheck and lint clean; iOS and Android exports succeed and contain the changes. **Nothing checked on a device.** VIP migration applied to `nkawubpnwkhzvwqkxhaz` on 2026-11-06 (both hotels seeded; codes 11 and 22 cleared, so 2 guests are now regular).
- Laundry department (2026-11-09, migration `20261109090000`, applied): Executive and Administration renamed to Laundry (key `laundry`); its 2 Hotel Managers (Elena Hofmann, Amina Diallo) and the `hotel_manager` title deleted; laundry attendants moved out of Housekeeping (title "Laundry Attendant", key unchanged). Hotel-wide ticket rights are now platform admins only. Laundry has no lead title yet.
- Room Detail → Tickets form (`tickets/components/TicketForm.tsx`) rebuilt to Figma 589:514 (2026-11-09): department dropdown (pink frame, list under it), "Name {Dept} Ticket", Frequent Cases list, flag priorities with tinted rows, Photo / Tag Staff / Description cards, square Submit. SVG only (new: `action-flag-priority`, `action-chevron-down-wide`, `action-add-photo-frame`). `CreateTicketFormScreen` (Tickets tab → Create Ticket, which draws Room Detail's header and tabs itself) now renders the same `TicketForm` (with `publicAreaName` for public areas) instead of its own copy.
- Create Ticket → Location (Figma 1085:2628): the room is now typed into `roomPicker/RoomSearchField` (inline; results pop up as `GuestRow` rows, number matches first, max 5) instead of `RoomNumberSelector`'s modal. Picker rooms now carry `adults`, `kids`, `time` (reservation `eta`). Lost & Found → Register still uses the modal picker.
- Filter counts don't recompute when a hotel's own tiers load after the rooms; only matters once a hotel's tiers differ from the defaults.

## Open problems

1. Migration `20261030090000` (laundry) is still not applied to `nkawubpnwkhzvwqkxhaz`; the client fallback covers it.
2. `supabase db push` is blocked: the remote has `20260929000600`, which isn't in git. Don't `migration repair` it blind.
3. "Maximum update depth exceeded" was never reproduced; its first suspect (the old header measuring) is gone.
4. Public Area Attendants get the laundry view through the fallback (unconfirmed).
5. Front-office chips come from `reservations.front_office_status`; after the +29-day data shift some don't match their dates.
6. Lost & Found's item card accepts `guestVipCode` but never shows it. The confirm step still draws a red arrow on any VIP's photo.

## Next steps

1. Check on iOS/Android: VIP discs and colours, the VIP filter, a guest without a code (no disc), the room picker.
2. Commit after approval.
