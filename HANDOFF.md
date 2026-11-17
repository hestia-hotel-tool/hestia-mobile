# Handoff — current state (2026-11-16)

Branch `wallice-dev`. Latest commit `6c9cdc0` (laundry department + navigation). The user approves every commit and push; nothing is pushed by Claude.

## In progress (staged, not committed)

- **Checkbox tick** (`components/ui/Checkbox.tsx`): checked = no fill, ink outline, thin SVG tick (path from `RoomSelectCheckbox`, Figma 4361:6101). Used by the Floors filter and every `FilterOptionRow` sheet.
- **Attendant action menu on room cards**: tapping the assignee (`RoomAssigneeBlock`) opens `StaffActionMenu` with Reassign Room / Unassign for that room. Only with `rooms.reassign`.
  - Always opens below the attendant with the `action-tooltip-tail` pointing at the photo (`tailX`); the list scrolls first via `useRevealBelow` (shared with the VIP popover), gap `ASSIGNEE_MENU_GAP` = 16 in `AllRoomsScreen`.
  - Header and tapped card stay sharp, rest lightly blurred (`StaffActionMenu` `spotlight`). The block/card hand over `MeasureAnchor`s, not one reading.
  - Reassign → existing `ReassignModal`; Unassign → confirm → `unassignRoomsFromStaff` → `setRoomAttendant(id, null)`.
  - `ReassignModal` now omits the current assignee everywhere (Rooms, Room Detail, Staff); Auto Assign uses the same list.
  - Typecheck/lint clean, iOS export OK; checked by the user on device.

## Next

1. **Engineering UI from Figma 4649:809.** Figma was disconnected in the last session; open a new session (Figma reconnected) and read the node. Plan-first: list differences, approve, then UI-only changes.
2. Logic changes the user announced after the UI pass (not specified yet).
3. Commit the staged work after approval.

## How things work now (non-obvious)

- **Room card**: `roomsList/RoomListCard.tsx` is the only card, built from `ROOM_CARD` in `roomCardLayout.ts` (440 design frame, `cardPx`). Every Rooms variant uses `RoomsHeader` (collapsing profile band, `useCollapsingHeader`). `AllRoomsHeader` and legacy `allRooms/RoomCard` are dead code, not deleted.
- **VIP**: hotel codes 1–10 → tiers V1–V5 (`src/domain/vip`, `store/vipTiers.ts`), drawn grey everywhere; disc/ⓘ opens `VipInfoPopover` (built from a screenshot, no Figma node).
- **Laundry department** (migration `20261109090000`, applied): former Executive and Administration; Lina Moreau and Samantha Nguyen. No lead title, so Laundry tickets can only be reassigned by platform admins.
- **Works from tickets** (`usePermissions().worksFromTickets`: porters via `hsk_portier`, laundry via department): land on Tickets; ticket list = assigned to them + their department's (client-side filter only; RLS is hotel-wide). Laundry only (`inLaundry`): tab order Tickets, Rooms, AI, Lost & Found; profile in `TicketsHeader` instead of Rooms.
- **Tab back arrows** use `rbac/useTabBack` (a bare `goBack()` to Home looped through `RouteGuard` for roles without Home).
- **Ticket form**: `tickets/components/TicketForm.tsx` (Figma 589:514) serves Room Detail → Tickets and `CreateTicketFormScreen`. Location step uses `roomPicker/RoomSearchField` (Figma 1085:2628).
- **Icons**: SVG only via the registry (`node scripts/normalizeSvg.js --mono`, then `npm run icons:generate`).
- **Simulator/phone often keeps stale JS**: press `r` in Metro or restart the app before judging a change. The local dev build's bundle id is `com.hestiahotels.app`.
- **Staff PDF** (`~/Desktop/Hestia-Staff.pdf`, 2026-11-09) contains live passwords; rebuilt from the DB with a scratch script (not in the repo).

## Open decisions for the user

- Porters see all Housekeeping tickets; should it be only their own? Should people see tickets they raised for other departments? Enforce the ticket scope in RLS?
- Porters: same profile-on-Tickets layout and tab order as laundry?
- Lost & Found → Register still uses the modal room picker; switch to `RoomSearchField`?
- Fatima Benali has no shift set in the DB.

## Open problems

1. Migration `20261030090000` (laundry rooms variant) not applied to `nkawubpnwkhzvwqkxhaz`; the client fallback (`readOnlyAttendant`) covers it and also gives Public Area Attendants the laundry Rooms view.
2. `supabase db push` is blocked: the remote has `20260929000600`, which isn't in git. Don't `migration repair` it blind.
3. Front-office chips come from `reservations.front_office_status`; after the +29-day data shift some don't match their dates.
4. Lost & Found's item card accepts `guestVipCode` but never shows it; the confirm step draws a red arrow on any VIP's photo.
5. VIP filter counts don't recompute when a hotel's own tiers load after the rooms.
6. `@/tw` `Pressable` drops function `style` when `className` is set (still in TicketActivityItem, StaffActionMenu rows, HomeHeader, StaffShiftCard).
