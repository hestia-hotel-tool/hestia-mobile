import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, typography } from '@/theme';
import FilterSection from './FilterSection';
import FloorsFilterSheet from './FloorsFilterSheet';
import FilterCheckbox from './FilterCheckbox';
import SeeRoomsButton from '@/components/ui/SeeRoomsButton';
import { FilterState, FilterCounts, FilterOption } from '@/types/filter.types';
import { getFloorLabel } from '@/utils/formatting';
import { ShiftType } from '../types/home.types';
import { useHomeFilters } from '../hooks/useHomeFilters';
import { HOME_HEADER_HEIGHT_DESIGN_PX } from '../constants/homeLayout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

// Default values for HomeScreen
const DEFAULT_HEADER_HEIGHT = HOME_HEADER_HEIGHT_DESIGN_PX * scaleX;
const DEFAULT_HEADER_MARGIN = 14 * scaleX;
const DEFAULT_SEARCH_BAR_HEIGHT = 59 * scaleX;

interface HomeFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onGoToResults: (filters: FilterState) => void;
  onAdvanceFilter?: () => void;
  onApplyFilters?: (filters: FilterState) => void; // Optional callback for applying filters without navigation
  initialFilters?: FilterState;
  filterCounts: FilterCounts;
  headerHeight?: number; // Optional header height for positioning (defaults to HomeScreen height)
  searchBarHeight?: number; // Optional search bar height (defaults to HomeScreen height)
  searchBarTop?: number; // Optional search bar top position (for AllRoomsScreen where search is inside header)
  onFilterIconPress?: () => void; // Callback for filter icon press
  selectedShift?: ShiftType; // Determine which variant of the filter to show
  actualFilteredCount?: number; // Optional: actual count of filtered rooms (more accurate than estimation)
}

