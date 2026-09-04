import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, typography } from '@/theme';
import SeeRoomsButton from '@/components/SeeRoomsButton';
import { FilterState, FilterCounts } from '@/types/filter.types';
import { useHomeFilters } from '@features/home';
import { FilterRow } from '@features/home';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

interface AllRoomsFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterState) => void;
  initialFilters?: FilterState;
  filterCounts: FilterCounts;
  headerHeight?: number;
  onFilterIconPress?: () => void;
  actualFilteredCount?: number;
}

export default function AllRoomsFilterModal({
  visible,
  onClose,
  onApplyFilters,
  initialFilters,
  filterCounts,
  headerHeight = 217,
  onFilterIconPress,
  actualFilteredCount,
}: AllRoomsFilterModalProps) {
  const {
    filters,
    toggleRoomState,
    toggleGuest,
    toggleReservation,
    calculateResultCount,
    hasActiveFilters,
  } = useHomeFilters(initialFilters);

  // Start with sections collapsed (showing fewer items)
  const [expandedSections, setExpandedSections] = useState({
    housekeeping: false,
    frontOffice: false,
  });

  const safeFilterCounts = filterCounts || {
    roomStates: { dirty: 0, inProgress: 0, cleaned: 0, inspected: 0, priority: 0, paused: 0, refused: 0, returnLater: 0 },
    guests: { arrivals: 0, departures: 0, turnDown: 0, stayOver: 0, stayOverWithLinen: 0, stayOverNoLinen: 0, checkedIn: 0, checkedOut: 0, checkedOutDueIn: 0, outOfOrder: 0, outOfService: 0 },
    reservations: { occupied: 0, vacant: 0 },
  };

  const resultCount = useMemo(() => {
    if (actualFilteredCount !== undefined) {
      return actualFilteredCount;
    }
    if (!filters) return 0;
    return calculateResultCount(safeFilterCounts);
  }, [filters, safeFilterCounts, calculateResultCount, actualFilteredCount]);

  const displayResultCount = hasActiveFilters ? resultCount : 0;

  const handleApply = () => {
    if (filters) {
      onApplyFilters(filters);
    }
    onClose();
  };

  const toggleSection = (section: 'housekeeping' | 'frontOffice') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Housekeeping Status options
  const housekeepingOptions = useMemo(() => [
    {
      id: 'dirty',
      label: 'Dirty',
      icon: undefined, // No icon, just background color
      iconColor: '#f92424',
      count: safeFilterCounts.roomStates?.dirty || 0,
      selected: filters?.roomStates?.dirty || false,
    },
    {
      id: 'inProgress',
      label: 'In Progress',
      icon: undefined, // No icon, just background color
      iconColor: '#f0be1b',
      count: safeFilterCounts.roomStates?.inProgress || 0,
      selected: filters?.roomStates?.inProgress || false,
    },
    {
      id: 'cleaned',
      label: 'Cleaned',
      icon: undefined, // No icon, just background color
      iconColor: '#4a91fc',
      count: safeFilterCounts.roomStates?.cleaned || 0,
      selected: filters?.roomStates?.cleaned || false,
    },
    {
      id: 'inspected',
      label: 'Inspected',
      icon: undefined, // No icon, just background color
      iconColor: '#41d541',
      count: safeFilterCounts.roomStates?.inspected || 0,
      selected: filters?.roomStates?.inspected || false,
    },
    {
      id: 'priority',
      label: 'Priority',
      icon: require('../../../../../assets/icons/priority-status.png'),
      iconColor: undefined,
      count: safeFilterCounts.roomStates?.priority || 0,
      selected: filters?.roomStates?.priority || false,
    },
    {
      id: 'paused',
      label: 'Paused',
      icon: require('../../../../../assets/icons/paused-filter-icon.png'),
      iconColor: undefined,
      count: safeFilterCounts.roomStates?.paused || 0,
      selected: filters?.roomStates?.paused || false,
    },
    {
      id: 'refused',
      label: 'Refused',
      icon: require('../../../../../assets/icons/refused-filter-icon.png'),
      iconColor: undefined,
      count: safeFilterCounts.roomStates?.refused || 0,
      selected: filters?.roomStates?.refused || false,
    },
    {
      id: 'returnLater',
      label: 'Return Later',
      icon: require('../../../../../assets/icons/return-later-filter-icon.png'),
      iconColor: undefined,
      count: safeFilterCounts.roomStates?.returnLater || 0,
      selected: filters?.roomStates?.returnLater || false,
    },
  ], [filters?.roomStates, safeFilterCounts?.roomStates]);

  // Front Office Status options
  const frontOfficeOptions = useMemo(() => [
    {
      id: 'arrivals',
      label: 'Arrivals',
      icon: require('../../../../../assets/icons/guest-arrival-icon.png'),
      iconColor: undefined, // No background color, use icon without styling
      count: safeFilterCounts.guests?.arrivals || 0,
      selected: filters?.guests?.arrivals || false,
    },
    {
      id: 'departures',
      label: 'Departures',
      icon: require('../../../../../assets/icons/guest-departure-icon.png'),
      iconColor: undefined, // No background color, use icon without styling
      count: safeFilterCounts.guests?.departures || 0,
      selected: filters?.guests?.departures || false,
    },
    {
      id: 'stayOverWithLinen',
      label: 'Stayover with linen',
      icon: require('../../../../../assets/icons/stayover-line-filter-icon.png'),
      iconColor: undefined,
      count: safeFilterCounts.guests?.stayOverWithLinen || 0,
      selected: filters?.guests?.stayOverWithLinen || false,
    },
    {
      id: 'stayOverNoLinen',
      label: 'Stayover no linen',
      icon: require('../../../../../assets/icons/stayover-no-line-filter-icon.png'),
      iconColor: undefined,
      count: safeFilterCounts.guests?.stayOverNoLinen || 0,
      selected: filters?.guests?.stayOverNoLinen || false,
    },
    {
      id: 'turnDown',
      label: 'Turn Down',
      icon: require('../../../../../assets/icons/turndown-filter-icon.png'),
      iconColor: undefined,
      count: safeFilterCounts.guests?.turnDown || 0,
      selected: filters?.guests?.turnDown || false,
    },
    {
      id: 'noTask',
      label: 'No Task',
      icon: require('../../../../../assets/icons/turndown-filter-icon.png'),
      iconColor: undefined,
      count: safeFilterCounts.guests?.noTask || 0,
      selected: filters?.guests?.noTask || false,
    },
    {
      id: 'checkedIn',
      label: 'Checked In',
      icon: require('../../../../../assets/icons/checked-in-filter-icon.png'),
      iconColor: undefined,
      count: safeFilterCounts.guests?.checkedIn || 0,
      selected: filters?.guests?.checkedIn || false,
    },
    {
      id: 'checkedOut',
      label: 'Checked Out',
      icon: require('../../../../../assets/icons/checked-out-filter-icon.png'),
      iconColor: undefined,
      count: safeFilterCounts.guests?.checkedOut || 0,
      selected: filters?.guests?.checkedOut || false,
    },
    {
      id: 'checkedOutDueIn',
      label: 'Checked Out/Due In',
      icon: require('../../../../../assets/icons/checked-out-due-in-filter-icon.png'),
      iconColor: undefined,
      count: safeFilterCounts.guests?.checkedOutDueIn || 0,
      selected: filters?.guests?.checkedOutDueIn || false,
    },
    {
      id: 'outOfOrder',
      label: 'Out of Order',
      icon: require('../../../../../assets/icons/out-of-order-filter-icon.png'),
      iconColor: undefined,
      count: safeFilterCounts.guests?.outOfOrder || 0,
      selected: filters?.guests?.outOfOrder || false,
    },
    {
      id: 'outOfService',
      label: 'Out of Service',
      icon: require('../../../../../assets/icons/out-of-service-filter-icon.png'),
      iconColor: undefined,
      count: safeFilterCounts.guests?.outOfService || 0,
      selected: filters?.guests?.outOfService || false,
    },
  ], [filters?.guests, safeFilterCounts?.guests]);

  // Reservations Status options
  const reservationsOptions = useMemo(() => [
    {
      id: 'occupied',
      label: 'Occupied',
      icon: require('../../../../../assets/icons/occupied-filter-icon.png'),
      iconColor: undefined,
      count: safeFilterCounts.reservations?.occupied || 0,
      selected: filters?.reservations?.occupied || false,
    },
    {
      id: 'vacant',
      label: 'Vacant',
      icon: require('../../../../../assets/icons/vacant-filter-icon.png'),
      iconColor: undefined,
      count: safeFilterCounts.reservations?.vacant || 0,
      selected: filters?.reservations?.vacant || false,
    },
  ], [filters?.reservations, safeFilterCounts?.reservations]);

  // Show first 5 housekeeping options when collapsed, all when expanded (matching Figma)
  const visibleHousekeeping = expandedSections.housekeeping 
    ? housekeepingOptions 
    : housekeepingOptions.slice(0, 5);
  const hasMoreHousekeeping = housekeepingOptions.length > 5;
  
  // Show first 5 front office options when collapsed, all when expanded (matching Figma)
  const visibleFrontOffice = expandedSections.frontOffice 
    ? frontOfficeOptions 
    : frontOfficeOptions.slice(0, 5);
  const hasMoreFrontOffice = frontOfficeOptions.length > 5;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Filter Icon */}
        {onFilterIconPress && (
          <TouchableOpacity
            style={styles.filterIconContainer}
            onPress={onFilterIconPress}
            activeOpacity={0.7}
          >
            <Image
              source={require('../../../../../assets/icons/menu-icon.png')}
              style={styles.filterIconImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}

        {/* Blurred overlay */}
        <BlurView intensity={80} style={styles.blurOverlay} tint="light">
          <View style={styles.blurDarkener} />
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={onClose}
          />
        </BlurView>

        {/* Modal Content */}
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Rooms Filter</Text>
            </View>

            {/* Content - Scrollable */}
            <ScrollView 
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {/* Housekeeping Status Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Housekeeping Status</Text>
                {visibleHousekeeping.map((option) => {
                  const isCircular = option.iconColor !== undefined;
                  const isPriority = option.id === 'priority';
                  const shouldUseSpecificColor = ['paused', 'refused', 'returnLater'].includes(option.id);
                  const iconTintColor = !isCircular && !isPriority && shouldUseSpecificColor ? '#000001' : undefined;
                  return (
                    <FilterRow
                      key={option.id}
                      label={option.label}
                      icon={option.icon}
                      iconColor={option.iconColor}
                      iconTintColor={iconTintColor}
                      count={option.count}
                      selected={option.selected}
                      onToggle={() => toggleRoomState(option.id as any)}
                      showCount={true}
                      isCircular={isCircular}
                      isPriority={isPriority}
                      rowPaddingVertical={12}
                      labelNumberOfLines={2}
                    />
                  );
                })}
                {hasMoreHousekeeping && (
                  <TouchableOpacity
                    style={styles.seeMoreButton}
                    onPress={() => toggleSection('housekeeping')}
                  >
                    <Text style={styles.seeMoreText}>
                      {expandedSections.housekeeping ? 'see less' : 'see more'}
                    </Text>
                    <Image
                      source={require('../../../../../assets/icons/down-arrow.png')}
                      style={[
                        styles.seeMoreIcon,
                        expandedSections.housekeeping && styles.seeMoreIconRotated
                      ]}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Front Office Status Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Front Office Status</Text>
                {visibleFrontOffice.map((option) => {
                  const isCircular = option.iconColor !== undefined;
                  return (
                    <FilterRow
                      key={option.id}
                      label={option.label}
                      icon={option.icon}
                      iconColor={option.iconColor}
                      count={option.count}
                      selected={option.selected}
                      onToggle={() => toggleGuest(option.id as any)}
                      showCount={true}
                      isCircular={isCircular}
                      rowPaddingVertical={12}
                      labelNumberOfLines={2}
                    />
                  );
                })}
                {hasMoreFrontOffice && (
                  <TouchableOpacity
                    style={styles.seeMoreButton}
                    onPress={() => toggleSection('frontOffice')}
                  >
                    <Text style={styles.seeMoreText}>
                      {expandedSections.frontOffice ? 'see less' : 'see more'}
                    </Text>
                    <Image
                      source={require('../../../../../assets/icons/down-arrow.png')}
                      style={[
                        styles.seeMoreIcon,
                        expandedSections.frontOffice && styles.seeMoreIconRotated
                      ]}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Reservations Status Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Reservations Status</Text>
                {reservationsOptions.map((option) => {
                  const isCircular = option.iconColor !== undefined;
                  return (
                    <FilterRow
                      key={option.id}
                      label={option.label}
                      icon={option.icon}
                      iconColor={option.iconColor}
                      count={option.count}
                      selected={option.selected}
                      onToggle={() => toggleReservation(option.id as 'occupied' | 'vacant')}
                      showCount={false}
                      isCircular={isCircular}
                      rowPaddingVertical={12}
                      labelNumberOfLines={2}
                    />
                  );
                })}
              </View>
            </ScrollView>

            {/* See Rooms Button */}
            <View style={styles.footer}>
              <SeeRoomsButton
                onPress={handleApply}
                resultCount={displayResultCount}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  filterIconContainer: {
    position: 'absolute',
    top: 60 * scaleX,
    right: 20 * scaleX,
    zIndex: 1001,
    width: 40 * scaleX,
    height: 40 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIconImage: {
    width: 24 * scaleX,
    height: 24 * scaleX,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  blurDarkener: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    position: 'absolute',
    top: 100 * scaleX, // Top margin from filter icon
    left: SCREEN_WIDTH * 0.05,
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400 * scaleX,
    bottom: 100 * scaleX, // Increased bottom margin to reduce modal height
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20 * scaleX,
    overflow: 'hidden',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    paddingHorizontal: 20 * scaleX,
    paddingTop: 24 * scaleX,
    paddingBottom: 16 * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.text.primary,
  },
  scrollContent: {
    flex: 1,
    minHeight: 0, // Important for ScrollView to work in flex container
  },
  scrollContentContainer: {
    paddingBottom: 12 * scaleX,
    flexGrow: 1,
  },
  section: {
    paddingHorizontal: 20 * scaleX,
    paddingTop: 20 * scaleX,
    paddingBottom: 12 * scaleX,
  },
  sectionTitle: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.text.primary,
    marginBottom: 16 * scaleX,
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 12 * scaleX,
    marginTop: 4 * scaleX,
    paddingLeft: 0,
  },
  seeMoreText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.regular,
    fontWeight: typography.fontWeights.regular as any,
    color: '#4a91fc',
    marginRight: 4 * scaleX,
  },
  seeMoreIcon: {
    width: 12 * scaleX,
    height: 12 * scaleX,
    tintColor: '#4a91fc',
  },
  seeMoreIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  footer: {
    paddingHorizontal: 20 * scaleX,
    paddingTop: 32 * scaleX,
    paddingBottom: 32 * scaleX,
    alignItems: 'center',
    flexShrink: 0,
  },
});
