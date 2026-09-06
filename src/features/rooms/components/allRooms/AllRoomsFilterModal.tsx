import React, { useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { colors } from '@/theme';
import {
  FilterModalOverlay,
  RoomsFilterSheet,
  type RoomsFilterSection,
} from '@/components/filters';
import { FilterState, FilterCounts } from '@/types/filter.types';
import { useHomeFilters, HOME_HEADER_HEIGHT_DESIGN_PX } from '@features/home';

const DESIGN_WIDTH = 440;

/**
 * Both screens collapse their header to this height while the filter is open,
 * so the sheet hangs off the same y on either one.
 */
const FILTER_ICON_GAP = 5;
const FILTER_ICON_HEIGHT = 40;
const SHEET_GAP = 10;
const SHEET_BOTTOM = 40;

/** Figma 1966:3906 shows five rows per section, the rest behind "see more". */
const COLLAPSED_ROWS = 5;

export type AllRoomsFilterModalProps = {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterState) => void;
  /** The filters currently applied to the list. Re-seeds the sheet on open. */
  initialFilters?: FilterState;
  filterCounts: FilterCounts;
  onFilterIconPress?: () => void;
  /**
   * Rooms the given selection would leave. Called with what is ticked *now*,
   * not with what is applied, so the confirm button describes where it leads.
   */
  countMatching?: (filters: FilterState) => number;
};

/**
 * The rooms filter for All Rooms — Figma node 1966:3906.
 *
 * Nothing but an adapter: it turns `FilterState` + `FilterCounts` into the
 * sections `RoomsFilterSheet` draws, and hands toggles back to `useHomeFilters`.
 * The sheet, the rows and the overlay are shared with Home.
 */
