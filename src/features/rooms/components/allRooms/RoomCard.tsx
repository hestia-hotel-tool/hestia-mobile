import React, { forwardRef, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { colors, typography } from '@/theme';
import { scaleX } from '../../constants/allRoomsStyles';
import type { RoomCardData, GuestInfo } from '../../types/allRooms.types';
import type { GuestImageAnchorLayout } from '@/components/GuestProfileImageModal';
import { FRONT_OFFICE_STATUS_ICONS, STATUS_CONFIGS } from '../../types/allRooms.types';
import { getStayoverDisplayLabel, showStayoverWithLinenBadge } from '../../utils/stayoverLinen';
import type { ShiftType } from '@features/home';
import {
  CARD_DIMENSIONS,
  CARD_COLORS,
  ROOM_HEADER,
  GUEST_INFO,
  GUEST_CONTAINER_BG,
  STAFF_SECTION,
  DIVIDERS,
  STATUS_BUTTON,
  CONTENT_OFFSET_TOP,
} from '../../constants/allRoomsStyles';
import GuestInfoSection from './GuestInfoSection';
import GuestProfileImageModal from '@/components/GuestProfileImageModal';
import StaffSection from './StaffSection';
import StatusButton from './StatusButton';
import NotesSection from './NotesSection';

/**
 * RoomCard Component
 * 
 * A reusable card component for displaying room information in the All Rooms screen.
 * Supports all room categories:
 * - Arrival/Departure: Shows two guests with divider (292px height)
 * - Departure: Single guest, no ETA (177px height)
 * - Arrival: Single guest with ETA (185px height)
 * - Stayover: Single guest with ETA (185px height)
 * - Turndown: Single guest with ETA (185px height)
 * 
 * Cards with notes have a height of 222px.
 * All positioning and styling matches Figma design specifications.
 */
interface RoomCardProps {
  room: RoomCardData;
  onPress: () => void;
  onStatusPress: () => void;
  onAssignStaffPress?: (room: RoomCardData) => void;
  onLayout?: (event: any) => void;
  statusButtonRef?: (ref: any) => void;
  selectedShift?: ShiftType;
  isChangingStatus?: boolean;
  isAssigningStaff?: boolean;
}

const RoomCard = forwardRef<React.ElementRef<typeof TouchableOpacity>, RoomCardProps>(
  ({ room, onPress, onStatusPress, onAssignStaffPress, onLayout, statusButtonRef, selectedShift, isChangingStatus, isAssigningStaff }, ref) => {
  // Guest profile image modal - opens to the right of guest image
  const [guestProfileModalGuest, setGuestProfileModalGuest] = useState<GuestInfo | null>(null);
  const [guestProfileAnchorLayout, setGuestProfileAnchorLayout] = useState<GuestImageAnchorLayout | null>(null);
  const guestImagePressRef = useRef(false);
  const statusButtonPressRef = useRef(false);

  const handleCardPress = () => {
    if (guestImagePressRef.current) {
      guestImagePressRef.current = false;
      return;
    }
    if (statusButtonPressRef.current) {
      statusButtonPressRef.current = false;
      return;
    }
    onPress();
  };

  const handleStatusPress = () => {
    statusButtonPressRef.current = true;
    onStatusPress();
  };

  const handleGuestImagePress = (guest: GuestInfo, anchorLayout?: GuestImageAnchorLayout) => {
    if (!guest.imageUrl) return;
    guestImagePressRef.current = true;
    setGuestProfileModalGuest(guest);
    setGuestProfileAnchorLayout(anchorLayout ?? null);
  };

  // Card type detection
  const isArrivalDeparture = room.frontOfficeStatus === 'Arrival/Departure';
  const isDeparture = room.frontOfficeStatus === 'Departure';
  const isArrival = room.frontOfficeStatus === 'Arrival';
  const isStayover = room.frontOfficeStatus === 'Stayover';
  const isTurndown = room.frontOfficeStatus === 'Turndown';
  const isVacant = room.guests?.[0]?.isVacant === true;
  const isVacantTurndown = isTurndown && isVacant;
  /** `room_assignments.work_status === 'paused'` — Figma 2333-132 cream card + pause control */
  const isAssignmentPaused = room.roomAttendantAssigned?.assignmentWorkStatus === 'paused';
  const hasNotes = !!room.notes;
  // Only show notes/rush container when there is at least one note, or rushed, or priority (per Figma)
  const showNotesSection =
    !!room.isPriority ||
    (!!room.notes && (room.notes.count > 0 || !!room.notes.hasRushed));
  const hasNotesOrPriority = showNotesSection;

  // Check if any guest names wrap (longer than 18 characters - "Daniel Thompson &")
  const MAX_NAME_LENGTH = 18;
  const wrappedGuestCount = room.guests?.filter(guest => guest.name.length > MAX_NAME_LENGTH).length ?? 0;
  
  // Calculate additional height needed when names wrap
  // Each wrapped name adds: line height (18px) + margin between lines (2px) + margin before date (6px) = 26px total
  // This matches the spacing used in GuestInfoDisplay for consistency
  // Scale using scaleX to match card dimension scaling
  const WRAP_SPACING = GUEST_INFO.name.lineHeight + 2 + 6; // 18 + 2 + 6 = 26px total spacing
  
  // For Arrival/Departure cards: only add one wrap spacing regardless of how many guests wrap
  // The card already has vertical space for 2 guests (292px), so we only need to add height once at the bottom
  // For single guest cards: add height for each wrapped guest name
  const wrappedNameExtraHeight = wrappedGuestCount > 0 
    ? (isArrivalDeparture 
        ? WRAP_SPACING * scaleX // Add only one wrap spacing for Arrival/Departure cards (regardless of how many guests wrap)
        : wrappedGuestCount * WRAP_SPACING * scaleX) // For single guest cards, add for each wrapped name
    : 0;

  // Card height differs by type (different content = different size):
  // - Arrival/Departure: 2 guest infos → tallest (292px base)
  // - Departure (single): 1 guest → 177px base
  // - Arrival, Stayover, Turndown (single): 1 guest → 185px base, or 244px when notes/rush section shown
  const getCardHeight = (): number => {
    let baseHeight: number;
    if (isArrivalDeparture) {
      baseHeight = CARD_DIMENSIONS.heights.arrivalDeparture * scaleX; // 2 guests
    } else if (hasNotesOrPriority) {
      baseHeight = CARD_DIMENSIONS.heights.withNotes * scaleX; // 1 guest + notes/rush section
    } else if (isDeparture) {
      baseHeight = CARD_DIMENSIONS.heights.standard * scaleX; // 1 guest, departure
    } else {
      baseHeight = CARD_DIMENSIONS.heights.withGuestInfo * scaleX; // 1 guest, arrival/stayover/turndown
    }
    return baseHeight + wrappedNameExtraHeight;
  };

  // Card background: priority tint, else paused cream (Figma), else default
  const getCardStyles = () => {
    if (isAssignmentPaused && !room.isPriority) {
      return {
        backgroundColor: CARD_COLORS.pausedBackground,
        borderColor: CARD_COLORS.border,
        borderWidth: 1,
      };
    }
    return {
      backgroundColor: CARD_COLORS.background,
      borderColor: CARD_COLORS.border,
      borderWidth: 1,
    };
  };

  // Guest block height and vertical positioning for single-guest cards
  // For cards without notes/priority, keep the guest block closer to the card bottom so layout feels grounded
  const GUEST_BLOCK_BASE_TOP = GUEST_CONTAINER_BG.positions.arrival.top * scaleX;
  const GUEST_BLOCK_BASE_HEIGHT = GUEST_CONTAINER_BG.positions.arrival.height * scaleX;
  const cardHeight = getCardHeight();
  const isSingleGuestWithBg = !isArrivalDeparture && !hasNotesOrPriority && !isVacantTurndown;
  const guestBlockHeight = isSingleGuestWithBg
    ? GUEST_BLOCK_BASE_HEIGHT + wrappedNameExtraHeight
    : GUEST_BLOCK_BASE_HEIGHT;
  const SINGLE_GUEST_BOTTOM_MARGIN = 16 * scaleX; // Space from bottom of card for single-guest block
  const guestBlockTop = isSingleGuestWithBg
    ? Math.max(GUEST_BLOCK_BASE_TOP, cardHeight - guestBlockHeight - SINGLE_GUEST_BOTTOM_MARGIN)
    : GUEST_BLOCK_BASE_TOP;
  // Offset to apply to guest content so it moves with the guest container (in px)
  const contentVerticalOffsetPx = isSingleGuestWithBg
    ? guestBlockTop - GUEST_BLOCK_BASE_TOP
    : 0;
  // Vertical center for status button within the single-guest block (so it aligns with GuestInfoDisplay)
  const singleGuestStatusTopPx = isSingleGuestWithBg
    ? guestBlockTop + (guestBlockHeight - STATUS_BUTTON.height * scaleX) / 2
    : undefined;

  // Determine guest container background style
  const getGuestContainerBgStyle = () => {
    if (isArrivalDeparture || hasNotesOrPriority) {
      return null; // No background when notes section is shown (notes or priority)
    }
    // Single-guest cards: use bottom-anchored, expandable block (height includes wrap space). Others use fixed position.
    if (isSingleGuestWithBg) {
      return [styles.guestContainerBg, { top: guestBlockTop, height: guestBlockHeight }];
    }
    return [styles.guestContainerBg, styles.guestContainerBgArrival];
  };

  const cardStyles = getCardStyles();
  const guestContainerBgStyle = getGuestContainerBgStyle();

  return (
    <TouchableOpacity
      ref={ref}
      style={[
        styles.container,
        {
          height: getCardHeight(),
          ...cardStyles,
        },
      ]}
      onPress={handleCardPress}
      onLayout={onLayout}
      activeOpacity={0.6} // Slightly lower opacity for smoother press feedback
    >
      {/* Room Header Section */}
      <View style={styles.roomHeader}>
        {/* Category Icon Badge */}
        <View style={[
          styles.roomBadge,
          !room.isPriority && styles.roomBadgeStandard,
          isArrivalDeparture && styles.roomBadgeArrivalDeparture
        ]}>
          <Image
            source={FRONT_OFFICE_STATUS_ICONS[room.frontOfficeStatus]}
            style={[
              styles.roomIcon,
              isArrivalDeparture && styles.roomIconArrivalDeparture
            ]}
            resizeMode="contain"
          />
        </View>
        
        {/* Room Number */}
        <View style={[
          styles.roomInfo,
          !room.isPriority && styles.roomInfoStandard
        ]}>
          <Text
            style={[
              styles.roomNumber,
              isAssignmentPaused && !room.isPriority && styles.roomHeaderPausedNumber,
            ]}
          >
            {room.roomNumber}
          </Text>
        </View>
        
        {/* Room Type + Credit display: "ST2K - 45", "ST2K - 60", etc. + red flag when room is flagged */}
        <View style={[
          styles.roomTypeRow,
          !room.isPriority && styles.roomTypeRowStandard,
        ]}>
          <Text
            style={[
              styles.roomTypeText,
              isAssignmentPaused && !room.isPriority && styles.roomHeaderPausedSecondary,
            ]}
          >
            {`${room.roomCategory} - ${room.credit}`}
          </Text>
          {room.flagged && (
            <Image
              source={require('../../../../../assets/icons/flag.png')}
              style={styles.roomTypeFlagIcon}
              resizeMode="contain"
              tintColor="#f92424"
            />
          )}
        </View>
        
        {/* Front Office Status Label: "Stayover" + "with Linen" badge when applicable, or other status */}
        <View style={[
          styles.categoryLabelRow,
          !room.isPriority && styles.categoryLabelRowStandard
        ]}>
          <Text
            style={[
              styles.categoryLabel,
              isAssignmentPaused && !room.isPriority && styles.roomHeaderPausedCategory,
            ]}
          >
            {getStayoverDisplayLabel(room)}
          </Text>
          {isStayover && showStayoverWithLinenBadge(room) && (
            <View style={[
              styles.withLinenBadge,
              room.isPriority && styles.withLinenBadgePriority,
            ]}>
              <Text style={styles.withLinenBadgeText}>
                with Linen
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Guest Container Background - for standard cards without notes; centered when single-guest (incl. wrapped names) */}
      {guestContainerBgStyle && (
        <View style={guestContainerBgStyle} />
      )}

      {/* Horizontal divider between guests for Arrival/Departure cards - render FIRST so it's below guest names */}
      {isArrivalDeparture && (
        <View style={styles.guestDividerLine} />
      )}

      {/* Guest Information Sections or Vacant row */}
      {isVacantTurndown ? (
        <View
          style={[
            styles.vacantRowContainer,
            {
              top: GUEST_CONTAINER_BG.positions.turndown.top * scaleX,
              left: GUEST_CONTAINER_BG.left * scaleX,
              width: GUEST_CONTAINER_BG.width * scaleX,
              height: GUEST_CONTAINER_BG.positions.turndown.height * scaleX,
            },
          ]}
        >
          <View style={styles.vacantLeft}>
            <Image
              source={require('../../../../../assets/icons/vacant-chair.png')}
              style={styles.vacantIcon}
              resizeMode="contain"
            />
            <Text
              style={styles.vacantText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Vacant
            </Text>
          </View>
          {(isAssignmentPaused || STATUS_CONFIGS[room.houseKeepingStatus]?.icon) && (
            <TouchableOpacity
              onPress={handleStatusPress}
              activeOpacity={0.8}
              style={styles.vacantStatusButton}
            >
              {isAssignmentPaused ? (
                <Image
                  source={require('../../../../../assets/icons/pause.png')}
                  style={styles.vacantStatusIconPaused}
                  resizeMode="contain"
                />
              ) : (
                <Image
                  source={STATUS_CONFIGS[room.houseKeepingStatus].icon}
                  style={styles.vacantStatusIcon}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : (
        room.guests.map((guest, index) => {
          const isFirstGuest = index === 0;
          const isSecondGuest = index === 1;
          
          return (
            <GuestInfoSection
              key={`guest-${index}`}
              guest={guest}
              vipCode={guest.vipCode}
              isPriority={room.isPriority}
              isFirstGuest={isFirstGuest}
              isSecondGuest={isSecondGuest}
              hasNotes={hasNotes}
              frontOfficeStatus={room.frontOfficeStatus}
              isArrivalDeparture={isArrivalDeparture}
              selectedShift="AM"
              onGuestImagePress={handleGuestImagePress}
              contentVerticalOffsetPx={isFirstGuest && isSingleGuestWithBg ? contentVerticalOffsetPx : undefined}
            />
          );
        })
      )}

      {/* Vertical Divider - separates room info from staff section */}
      <View style={[
        styles.dividerVertical,
        !room.isPriority && styles.dividerVerticalStandard
      ]} />

      {/* Staff Section - or "Assign Staff" when no one assigned */}
      <StaffSection
        staff={room.roomAttendantAssigned}
        roomId={room.id}
        roomStatus={room.houseKeepingStatus}
        isPriority={room.isPriority}
        frontOfficeStatus={room.frontOfficeStatus}
        selectedShift={selectedShift ?? 'AM'}
        onAssignPress={room.roomAttendantAssigned == null ? () => onAssignStaffPress?.(room) : undefined}
        onStaffSectionPress={room.roomAttendantAssigned != null ? () => onAssignStaffPress?.(room) : undefined}
        isLoading={isAssigningStaff}
      />

      {/* Status Button - horizontally centered; vertically centered only on single-guest no-notes to avoid overlapping guest info */}
      {!isVacantTurndown && (
        <StatusButton
          ref={statusButtonRef}
          status={room.houseKeepingStatus}
          onPress={handleStatusPress}
          isPriority={room.isPriority}
          isArrivalDeparture={isArrivalDeparture}
          hasNotes={hasNotes}
          frontOfficeStatus={room.frontOfficeStatus}
          cardHeight={cardHeight}
          buttonTopOverridePx={singleGuestStatusTopPx}
          isLoading={isChangingStatus}
          assignmentPaused={isAssignmentPaused}
        />
      )}

      {/* Notes/Rush container - only when there is a note, rush, or priority (Figma: clear padding from card and guest info) */}
      {showNotesSection && (
        <NotesSection
          notes={room.notes || { count: 0, hasRushed: false }}
          isArrivalDeparture={isArrivalDeparture}
          isPriority={room.isPriority}
          cardHeight={cardHeight}
        />
      )}

      {/* Guest profile image modal - opens to the right of guest image, 296×296, 5px radius */}
      <GuestProfileImageModal
        visible={!!guestProfileModalGuest}
        onClose={() => { setGuestProfileModalGuest(null); setGuestProfileAnchorLayout(null); }}
        guest={guestProfileModalGuest?.imageUrl ? { imageUrl: guestProfileModalGuest.imageUrl, name: guestProfileModalGuest.name } : null}
        anchorLayout={guestProfileAnchorLayout}
      />
    </TouchableOpacity>
  );
});

export default RoomCard;

const styles = StyleSheet.create({
  container: {
    // backgroundColor is set dynamically based on status
    borderRadius: CARD_DIMENSIONS.borderRadius * scaleX,
    // borderWidth and borderColor are set dynamically based on status
    marginHorizontal: CARD_DIMENSIONS.marginHorizontal * scaleX,
    marginBottom: CARD_DIMENSIONS.marginBottom * scaleX,
    position: 'relative',
    width: CARD_DIMENSIONS.width * scaleX,
    alignSelf: 'center', // Center cards horizontally to match Figma
    overflow: 'visible', // Changed to visible to prevent clipping guest names
  },
  priorityBorder: {
    borderColor: CARD_COLORS.priorityBorder,
    borderWidth: 1,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: ROOM_HEADER.paddingTop * scaleX,
    paddingHorizontal: ROOM_HEADER.paddingHorizontal * scaleX,
    marginBottom: 0,
    position: 'relative',
  },
  roomBadge: {
    position: 'absolute',
    width: ROOM_HEADER.icon.width * scaleX,
    height: ROOM_HEADER.icon.height * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    left: ROOM_HEADER.icon.left * scaleX,
    top: ROOM_HEADER.icon.top * scaleX,
  },
  roomBadgeArrivalDeparture: {
    width: ROOM_HEADER.iconArrivalDeparture.width * scaleX,
    height: ROOM_HEADER.iconArrivalDeparture.height * scaleX,
  },
  roomBadgeStandard: {
    left: ROOM_HEADER.iconStandard.left * scaleX,
  },
  roomIcon: {
    width: ROOM_HEADER.icon.width * scaleX,
    height: ROOM_HEADER.icon.height * scaleX,
  },
  roomIconArrivalDeparture: {
    width: ROOM_HEADER.iconArrivalDeparture.width * scaleX,
    height: ROOM_HEADER.iconArrivalDeparture.height * scaleX,
  },
  roomInfo: {
    position: 'absolute',
    left: ROOM_HEADER.roomNumber.left * scaleX,
    top: ROOM_HEADER.roomNumber.top * scaleX,
  },
  roomInfoStandard: {
    left: ROOM_HEADER.roomNumberStandard.left * scaleX,
  },
  roomNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8 * scaleX,
  },
  roomNumber: {
    fontSize: ROOM_HEADER.roomNumber.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: ROOM_HEADER.roomNumber.color,
    lineHeight: ROOM_HEADER.roomNumber.lineHeight * scaleX,
  },
  roomHeaderPausedNumber: {
    color: '#334866',
  },
  roomTypeRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6 * scaleX,
    left: ROOM_HEADER.roomType.left * scaleX,
    top: ROOM_HEADER.roomType.top * scaleX,
  },
  roomTypeRowStandard: {
    left: ROOM_HEADER.roomTypeStandard.left * scaleX,
  },
  roomTypeText: {
    fontSize: ROOM_HEADER.roomType.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.light as any,
    color: ROOM_HEADER.roomType.color,
    lineHeight: ROOM_HEADER.roomType.lineHeight * scaleX,
  },
  roomHeaderPausedSecondary: {
    color: '#6C7D99',
  },
  roomTypeFlagIcon: {
    width: 14 * scaleX,
    height: 14 * scaleX,
  },
  priorityTextHeader: {
    fontSize: ROOM_HEADER.priorityBadge.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.light as any,
    color: ROOM_HEADER.priorityBadge.color,
    lineHeight: ROOM_HEADER.roomType.lineHeight * scaleX,
  },
  categoryLabelRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    left: ROOM_HEADER.category.left * scaleX,
    top: ROOM_HEADER.category.top * scaleX,
    gap: 6 * scaleX,
  },
  categoryLabelRowStandard: {
    left: ROOM_HEADER.categoryStandard.left * scaleX,
  },
  categoryLabel: {
    fontSize: ROOM_HEADER.category.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: ROOM_HEADER.category.color,
    lineHeight: ROOM_HEADER.category.lineHeight * scaleX,
  },
  roomHeaderPausedCategory: {
    color: '#334866',
  },
  withLinenBadge: {
    paddingHorizontal: 8 * scaleX,
    paddingVertical: 2 * scaleX,
    borderRadius: 6 * scaleX,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(123, 31, 162, 0.5)',
  },
  withLinenBadgePriority: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: 'rgba(123, 31, 162, 0.6)',
  },
  withLinenBadgePM: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(179, 136, 255, 0.7)',
  },
  withLinenBadgeText: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#334866',
  },
  withLinenBadgeTextPM: {
    color: '#FFFFFF',
  },
  guestContainerBg: {
    position: 'absolute',
    left: GUEST_CONTAINER_BG.left * scaleX,
    width: GUEST_CONTAINER_BG.width * scaleX,
    borderRadius: GUEST_CONTAINER_BG.borderRadius * scaleX,
    backgroundColor: GUEST_CONTAINER_BG.background,
  },
  guestContainerBgDeparture: {
    height: GUEST_CONTAINER_BG.positions.departure.height * scaleX,
    top: GUEST_CONTAINER_BG.positions.departure.top * scaleX,
  },
  guestContainerBgArrival: {
    height: GUEST_CONTAINER_BG.positions.arrival.height * scaleX,
    top: GUEST_CONTAINER_BG.positions.arrival.top * scaleX,
  },
  dividerVertical: {
    position: 'absolute',
    left: STAFF_SECTION.divider.left * scaleX,
    top: STAFF_SECTION.divider.top * scaleX,
    width: STAFF_SECTION.divider.width,
    height: STAFF_SECTION.divider.height * scaleX,
    backgroundColor: STAFF_SECTION.divider.color,
  },
  dividerVerticalStandard: {
    left: STAFF_SECTION.dividerStandard.left * scaleX,
    top: (STAFF_SECTION.dividerStandard.top ?? STAFF_SECTION.divider.top) * scaleX,
  },
  roomNumberPM: {
    color: colors.text.white,
  },
  roomTypePM: {
    color: colors.text.white,
  },
  categoryLabelPM: {
    color: colors.text.white,
  },
  guestDividerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (75 + CONTENT_OFFSET_TOP) * scaleX, // Between two guests; moved down with content offset
    height: DIVIDERS.horizontal.height,
    backgroundColor: DIVIDERS.horizontal.color,
    zIndex: 1,
    elevation: 1,
  },
  vacantRowContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16 * scaleX,
    width: '100%',
  },
  vacantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  vacantIcon: {
    width: GUEST_INFO.icon.width * scaleX,
    height: GUEST_INFO.icon.height * scaleX,
    tintColor: undefined,
  },
  vacantIconPM: {
    tintColor: '#ffffff',
  },
  vacantText: {
    marginLeft: 6 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    fontStyle: 'normal',
    fontWeight: '700',
    color: '#FFF',
    lineHeight: undefined, // normal line height
    flexShrink: 1,
  },
  vacantStatusButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  vacantStatusIcon: {
    width: STATUS_BUTTON.iconInProgress.width * scaleX,
    height: STATUS_BUTTON.iconInProgress.height * scaleX,
  },
  vacantStatusIconPaused: {
    width: STATUS_BUTTON.iconInProgress.width * scaleX,
    height: STATUS_BUTTON.iconInProgress.height * scaleX,
    tintColor: '#000000',
  },
});

