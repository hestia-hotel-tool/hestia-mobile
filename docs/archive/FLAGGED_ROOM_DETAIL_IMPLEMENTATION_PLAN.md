# Implementation Plan: Room Detail When User Clicks on Card with Flagged Status

**Figma design:** [HESTIA-APP-AND-DASHBOARD – node 2333-646](https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=2333-646&m=dev)

**Scope:** When the user taps a room card that has **flagged** status on the All Rooms screen, the app navigates to the Room Detail screen. This plan defines how that screen should look and behave according to Figma node 2333-646 (flagged Room Detail).

---

## 1. Current Behavior

- **All Rooms → Room Detail:** `handleRoomPress(room)` navigates to `RoomDetail` with `{ room, roomType }`. This already runs for any card tap, including flagged cards.
- **Room Detail screen:** Receives `room` (includes `room.flagged`). Uses `RoomDetailHeader` with `status` (Dirty/InProgress/Cleaned/Inspected) and status-based header color. It does **not** currently treat flagged rooms differently in the header.
- **RoomDetailHeader:** Shows status indicator with status icon + status label + dropdown on a colored header (yellow/blue/green/red by status). No “Flagged” variant.

---

## 2. Design Summary (Figma 2333-646)

When the opened room is **flagged**, Room Detail should:

1. **Header**
   - **Back:** Red left-pointing arrow (same asset, tint red).
   - **Room number:** “Room 201” in **red**, bold, centered.
   - **Room code:** “ST2K-1.4” (or `room.roomType`) in **grey**, smaller, centered below room number.
   - **Header background:** For flagged, use a neutral/light background (e.g. white or very light grey) so the red room number and the “Flagged” pill stand out (Figma shows a clean, light header for this state).

2. **Status indicator (Flagged pill)**
   - Replace the usual status pill with a **“Flagged”** pill:
     - **Background:** Light red/pink `#FFEBEB` (same as All Rooms flagged status card).
     - **Content (horizontal, space-around):**
       - Red flag icon (`assets/icons/flag.png`), tint `#F92424`.
       - Text: **“Flagged”** in red `#F92424`.
       - Red dropdown arrow (`assets/icons/dropdown-arrow.png`), tint `#F92424`.
     - **Sizing:** Reuse the same logic as other status indicator (position/size from `ROOM_DETAIL_HEADER.statusIndicator`), with border-radius and padding so it reads as a pill (e.g. border-radius 45px / pill shape as in All Rooms flagged card).
   - **Tap:** Opens the same Status Change modal as the current status pill (change status or turn off “Flag room”).

3. **Rest of screen**
   - Tabs (Overview, Tickets, Checklist, History) and all content (Guest Info, Assigned to, Lost & Found, Notes, etc.) unchanged; only the header and status pill change for flagged.

---

## 3. Implementation Tasks

### 3.1 Data & navigation

- [ ] **Ensure `flagged` is passed and kept in sync**
  - `RoomDetail` already receives `room` (with `room.flagged`). Keep using `localRoom` for updates (e.g. after toggling flag in Status Change modal).
  - When `onFlagToggle` runs in Room Detail, update `localRoom.flagged` (and optionally persist or sync back to All Rooms if needed).

### 3.2 RoomDetailHeader – Flagged variant

- [ ] **Add `flagged` prop**
  - Extend `RoomDetailHeaderProps` with `flagged?: boolean`.
  - When `flagged === true`, render the “Flagged” header variant; otherwise keep current status-based header.

- [ ] **Header background when flagged**
  - In `roomDetailStyles.ts` (or equivalent), add a token for flagged header background (e.g. `#FFFFFF` or light grey from Figma).
  - In `RoomDetailHeader`, when `flagged` is true, set header container background to this token instead of `statusConfig.color`.

- [ ] **Room number & room code when flagged**
  - When `flagged` is true:
    - Room number: color red (e.g. `#F92424` or design token), keep font/size/alignment.
    - Room code: color grey (e.g. `#6C7D99` or existing secondary text), keep size/alignment.
  - When `flagged` is false, keep current (e.g. white on colored header).

- [ ] **Back button when flagged**
  - When `flagged` is true, set back arrow `tintColor` to red (e.g. `#F92424`) so it matches Figma (“red left-pointing arrow”).

