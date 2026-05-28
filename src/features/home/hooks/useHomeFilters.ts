import { useState, useMemo, useCallback } from 'react';
import { FilterState, FilterCounts } from '@shared/types/filter.types';

const defaultFilterState: FilterState = {
  roomStates: {
    dirty: false,
    inProgress: false,
    cleaned: false,
    inspected: false,
    priority: false,
    paused: false,
    refused: false,
    returnLater: false,
  },
  guests: {
    arrivals: false,
    departures: false,
    turnDown: false,
    noTask: false,
    stayOver: false,
    stayOverWithLinen: false,
    stayOverNoLinen: false,
    checkedIn: false,
    checkedOut: false,
    checkedOutDueIn: false,
    outOfOrder: false,
    outOfService: false,
  },
  reservations: {
    occupied: false,
    vacant: false,
  },
  floors: { all: false }, // Floor keys (1,2,3,...) added dynamically from room data
};

export function useHomeFilters(initialFilters?: FilterState) {
  const [filters, setFilters] = useState<FilterState>(
    initialFilters || defaultFilterState
  );

  const toggleRoomState = useCallback((state: keyof FilterState['roomStates']) => {
    setFilters((prev) => ({
      ...prev,
      roomStates: {
        ...defaultFilterState.roomStates,
        ...prev.roomStates,
        [state]: !(prev.roomStates[state] || false),
      },
    }));
  }, []);

  const toggleGuest = useCallback((guest: keyof FilterState['guests']) => {
    setFilters((prev) => ({
      ...prev,
      guests: {
        ...defaultFilterState.guests,
        ...prev.guests,
        [guest]: !(prev.guests[guest] || false),
      },
    }));
  }, []);

  const toggleReservation = useCallback((reservation: keyof NonNullable<FilterState['reservations']>) => {
    setFilters((prev) => {
      const baseRes = prev.reservations ?? defaultFilterState.reservations!;
      return {
        ...prev,
        reservations: {
          occupied: baseRes.occupied,
          vacant: baseRes.vacant,
          [reservation]: !baseRes[reservation],
        },
      };
    });
  }, []);

  const toggleFloor = useCallback((floor: string) => {
    setFilters((prev) => ({
      ...prev,
      floors: {
        ...(prev.floors || defaultFilterState.floors),
        [floor]: !(prev.floors || defaultFilterState.floors)?.[floor],
      },
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilterState);
  }, []);

  const calculateResultCount = useCallback(
    (filterCounts: FilterCounts): number => {
      let hasAnyFilter = false;
      const floorSelections = filters.floors ?? defaultFilterState.floors ?? {};
      
      // Check if "All" floors is selected
      const isAllFloorsSelected = floorSelections.all === true;
      
      // Count room states
      const selectedRoomStates: string[] = [];
      Object.entries(filters.roomStates).forEach(([key, selected]) => {
        if (selected) {
          hasAnyFilter = true;
          selectedRoomStates.push(key);
        }
      });

      // Count guests
      const selectedGuests: string[] = [];
      Object.entries(filters.guests).forEach(([key, selected]) => {
        if (selected) {
          hasAnyFilter = true;
          selectedGuests.push(key);
        }
      });

      // Count floors (exclude "all" since it's redundant when individual floors are selected)
      const selectedFloors: string[] = [];
      if (filterCounts.floors && floorSelections) {
        Object.entries(floorSelections).forEach(([key, selected]) => {
          if (selected && key !== 'all') {
            hasAnyFilter = true;
            selectedFloors.push(key);
          }
        });
      }

      // If no filters selected, return 0
      if (!hasAnyFilter) {
        return 0;
      }

      // Calculate floor count
      let floorCount = 0;
      if (isAllFloorsSelected) {
        // When "All" is selected, all individual floors are also selected, so use the total
        // Don't add "all" count separately to avoid double-counting
        floorCount = filterCounts.floors?.all || 0;
      } else if (selectedFloors.length > 0) {
        // Sum individual selected floors
        selectedFloors.forEach((floor) => {
          floorCount += filterCounts.floors?.[floor] || 0;
        });
      }
      // If no floor filter selected, floorCount remains 0 (all floors included in other counts)

      // Calculate room state count
      let roomStateCount = 0;
      selectedRoomStates.forEach((state) => {
        roomStateCount += filterCounts.roomStates[state as keyof FilterCounts['roomStates']] || 0;
      });

      // Calculate guest count
      let guestCount = 0;
      selectedGuests.forEach((guest) => {
        guestCount += filterCounts.guests[guest as keyof FilterCounts['guests']] || 0;
      });

      // If only one filter type is selected, return that count
      const hasRoomStateFilter = selectedRoomStates.length > 0;
      const hasGuestFilter = selectedGuests.length > 0;
      const hasFloorFilter = isAllFloorsSelected || selectedFloors.length > 0;

      if (hasRoomStateFilter && !hasGuestFilter && !hasFloorFilter) {
        return roomStateCount;
      }
      if (hasGuestFilter && !hasRoomStateFilter && !hasFloorFilter) {
        return guestCount;
      }
      if (hasFloorFilter && !hasRoomStateFilter && !hasGuestFilter) {
        return floorCount;
      }

      // When multiple filter types are selected, we need to estimate the intersection
      // Since we don't have the actual room data here, we use the minimum as a conservative estimate
      // This is an approximation - the actual count would require filtering the rooms
      const counts = [];
      if (hasRoomStateFilter) counts.push(roomStateCount);
      if (hasGuestFilter) counts.push(guestCount);
      if (hasFloorFilter) counts.push(floorCount);
      
      // Return the minimum count as a conservative estimate of the intersection
      // The actual implementation should filter rooms in the screen component
      return counts.length > 0 ? Math.min(...counts) : 0;
    },
    [filters]
  );

  const hasActiveFilters = useMemo(() => {
    return (
      Object.values(filters.roomStates).some((v) => v) ||
      Object.values(filters.guests).some((v) => v) ||
      Object.values(filters.reservations || {}).some((v) => v) ||
      Object.values(filters.floors || {}).some((v) => v)
    );
  }, [filters]);

  // Ensure filters is always defined
  const safeFilters: FilterState = {
    ...defaultFilterState,
    ...filters,
    roomStates: filters?.roomStates || defaultFilterState.roomStates,
    guests: filters?.guests || defaultFilterState.guests,
    reservations: filters?.reservations || defaultFilterState.reservations,
    floors: filters?.floors || defaultFilterState.floors,
  };

  return {
    filters: safeFilters,
    setFilters,
    toggleRoomState,
    toggleGuest,
    toggleReservation,
    toggleFloor,
    resetFilters,
    calculateResultCount,
    hasActiveFilters,
  };
}