export default function HomeFilterModal({
  visible,
  onClose,
  onGoToResults,
  onAdvanceFilter,
  onApplyFilters,
  initialFilters,
  filterCounts,
  headerHeight,
  searchBarHeight,
  searchBarTop,
  onFilterIconPress,
  selectedShift,
  actualFilteredCount,
}: HomeFilterModalProps) {
  // Ensure filterCounts is always defined with default values
  const safeFilterCounts: FilterCounts = filterCounts || {
    roomStates: {
      dirty: 0,
      inProgress: 0,
      cleaned: 0,
      inspected: 0,
      priority: 0,
    },
    guests: {
      arrivals: 0,
      departures: 0,
      turnDown: 0,
      stayOver: 0,
    },
    floors: { all: 0 },
    totalRooms: 0,
  };
  // Calculate position below filter button
  // Use provided heights or defaults for HomeScreen
  const HEADER_HEIGHT = headerHeight || DEFAULT_HEADER_HEIGHT;
  const HEADER_HEIGHT_MINUS_30 = HEADER_HEIGHT - 30 * scaleX; // Subtract 30 directly from HEADER_HEIGHT for responsive calculation
  const HEADER_MARGIN = DEFAULT_HEADER_MARGIN;
  const SEARCH_BAR_HEIGHT = searchBarHeight || DEFAULT_SEARCH_BAR_HEIGHT;
  
  // Calculate filter icon position (when modal is open)
  const FILTER_ICON_TOP = HEADER_HEIGHT_MINUS_30 + 5 * scaleX; // Just below header, on top of overlay
  const FILTER_ICON_HEIGHT = 40 * scaleX; // Filter icon container height
  const FILTER_ICON_BOTTOM = FILTER_ICON_TOP + FILTER_ICON_HEIGHT; // Bottom of filter icon
  const MODAL_MARGIN_FROM_ICON = 10 * scaleX; // Margin between icon and modal
  
  // If searchBarTop is provided (AllRoomsScreen), use it directly
  // Otherwise calculate from header height + margin (HomeScreen)
  // When filter modal is open, search bar is hidden, so filter button is at header bottom
  const FILTER_BUTTON_TOP = searchBarTop !== undefined 
    ? searchBarTop 
    : HEADER_HEIGHT + HEADER_MARGIN; // Top of search section (or filter button when modal open)
  const FILTER_BUTTON_BOTTOM = searchBarTop !== undefined
    ? FILTER_BUTTON_TOP + SEARCH_BAR_HEIGHT // AllRoomsScreen: search bar exists
    : HEADER_HEIGHT + HEADER_MARGIN + 12 * scaleX; // HomeScreen: filter button height when modal open (no search bar)
  const BLUR_TOP_OFFSET = HEADER_HEIGHT; // 0px margin from header - blur starts right at header bottom
  // When searchBarTop is undefined (modal open, search hidden), position modal with margin from filter icon
  const MODAL_TOP_OFFSET = searchBarTop !== undefined
    ? FILTER_BUTTON_BOTTOM + 10 * scaleX // Normal spacing when search bar exists
    : FILTER_ICON_BOTTOM + MODAL_MARGIN_FROM_ICON; // Position modal below filter icon with margin
  const {
    filters,
    setFilters,
    toggleRoomState,
    toggleGuest,
    toggleFloor,
    calculateResultCount,
    hasActiveFilters,
    resetFilters,
  } = useHomeFilters(initialFilters);

  const isAMShift = selectedShift === 'AM';
  // For HomeScreen, always show AM-style filter (floors filter) regardless of shift
  // HomeScreen doesn't provide onApplyFilters, AllRoomsScreen does
  const isHomeScreen = !onApplyFilters;
  const shouldShowAMStyle = isAMShift || isHomeScreen;

  const derivedTotalRooms = useMemo(() => {
    const roomStateTotal = safeFilterCounts?.roomStates
      ? Object.values(safeFilterCounts.roomStates).reduce((sum, val) => sum + (val || 0), 0)
      : 0;
    return safeFilterCounts.totalRooms || roomStateTotal || 0;
  }, [safeFilterCounts]);

  const defaultFloorCounts = useMemo(() => {
    if (safeFilterCounts.floors && Object.keys(safeFilterCounts.floors).length > 0) {
      return safeFilterCounts.floors;
    }
    const fallback = derivedTotalRooms || 24;
    return { all: fallback };
  }, [safeFilterCounts.floors, derivedTotalRooms]);

  // Reset filters when modal closes
  useEffect(() => {
    if (!visible && initialFilters) {
      setFilters(initialFilters);
    }
  }, [visible, initialFilters, setFilters]);

  const resultCount = useMemo(() => {
    // If actual filtered count is provided, use it (more accurate)
    if (actualFilteredCount !== undefined) {
      return actualFilteredCount;
    }
    // Otherwise, use the estimation from calculateResultCount
    if (!filters) return 0;
    return calculateResultCount(safeFilterCounts);
  }, [filters, safeFilterCounts, calculateResultCount, actualFilteredCount]);

  const floorOptions = useMemo(() => {
    const currentFloors = filters?.floors || { all: false };
    const floorCounts = defaultFloorCounts;
    const totalCount = floorCounts.all ?? derivedTotalRooms;

    const options = [
      { id: 'all', label: 'All', count: totalCount, selected: !!currentFloors.all },
    ];

    // Add floor options dynamically from floor counts (sorted: 1st, 2nd, 3rd, ...)
    const floorNumbers = Object.keys(floorCounts)
      .filter((k) => k !== 'all')
      .map((k) => parseInt(k, 10))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    floorNumbers.forEach((floorNum) => {
      const key = String(floorNum);
      options.push({
        id: key,
        label: getFloorLabel(floorNum),
        count: floorCounts[key] ?? 0,
        selected: !!currentFloors[key],
      });
    });

    return options;
  }, [filters?.floors, defaultFloorCounts, derivedTotalRooms]);

  const displayResultCount = hasActiveFilters ? resultCount : 0;

  // Room State filter options
  const roomStateOptions: FilterOption[] = useMemo(
    () => {
      if (!filters || !filters.roomStates || !safeFilterCounts || !safeFilterCounts.roomStates) return [];
      const base: FilterOption[] = [
        {
          id: 'dirty',
          label: 'Dirty',
          // Use the same dirty icon as Home screen status badges for consistency
          icon: require('../../../../assets/icons/dirty-icon.png'),
          iconColor: '#f92424',
          count: safeFilterCounts.roomStates.dirty || 0,
          selected: filters.roomStates.dirty || false,
          type: 'dirty',
        },
        {
          id: 'inProgress',
          label: 'In Progress',
          icon: require('../../../../assets/icons/in-progress-icon.png'),
          iconColor: '#f0be1b',
          count: safeFilterCounts.roomStates.inProgress || 0,
          selected: filters.roomStates.inProgress || false,
          type: 'inProgress',
        },
        {
          id: 'cleaned',
          label: 'Cleaned',
          icon: require('../../../../assets/icons/cleaned-state-icon.png'),
          iconColor: '#4a91fc',
          count: safeFilterCounts.roomStates.cleaned || 0,
          selected: filters.roomStates.cleaned || false,
          type: 'cleaned',
        },
        {
          id: 'inspected',
          label: 'Inspected',
          icon: require('../../../../assets/icons/inspected-state-icon.png'),
          iconColor: '#41d541',
          count: safeFilterCounts.roomStates.inspected || 0,
          selected: filters.roomStates.inspected || false,
          type: 'inspected',
        },
        {
          id: 'priority',
          label: 'Priority',
          icon: require('../../../../assets/icons/priority-status.png'),
          iconColor: undefined, // No tint color - icon has its own colors
          count: safeFilterCounts.roomStates.priority || 0,
          selected: filters.roomStates.priority || false,
          type: 'priority',
        },
      ];

      // Only display these persisted states when there is at least 1 (Figma: hide when null/0).
      const extras: FilterOption[] = [];
      if ((safeFilterCounts.roomStates.paused ?? 0) > 0) {
        extras.push({
          id: 'paused',
          label: 'Paused',
          icon: require('../../../../assets/icons/paused-filter-icon.png'),
          iconColor: '#f0be1b',
          count: safeFilterCounts.roomStates.paused || 0,
          selected: !!filters.roomStates.paused,
          type: 'paused',
        });
      }
      if ((safeFilterCounts.roomStates.returnLater ?? 0) > 0) {
        extras.push({
          id: 'returnLater',
          label: 'Return Later',
          icon: require('../../../../assets/icons/return-later.png'),
          iconColor: '#5a759d',
          count: safeFilterCounts.roomStates.returnLater || 0,
          selected: !!filters.roomStates.returnLater,
          type: 'returnLater',
        });
      }
      if ((safeFilterCounts.roomStates.refused ?? 0) > 0) {
        extras.push({
          id: 'refused',
          label: 'Refuse Service',
          icon: require('../../../../assets/icons/refuse-service.png'),
          iconColor: '#5a759d',
          count: safeFilterCounts.roomStates.refused || 0,
          selected: !!filters.roomStates.refused,
          type: 'refused',
        });
      }

      return [...base, ...extras];
    },
    [filters?.roomStates, safeFilterCounts?.roomStates]
  );

  // Guest filter options
  const guestOptions: FilterOption[] = useMemo(
    () => {
      if (!filters || !filters.guests || !safeFilterCounts || !safeFilterCounts.guests) return [];
      return [
        {
          id: 'arrivals',
          label: 'Arrivals',
          icon: require('../../../../assets/icons/guest-arrival-icon.png'),
          iconColor: '#41d541',
          count: safeFilterCounts.guests.arrivals || 0,
          selected: filters.guests.arrivals || false,
          type: 'arrivals',
        },
        {
          id: 'departures',
          label: 'Departures',
          icon: require('../../../../assets/icons/guest-departure-icon.png'),
          iconColor: '#f92424',
          count: safeFilterCounts.guests.departures || 0,
          selected: filters.guests.departures || false,
          type: 'departures',
        },
        {
          id: 'turnDown',
          label: 'Turn Down',
          icon: require('../../../../assets/icons/turndown-icon.png'),
          iconColor: '#4a91fc',
          count: safeFilterCounts.guests.turnDown || 0,
          selected: filters.guests.turnDown || false,
          type: 'turnDown',
        },
        {
          id: 'stayOver',
          label: 'StayOver',
          icon: require('../../../../assets/icons/rooms-icon.png'),
          iconColor: '#1e1e1e',
          count: safeFilterCounts.guests.stayOver || 0,
          selected: filters.guests.stayOver || false,
          type: 'stayOver',
        },
      ];
    },
    [filters?.guests, safeFilterCounts?.guests]
  );

  const handleToggleRoomState = (id: string) => {
    toggleRoomState(id as keyof FilterState['roomStates']);
  };

  const handleToggleGuest = (id: string) => {
    toggleGuest(id as keyof FilterState['guests']);
  };

  const handleToggleFloor = (id: string) => {
    const currentFloors = filters?.floors || { all: false };
    const floorIds = floorOptions.map((o) => o.id).filter((k) => k !== 'all');

    // When toggling "All", set all floors to the same value
    if (id === 'all') {
      const nextValue = !currentFloors.all;
      const updatedFloors: Record<string, boolean> = { all: nextValue };
      floorIds.forEach((key) => {
        updatedFloors[key] = nextValue;
      });
      setFilters((prev) => ({
        ...prev,
        floors: updatedFloors,
      }));
      return;
    }

    // Toggle individual floor and unset "All" when a child is toggled off
    const nextValue = !currentFloors[id];
    const updatedFloors: Record<string, boolean> = {
      ...currentFloors,
      [id]: nextValue,
    };

    // If any child is off, "all" is false; if every child (except all) is on, "all" becomes true
    const allChildrenSelected = floorIds.every((key) =>
      key === id ? nextValue : !!currentFloors[key]
    );
    updatedFloors.all = allChildrenSelected;

    setFilters((prev) => ({
      ...prev,
      floors: updatedFloors,
    }));
  };

  const handleGoToResults = () => {
    // Ensure filters is defined before using it
    if (!filters) {
      return;
    }
    
    // If onApplyFilters is provided, use it (for AllRoomsScreen)
    // Otherwise use onGoToResults (for HomeScreen navigation)
    if (onApplyFilters) {
      onApplyFilters(filters);
    } else {
      onGoToResults(filters);
    }
    onClose();
  };

  const handleResetFilters = () => {
    // Get the reset filters state (all false/empty)
    const resetFilterState: FilterState = {
      roomStates: {
        dirty: false,
        inProgress: false,
        cleaned: false,
        inspected: false,
        priority: false,
      },
      guests: {
        arrivals: false,
        departures: false,
        turnDown: false,
        stayOver: false,
      },
    };
    
    // Reset filters in the hook
    resetFilters();
    
    // Apply reset filters to show all cards
    // Pass empty filter state (all false) which will show all rooms
    if (onApplyFilters) {
      onApplyFilters(resetFilterState);
    } else {
      onGoToResults(resetFilterState);
    }
    
    // Close the modal
    onClose();
  };

  // Create dynamic styles based on calculated positions
  const dynamicStyles = {
    filterIconContainer: {
      position: 'absolute' as const,
      top: FILTER_ICON_TOP, // Position on top of overlay
      right: 15 * scaleX, // Position on the right side
      width: 40 * scaleX, // Match the increased size from HomeScreen
      height: FILTER_ICON_HEIGHT, // Match the increased size from HomeScreen
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      zIndex: 1002, // Higher than overlay (999) and modal (1000) to be on top
    },
    headerArea: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      height: HEADER_HEIGHT, // Header area - no blur
      backgroundColor: 'transparent',
      zIndex: 1001,
    },
    blurOverlay: {
      position: 'absolute' as const,
      top: HEADER_HEIGHT_MINUS_30, // Responsive calculation: HEADER_HEIGHT - 30
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 999, // Below modal and filter icon
    },
    modalContainer: {
      position: 'absolute' as const,
      top: MODAL_TOP_OFFSET,
      left: SCREEN_WIDTH * 0.05, // 5% of screen width
      width: SCREEN_WIDTH * 0.9, // 90% of screen width
      maxWidth: 400 * scaleX,
      bottom: 20 * scaleX, // Add margin bottom
      zIndex: 1000, // On top of overlay
    },
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Filter Icon - On top of overlay */}
        {onFilterIconPress && (
          <TouchableOpacity
            style={dynamicStyles.filterIconContainer}
            onPress={onFilterIconPress}
            activeOpacity={0.7}
          >
            <Image
              source={require('../../../../assets/icons/menu-icon.png')}
              style={styles.filterIconImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
        
        {/* Header area - no blur, clickable to close */}
        <TouchableOpacity
          style={dynamicStyles.headerArea}
          activeOpacity={1}
          onPress={onClose}
        />
        
        {/* Blurred area - below header and search section */}
        <BlurView intensity={80} style={dynamicStyles.blurOverlay} tint="light">
          <View style={styles.blurDarkener} />
          {/* Backdrop - clickable to close */}
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={onClose}
          />
        </BlurView>

        <View
          style={dynamicStyles.modalContainer}
          pointerEvents="box-none"
        >
          <View style={styles.modalContent}>
            {shouldShowAMStyle ? (
              <FloorsFilterSheet
                options={floorOptions}
                resultCount={displayResultCount}
                onToggle={handleToggleFloor}
                onSeeRooms={handleGoToResults}
              />
            ) : (
              <>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>Filter</Text>
                  <TouchableOpacity
                    style={styles.resultsButton}
                    onPress={handleGoToResults}
                    activeOpacity={0.7}
                    disabled={!hasActiveFilters}
                  >
                    <Text
                      style={[
                        styles.resultsButtonText,
                        !hasActiveFilters && styles.resultsButtonTextDisabled,
                      ]}
                    >
                      {resultCount} {resultCount === 1 ? 'result' : 'results'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Content - Optimized to fit without scrolling */}
                <View style={styles.content}>
                  <View style={styles.contentScrollable}>
                    {/* Room State Section */}
                    {Array.isArray(roomStateOptions) && roomStateOptions.length > 0 && (
                      <FilterSection
                        title="Room State"
                        options={roomStateOptions}
                        onToggle={handleToggleRoomState}
                        isRoomState={true}
                      />
                    )}

                    {/* Guest Section */}
                    {Array.isArray(guestOptions) && guestOptions.length > 0 && (
                      <FilterSection
                        title="Guest"
                        options={guestOptions}
                        onToggle={handleToggleGuest}
                        isRoomState={false}
                        reducedMargin={true}
                      />
                    )}

                    {/* Action Buttons - Directly below Stayover */}
                    <View style={styles.actionsInline}>
                      <TouchableOpacity
                        style={styles.goToResultsButton}
                        onPress={handleGoToResults}
                        activeOpacity={0.7}
                        disabled={!hasActiveFilters}
                      >
                        <Text style={[
                          styles.goToResultsButtonText,
                          !hasActiveFilters && styles.goToResultsButtonTextDisabled,
                        ]}>
                          Go to Results
                        </Text>
                        <Image
                          source={require('../../../../assets/icons/spear-arrow.png')}
                          style={[
                            styles.arrowIcon,
                            !hasActiveFilters && styles.arrowIconDisabled,
                          ]}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>

                      {onAdvanceFilter && (
                        <TouchableOpacity
                          style={styles.advanceFilterButton}
                          onPress={onAdvanceFilter}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.advanceFilterText}>Advance Filter</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  
                  {/* Reset Button - Bottom Right */}
                  {hasActiveFilters && (
                    <View style={styles.resetButtonBottomContainer}>
                      <TouchableOpacity
                        style={styles.resetButton}
                        onPress={handleResetFilters}
                        activeOpacity={0.8}
                      >
                        <View style={styles.resetIconCircle}>
                          <Image
                            source={require('../../../../assets/icons/menu-icon.png')}
                            style={styles.resetIcon}
                            resizeMode="contain"
                            tintColor="#ffffff"
                          />
                        </View>
                        <Text style={styles.resetButtonText}>Reset</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  blurDarkener: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(200, 200, 200, 0.6)',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12 * scaleX,
    shadowColor: 'rgba(100, 131, 176, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 35 * scaleX,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20 * scaleX,
    paddingVertical: 16 * scaleX, // Reduced from 20px
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
    minHeight: 56 * scaleX, // Reduced from 60px
    position: 'relative',
  },
  headerTitle: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.text.primary,
    flex: 1,
  },
  resetButtonBottomContainer: {
    alignSelf: 'flex-end',
    marginTop: 1 * scaleX, // Minimal gap (50% of 2px = 1px)
    marginRight: 0, // No right margin since content has padding
    marginBottom: 16 * scaleX, // Bottom margin to position button lower
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5a759d',
    paddingVertical: 8 * scaleX,
    paddingHorizontal: 16 * scaleX,
    borderRadius: 20 * scaleX,
    shadowColor: 'rgba(90, 117, 157, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
  },
  resetIconCircle: {
    width: 20 * scaleX,
    height: 20 * scaleX,
    borderRadius: 10 * scaleX,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8 * scaleX,
  },
  resetIcon: {
    width: 12 * scaleX,
    height: 12 * scaleX,
  },
  resetButtonText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.semibold as any,
    color: '#ffffff',
  },
  resultsButton: {
    paddingHorizontal: 12 * scaleX,
    paddingVertical: 6 * scaleX,
  },
  resultsButtonText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.primary.main,
  },
  resultsButtonTextDisabled: {
    color: colors.text.secondary,
    opacity: 0.5,
  },
  content: {
    paddingHorizontal: 20 * scaleX,
    paddingTop: 16 * scaleX,
    paddingBottom: 16 * scaleX, // Bottom padding for reset button
    flex: 1,
    justifyContent: 'space-between', // Distribute content to fill space
  },
  contentScrollable: {
    flex: 1, // Take available space, leaving room for reset button
  },
  actionsInline: {
    marginTop: 16 * scaleX, // Spacing to push buttons down
    marginBottom: 0 * scaleX, // No bottom margin
    paddingHorizontal: 16 * scaleX, // Padding to move buttons inward
  },
  goToResultsButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6 * scaleX, // Further reduced padding
    marginBottom: 2 * scaleX, // Reduced spacing before Advance Filter
  },
  goToResultsButtonText: {
    fontSize: 18 * scaleX, // Increased from 16px for better visibility
    fontFamily: typography.fontFamily.primary, // Helvetica
    fontWeight: typography.fontWeights.bold as any, // 700
    color: '#5A759D', // Exact color from Figma
    // lineHeight: typography.lineHeights.normal, // normal - removed to fix type error
  },
  goToResultsButtonTextDisabled: {
    color: colors.text.secondary,
    opacity: 0.5,
  },
  arrowIcon: {
    width: 20 * scaleX, // Increased from 16px for better visibility
    height: 20 * scaleX, // Increased from 16px for better visibility
    tintColor: colors.primary.main,
  },
  arrowIconDisabled: {
    tintColor: colors.text.secondary,
    opacity: 0.5,
  },
  advanceFilterButton: {
    paddingVertical: 2 * scaleX, // Further reduced padding
    paddingLeft: 0, // Align with Go to Results text
    marginBottom: 0, // No bottom margin
  },
  advanceFilterText: {
    fontSize: 14 * scaleX, // Matches Figma - smaller than Go to Results
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: colors.text.secondary, // Lighter grey color
  },
  filterIconImage: {
    width: 32 * scaleX, // Match the increased size from HomeScreen
    height: 16 * scaleX, // Match the increased size from HomeScreen (maintaining aspect ratio)
    tintColor: colors.primary.main,
  },
});