export default function AllRoomsFilterModal({
  visible,
  onClose,
  onApplyFilters,
  initialFilters,
  filterCounts,
  onFilterIconPress,
  countMatching,
}: AllRoomsFilterModalProps) {
  const { width } = useWindowDimensions();
  const scaleX = width / DESIGN_WIDTH;

  const { filters, setFilters, toggleRoomState, toggleGuest, toggleReservation, resetFilters } =
    useHomeFilters(initialFilters);

  /*
   * Re-seed from the applied filters every time the sheet opens.
   *
   * This component stays mounted while `visible` is false, so its state used to
   * outlive the sheet: resetting the list from the header, or arriving with new
   * filters from Home, left the checkboxes showing the previous selection — and
   * "See Rooms" then re-applied it.
   */
  useEffect(() => {
    if (!visible) return;
    if (initialFilters) setFilters(initialFilters);
    else resetFilters();
  }, [visible, initialFilters, setFilters, resetFilters]);

  const counts = filterCounts;

  const sections: RoomsFilterSection[] = useMemo(() => {
    const roomStates = filters.roomStates;
    const guests = filters.guests;
    const reservations = filters.reservations;

    return [
      {
        key: 'housekeeping',
        title: 'Housekeeping Status',
        countFormat: 'rooms',
        collapsedCount: COLLAPSED_ROWS,
        onToggle: (id) => toggleRoomState(id as keyof FilterState['roomStates']),
        options: [
          {
            id: 'dirty',
            label: 'Dirty',
            indicator: { kind: 'dot', color: colors.status.dirty },
            count: counts.roomStates?.dirty ?? 0,
            selected: !!roomStates.dirty,
          },
          {
            id: 'inProgress',
            label: 'In Progress',
            indicator: { kind: 'dot', color: colors.status.inProgress },
            count: counts.roomStates?.inProgress ?? 0,
            selected: !!roomStates.inProgress,
          },
          {
            id: 'cleaned',
            label: 'Cleaned',
            indicator: { kind: 'dot', color: colors.status.cleaned },
            count: counts.roomStates?.cleaned ?? 0,
            selected: !!roomStates.cleaned,
          },
          {
            id: 'inspected',
            label: 'Inspected',
            indicator: { kind: 'dot', color: colors.status.inspected },
            count: counts.roomStates?.inspected ?? 0,
            selected: !!roomStates.inspected,
          },
          {
            id: 'priority',
            label: 'Priority',
            indicator: {
              kind: 'icon',
              name: 'action-priority',
              color: colors.status.priorityText,
            },
            count: counts.roomStates?.priority ?? 0,
            selected: !!roomStates.priority,
          },
          {
            id: 'paused',
            label: 'Paused',
            indicator: { kind: 'icon', name: 'status-paused', color: colors.text.primary },
            count: counts.roomStates?.paused ?? 0,
            selected: !!roomStates.paused,
          },
          {
            id: 'refused',
            label: 'Refuse Service',
            indicator: {
              kind: 'icon',
              name: 'action-refuse-service',
              color: colors.text.primary,
            },
            count: counts.roomStates?.refused ?? 0,
            selected: !!roomStates.refused,
          },
          {
            id: 'returnLater',
            label: 'Return Later',
            indicator: {
              kind: 'icon',
              name: 'action-return-later',
              color: colors.text.primary,
            },
            count: counts.roomStates?.returnLater ?? 0,
            selected: !!roomStates.returnLater,
          },
        ],
      },
      {
        key: 'frontOffice',
        title: 'Front Office Status',
        // The design prints a bare number here, not "N Rooms" — node 1966:4164.
        countFormat: 'number',
        collapsedCount: COLLAPSED_ROWS,
        onToggle: (id) => toggleGuest(id as keyof FilterState['guests']),
        options: [
          {
            id: 'arrivals',
            label: 'Arrivals',
            // Two-tone by design (dark figure, green arrow) — no tint.
            indicator: { kind: 'icon', name: 'guest-arrival' },
            count: counts.guests?.arrivals ?? 0,
            selected: !!guests.arrivals,
          },
          {
            id: 'departures',
            label: 'Departures',
            indicator: { kind: 'icon', name: 'guest-departure' },
            count: counts.guests?.departures ?? 0,
            selected: !!guests.departures,
          },
          {
            id: 'stayOverWithLinen',
            label: 'Stayover with linen',
            indicator: {
              kind: 'icon',
              name: 'guest-stayover-linen',
              color: colors.text.primary,
            },
            count: counts.guests?.stayOverWithLinen ?? 0,
            selected: !!guests.stayOverWithLinen,
          },
          {
            id: 'stayOverNoLinen',
            label: 'Stayover no linen',
            indicator: {
              kind: 'icon',
              name: 'guest-stayover-no-linen',
              color: colors.text.primary,
            },
            count: counts.guests?.stayOverNoLinen ?? 0,
            selected: !!guests.stayOverNoLinen,
          },
          {
            id: 'turnDown',
            label: 'Turn Down',
            indicator: { kind: 'icon', name: 'guest-turndown', color: colors.text.primary },
            count: counts.guests?.turnDown ?? 0,
            selected: !!guests.turnDown,
          },
          // Behind "see more". The design draws no glyph for either, and the
          // registry has none that means them, so the slot stays empty rather
          // than borrowing a icon that says something else.
          {
            id: 'stayOver',
            label: 'Stayover',
            count: counts.guests?.stayOver ?? 0,
            selected: !!guests.stayOver,
          },
          {
            id: 'noTask',
            label: 'No Task',
            count: counts.guests?.noTask ?? 0,
            selected: !!guests.noTask,
          },
        ],
      },
      {
        key: 'reservations',
        title: 'Reservations Status',
        // No counts on these rows in the design — nodes 1979:8145 / 8146.
        countFormat: 'none',
        onToggle: (id) => toggleReservation(id as 'occupied' | 'vacant'),
        options: [
          {
            id: 'occupied',
            label: 'Occupied',
            indicator: { kind: 'icon', name: 'guest-occupied', color: colors.text.primary },
            count: counts.reservations?.occupied ?? 0,
            selected: !!reservations?.occupied,
          },
          {
            id: 'vacant',
            label: 'Vacant',
            indicator: { kind: 'icon', name: 'guest-vacant', color: colors.text.primary },
            count: counts.reservations?.vacant ?? 0,
            selected: !!reservations?.vacant,
          },
        ],
      },
    ];
  }, [filters, counts, toggleRoomState, toggleGuest, toggleReservation]);

  // Recounted only when the selection actually changes — it walks the room list.
  const resultCount = useMemo(() => countMatching?.(filters), [countMatching, filters]);

  const handleSeeRooms = () => {
    onApplyFilters(filters);
    onClose();
  };

  const headerHeight = HOME_HEADER_HEIGHT_DESIGN_PX * scaleX;
  const filterIconTop = headerHeight + FILTER_ICON_GAP * scaleX;

  return (
    <FilterModalOverlay
      visible={visible}
      onClose={onClose}
      blurTop={headerHeight}
      filterIconTop={filterIconTop}
      onFilterIconPress={onFilterIconPress}
      sheetTop={filterIconTop + (FILTER_ICON_HEIGHT + SHEET_GAP) * scaleX}
      sheetBottom={SHEET_BOTTOM * scaleX}
    >
      <RoomsFilterSheet
        sections={sections}
        onSeeRooms={handleSeeRooms}
        resultCount={resultCount}
      />
    </FilterModalOverlay>
  );
}