- [ ] **Status indicator when flagged – “Flagged” pill**
  - When `flagged` is true, render a single pill that represents “Flagged”:
    - Container: same position/size as current status indicator (or Figma specs for node 2333-646), background `#FFEBEB`, border-radius (e.g. 45px or to match pill shape).
    - Content: horizontal row, `justifyContent: 'space-around'` (or per Figma), alignItems center:
      - `Image` flag icon, tint `#F92424`, size from design (e.g. 24×24 or reuse from All Rooms flagged card).
      - `Text` “Flagged”, color `#F92424`, font/size from design.
      - `Image` dropdown arrow, tint `#F92424`, size from design (e.g. match Room Detail dropdown size or All Rooms flagged).
    - Reuse `onStatusPress` for this pill so tapping it opens the same Status Change modal.
  - When `flagged` is false, keep existing status indicator (icon + `displayStatusText` + dropdown, current colors).

- [ ] **Constants**
  - Add to `roomDetailStyles.ts` (or shared constants):
    - Flagged header background color.
    - Flagged room number color (`#F92424`).
    - Flagged pill background `#FFEBEB`, text/icon tint `#F92424`.
    - Optional: pill border-radius, icon sizes for flag and dropdown in this header.

### 3.3 RoomDetailScreen – Pass `flagged` and handle flag toggle

- [ ] **Pass `flagged` into header**
  - In `RoomDetailScreen`, pass `flagged={localRoom.flagged === true}` to `RoomDetailHeader`.

- [ ] **Status Change modal and flag toggle**
  - When user taps the “Flagged” pill, `onStatusPress` already opens `StatusChangeModal`.
  - Ensure modal receives current `room` (e.g. `localRoom`), including `localRoom.flagged`, and `onFlagToggle` updates `setLocalRoom` so that:
    - If user turns “Flag room” off, `localRoom.flagged` becomes false and the header switches back to the normal status-based header and pill.
    - If user changes status, update `currentStatus` / `localRoom.status` as today; keep or clear `flagged` per modal behavior.

### 3.4 StatusChangeModal on Room Detail

- [ ] **Use same modal as All Rooms**
  - Room Detail already uses `StatusChangeModal`; no new modal needed.
  - Ensure when opened from Room Detail it still receives `room` (e.g. `localRoom`), `currentStatus`, `onStatusSelect`, `onFlagToggle`, and optional `showTriangle: false` / `headerHeight` if the modal is full-screen or differently positioned on this screen.

### 3.5 Visual QA (match Figma 2333-646)

- [ ] Header: back (red), room number (red), room code (grey), light header background when flagged.
- [ ] “Flagged” pill: light red background, flag + “Flagged” + dropdown in red, spacing and alignment per Figma.
- [ ] Tapping “Flagged” pill opens Status Change modal; toggling “Flag room” off updates header to non-flagged state.
- [ ] Tabs and Overview (and other tabs) unchanged; only header and status pill differ when `room.flagged === true`.

---

## 4. File Touch List

| File | Changes |
|------|--------|
| `src/components/roomDetail/RoomDetailHeader.tsx` | Add `flagged` prop; when true: header background, red room number/code, red back arrow, “Flagged” pill (flag + text + dropdown) with `#FFEBEB` and red tint; when false: keep current behavior. |
| `src/constants/roomDetailStyles.ts` | Add tokens: flagged header background, flagged room number color, flagged pill background/tint (and optional sizes/radius). |
| `src/screens/RoomDetailScreen.tsx` | Pass `flagged={localRoom.flagged === true}` to `RoomDetailHeader`; ensure `onFlagToggle` updates `localRoom` so header reacts. |
| (Optional) `src/types/roomDetail.types.ts` | Only if new types are needed for flagged header (e.g. `FlaggedHeaderStyle`); otherwise inline props are enough. |

---

## 5. Out of Scope / Notes

- **All Rooms card tap:** No change; already navigates to Room Detail with the same `room` object (including `flagged`).
- **Deep link / direct open:** If Room Detail can be opened without going through All Rooms (e.g. deep link), ensure the passed `room` still includes `flagged` where applicable.
- **Persistence:** If “Flag room” should persist across app restarts, that is a separate data/sync task; this plan only wires UI and local state for the Figma 2333-646 experience.

---

## 6. Acceptance Criteria

1. User taps a room card that has **flagged** status on All Rooms → app navigates to Room Detail for that room.
2. Room Detail header shows the **Flagged** variant: light header background, red room number, grey room code, red back arrow, and a “Flagged” pill (flag icon + “Flagged” text + dropdown) on light red background `#FFEBEB`, matching Figma 2333-646.
3. Tapping the “Flagged” pill opens the existing Status Change modal; user can change status or turn off “Flag room.”
4. When “Flag room” is turned off, Room Detail header switches to the normal status-based header and pill without leaving the screen.
5. Tabs and content (Overview, Tickets, Checklist, History) are unchanged; only the header and status pill depend on `room.flagged`.
