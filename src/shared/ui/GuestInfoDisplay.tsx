import React, { useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { typography } from '../theme';
import { GUEST_INFO, CARD_DIMENSIONS, GUEST_CONTAINER_BG, STATUS_BUTTON } from '@/constants/allRoomsStyles';
import { normalizedScaleX } from '../utils/responsive';
import { formatGuestCount, formatDatesOfStay } from '../utils/formatting';
import type { GuestInfo } from '@/types/allRooms.types';
import type { GuestImageAnchorLayout } from './GuestProfileImageModal';

interface GuestInfoDisplayProps {
  guest: GuestInfo;
  vipCode?: number;
  numberBadge?: string; // Alternative to vipCode (for room detail screen)
  isPriority?: boolean;
  isFirstGuest?: boolean;
  isSecondGuest?: boolean;
  hasNotes?: boolean;
  category?: string; // To determine if it's Arrival vs Departure
  isArrivalDeparture?: boolean; // To know if this is an Arrival/Departure card
  themeVariant?: 'am' | 'pm';
  // Positioning props for flexible usage
  containerLeft?: number; // Override container left position
  nameTop?: number; // Override name top position
  dateTop?: number; // Override date top position
  // Custom positioning overrides for room detail screen
  iconLeft?: number; // Override icon left position (relative to container)
  iconTop?: number; // Override icon top position (relative to container)
  nameLeft?: number; // Override name left position (relative to container)
  badgeLeft?: number; // Override badge left position (relative to container)
  badgeTop?: number; // Override badge top position (relative to container)
  dateLeft?: number; // Override date left position (relative to container)
  timeLeft?: number; // Override time left position (relative to container)
  timeTop?: number; // Override time top position
  countIconLeft?: number; // Override count icon left position (relative to container)
  countTextLeft?: number; // Override count text left position (relative to container)
  countTop?: number; // Override count top position
  // For absolute positioning contexts (like room detail)
  absolutePositioning?: boolean;
  absoluteTop?: number; // Absolute top position from parent
  hideNameRow?: boolean; // Hide the name row (used when parent renders it)
  /** When provided and guest has imageUrl, tapping the guest image calls this with guest and anchor layout for positioning */
  onGuestImagePress?: (guest: GuestInfo, anchorLayout?: GuestImageAnchorLayout) => void;
  /** Vertical offset in px to center guest block (e.g. when name wraps on All Rooms single-guest cards) */
  contentVerticalOffsetPx?: number;
}

/**
 * Reusable Guest Info Display Component
 * Matches the styling and alignment from All Rooms cards
 * Can be used in Room Detail screen, All Rooms cards, and anywhere else
 */
export default function GuestInfoDisplay({ 
  guest, 
  vipCode,
  numberBadge,
  isPriority = false,
  isFirstGuest = true,
  isSecondGuest = false,
  hasNotes = false,
  category = '',
  isArrivalDeparture = false,
  themeVariant = 'am',
  containerLeft,
  nameTop,
  dateTop,
  iconLeft,
  iconTop,
  nameLeft,
  badgeLeft,
  badgeTop,
  dateLeft,
  timeLeft,
  timeTop,
  countIconLeft,
  countTextLeft,
  countTop,
  absolutePositioning = false,
  absoluteTop,
  hideNameRow = false,
  onGuestImagePress,
  contentVerticalOffsetPx,
}: GuestInfoDisplayProps) {
  const guestImageWrapRef = useRef<View>(null);
  const contentOffsetStyle = contentVerticalOffsetPx != null && contentVerticalOffsetPx !== 0
    ? { marginTop: contentVerticalOffsetPx }
    : undefined;

  // Determine card type characteristics
  const isArrival = category === 'Arrival';
  const isDeparture = category === 'Departure';
  const isStayover = category === 'Stayover';
  const isTurndown = category === 'Turndown';
  const isNoTask = category === 'No Task';
  
  // Determine which guest icon to use based on card category
  // For Arrival/Departure cards: first guest = Arrival icon, second guest = Departure icon (Figma)
  let guestIconSource;
  if (isArrivalDeparture || category === 'ArrivalDeparture') {
    guestIconSource = isSecondGuest
      ? require('../../../assets/icons/guest-departure-icon.png')
      : require('../../../assets/icons/guest-arrival-icon.png');
  } else if (isStayover || isNoTask) {
    guestIconSource = require('../../../assets/icons/stayover-guest_icon.png');
  } else if (isTurndown) {
    guestIconSource = require('../../../assets/icons/moon.png');
  } else if (isArrival || guest.timeLabel === 'ETA') {
    // Use arrival icon if category is Arrival OR guest has ETA timeLabel
    guestIconSource = require('../../../assets/icons/guest-arrival-icon.png');
  } else if (isDeparture || guest.timeLabel === 'EDT') {
    // Use departure icon if category is Departure OR guest has EDT timeLabel
    guestIconSource = require('../../../assets/icons/guest-departure-icon.png');
  } else {
    guestIconSource = require('../../../assets/icons/guest-icon.png');
  }
  
  // Determine container left position - use override if provided, otherwise calculate
  const calculatedContainerLeft = containerLeft !== undefined
    ? containerLeft
    : isPriority 
      ? GUEST_INFO.container.left 
      : hasNotes || isTurndown || isStayover || isNoTask
        ? GUEST_INFO.containerWithNotes.left 
        : GUEST_INFO.containerStandard.left;

  // Determine name top position - use override if provided, otherwise calculate
  // For Arrival/Departure cards (with or without isPriority), use first/second guest positions
  const calculatedNameTop = nameTop !== undefined
    ? nameTop
    : (isArrivalDeparture || category === 'ArrivalDeparture')
      ? (isSecondGuest ? GUEST_INFO.nameSecond.top : GUEST_INFO.name.top)
      : isPriority
        ? (isSecondGuest ? GUEST_INFO.nameSecond.top : GUEST_INFO.name.top)
          : hasNotes || isTurndown || isStayover || isNoTask
          ? GUEST_INFO.nameWithNotes.top
          : GUEST_INFO.nameStandardArrival.top; // Arrival, Departure, Stayover, Turndown: same position

  // Determine date range top position - use override if provided, otherwise calculate
  // For Arrival/Departure cards (with or without isPriority), use first/second guest positions
  const calculatedDateTop = dateTop !== undefined
    ? dateTop
    : (isArrivalDeparture || category === 'ArrivalDeparture')
      ? (isSecondGuest ? GUEST_INFO.dateRangeSecond.top : GUEST_INFO.dateRange.top)
      : isPriority
        ? (isSecondGuest ? GUEST_INFO.dateRangeSecond.top : GUEST_INFO.dateRange.top)
          : hasNotes || isTurndown || isStayover || isNoTask
          ? GUEST_INFO.dateRangeWithNotes.top
          : GUEST_INFO.dateRangeStandardArrival.top; // Arrival, Departure, Stayover, Turndown: same position

  // Max name length: "Daniel Thompson &" = 18 characters
  // If name exceeds this length, truncate at 18 chars and wrap remainder to next line
  const MAX_NAME_LENGTH = 18;
  const shouldWrapName = guest.name.length > MAX_NAME_LENGTH;
  
  // Adjust date top position when name wraps - add extra space for wrapped line
  // When name wraps: 
  // - Second line takes up full line height (18px)
  // - Margin between lines (2px scaled in styles)
  // - Margin before date (6px for better spacing)
  // Total: lineHeight + marginTop + bottomMargin = 18 + 2 + 6 = 26px total
  // We need to account for the full height of the second line plus adequate spacing
  const secondLineMarginTop = 2; // Margin between first and second line (scaled in styles)
  const bottomMargin = 6; // Margin between second line and date (increased for better spacing)
  const WRAP_SPACING = GUEST_INFO.name.lineHeight + secondLineMarginTop + bottomMargin; // 18 + 2 + 6 = 26px total
  const adjustedDateTop = shouldWrapName 
    ? calculatedDateTop + WRAP_SPACING
    : calculatedDateTop;

  // Determine time (ETA/EDT) position - use override if provided
  // For Arrival/Stayover/Turndown cards, align time with date range row
  // No Task: no ETA shown
  // For Arrival/Departure cards, use first/second guest positions
  const timePos: { left: number; top: number } | null = isNoTask
    ? null
    : timeLeft !== undefined && timeTop !== undefined
      ? { left: timeLeft, top: timeTop }
      : (isArrivalDeparture || category === 'ArrivalDeparture')
        ? (isSecondGuest ? GUEST_INFO.time.positions.prioritySecond : GUEST_INFO.time.positions.priorityFirst)
        : isPriority
          ? (isSecondGuest ? GUEST_INFO.time.positions.prioritySecond : GUEST_INFO.time.positions.priorityFirst)
          : hasNotes || isTurndown || isStayover
            ? GUEST_INFO.time.positions.withNotes
            : isArrival || isStayover || isTurndown
              ? {
                  // Align time with date range row (top 109px) for proper alignment
                  // Use adjustedDateTop to account for wrapped names
                  left: GUEST_INFO.time.positions.standardArrival.left,
                  top: adjustedDateTop, // Use adjusted date top to account for wrapped names
                }
              : null; // Departure cards don't show time

  // Determine guest count position - use override if provided
  // Note: For Arrival/Departure cards, guest count should align with date range (same top position)
  // No Task: no guest count shown
  // For Arrival/Departure cards (with or without isPriority), use first/second guest positions
  const countPos: { iconLeft: number; textLeft: number; top?: number; iconTop?: number; textTop?: number } | null = isNoTask
    ? null
    : countIconLeft !== undefined && countTextLeft !== undefined
      ? { 
          iconLeft: countIconLeft, 
          textLeft: countTextLeft, 
          top: countTop,
          iconTop: countTop,
          textTop: countTop 
        }
      : (isArrivalDeparture || category === 'ArrivalDeparture')
        ? {
            // For Arrival/Departure cards, align guest count with date range row
            iconLeft: isSecondGuest ? GUEST_INFO.guestCount.positions.prioritySecond.iconLeft : GUEST_INFO.guestCount.positions.priorityFirst.iconLeft,
            textLeft: isSecondGuest ? GUEST_INFO.guestCount.positions.prioritySecond.textLeft : GUEST_INFO.guestCount.positions.priorityFirst.textLeft,
            iconTop: adjustedDateTop, // Align with adjusted date range (accounts for wrapped names)
            textTop: adjustedDateTop, // Align with adjusted date range (accounts for wrapped names)
          }
        : isPriority
          ? (isSecondGuest ? GUEST_INFO.guestCount.positions.prioritySecond : GUEST_INFO.guestCount.positions.priorityFirst)
            : hasNotes || isTurndown || isStayover
            ? GUEST_INFO.guestCount.positions.withNotes
            : GUEST_INFO.guestCount.positions.standardArrival; // Arrival, Departure, Stayover, Turndown: same position

  // Priority badge positioning - use override if provided
  // Note: For Arrival/Departure cards, badge is now inline with name using flexbox, so absolute positioning is not used
  const priorityBadgeLeft = badgeLeft !== undefined
    ? badgeLeft
    : isPriority 
      ? (isSecondGuest ? GUEST_INFO.priorityBadge.positions.secondGuest.left : GUEST_INFO.priorityBadge.positions.firstGuest.left)
      : GUEST_INFO.priorityBadge.positions.standard.left;
  const priorityBadgeTop = badgeTop !== undefined
    ? badgeTop
    : isPriority
      ? (isSecondGuest ? GUEST_INFO.priorityBadge.positions.secondGuest.top : GUEST_INFO.priorityBadge.positions.firstGuest.top)
      : GUEST_INFO.priorityBadge.positions.standard.top;

  // Determine guest icon absolute positioning
  // If iconLeft is provided, use it for absolute positioning
  // For Arrival/Departure cards (with or without isPriority), use first/second guest positions
  let guestIconPos: { left: number; top: number } | null = null;
  if (iconLeft !== undefined) {
    // Use custom iconLeft and iconTop for room detail screen
    guestIconPos = {
      left: iconLeft,
      top: iconTop !== undefined ? iconTop : calculatedNameTop, // Use iconTop if provided, otherwise same as name
    };
  } else if (isArrivalDeparture || category === 'ArrivalDeparture') {
    // For all Arrival/Departure cards (priority or not), use first/second guest positions
    guestIconPos = isSecondGuest
      ? GUEST_INFO.iconArrivalDeparture.positions.secondGuest
      : GUEST_INFO.iconArrivalDeparture.positions.firstGuest;
  } else if ((isArrival || isDeparture || isStayover || isTurndown) && !hasNotes) {
    // Arrival, Departure, Stayover, Turndown: same icon position (align with stayover, turndown, etc.)
    guestIconPos = {
      left: GUEST_INFO.iconStandardArrival.left,
      top: GUEST_INFO.iconStandardArrival.top,
    };
  } else if (hasNotes || isTurndown || isStayover || isNoTask) {
    guestIconPos = {
      left: GUEST_INFO.iconWithNotes.left,
      top: GUEST_INFO.iconWithNotes.top,
    };
  }

  const isPMTheme = themeVariant === 'pm';
  const isVacantGuest = guest.isVacant === true;

  // Determine icon tint color
  const iconTintColor: string | undefined = isPMTheme
    ? '#ffffff'
    : (isArrivalDeparture || isArrival || isDeparture || isStayover || isTurndown || isNoTask)
      ? undefined // Preserve original icon colors
      : '#334866'; // Default color for other icons

  // Use numberBadge if provided, otherwise use vipCode
  const displayBadge = numberBadge || (vipCode ? vipCode.toString() : undefined);

  const hasGuestImage = !!guest.imageUrl;
  const guestImageWidth = GUEST_INFO.guestImage.width * normalizedScaleX;
  const guestImageHeight = GUEST_INFO.guestImage.height * normalizedScaleX;
  const guestImageRadius = GUEST_INFO.guestImage.borderRadius * normalizedScaleX;
  const guestImageGap = GUEST_INFO.guestImage.marginRight * normalizedScaleX;
  const infoGap = GUEST_INFO.infoColumn.gapBetweenNameAndDate * normalizedScaleX;

  // Two-column layout: when hasGuestImage, container starts at image position
  const effectiveContainerLeft =
    hasGuestImage && guestIconPos
      ? guestIconPos.left
      : calculatedContainerLeft;
  const effectiveContainerWidth =
    (CARD_DIMENSIONS.width - effectiveContainerLeft - 14) * normalizedScaleX;

  // Max name length: "Eric Coleman & Glenn" = 23 characters
  // If name exceeds this length, truncate at 23 chars and wrap remainder to next line
  const firstNamePart = shouldWrapName 
    ? guest.name.substring(0, MAX_NAME_LENGTH).trim()
    : guest.name;
  const secondNamePart = shouldWrapName 
    ? guest.name.substring(MAX_NAME_LENGTH).trim()
    : null;
  
  // Calculate positions for absolute positioning mode
  const containerStyle = absolutePositioning && absoluteTop !== undefined
    ? { top: absoluteTop * normalizedScaleX }
    : {};

  // Calculate guest count positions for Arrival, Stayover, Turndown (separate row below date)
  // Show time (ETA/EDT) only when label and value exist and are not N/A
  const hasTime = guest.timeLabel && guest.time && guest.timeLabel !== 'N/A' && guest.time !== 'N/A';
  const hasGuestCount = guest.guestCount && guest.guestCount.adults !== undefined;
  const hasDatesOfStay = guest.datesOfStay && guest.datesOfStay.from && guest.datesOfStay.to;
  
  // Determine layout pattern:
  // - If datesOfStay, guest count, and ETA/EDT are all present: datesOfStay + guest count on first line, ETA/EDT on second line
  // - If ETA/EDT is missing: datesOfStay + guest count on same line
  const shouldSplitTimeToNewLine = hasDatesOfStay && hasGuestCount && hasTime;
  const shouldShowGuestCountBelow = countPos && 
    !(timeLeft !== undefined && timeTop !== undefined) && // Not Room Detail screen
    !(isArrivalDeparture || category === 'ArrivalDeparture') && // Not Arrival/Departure
    ((isArrival || isStayover || isTurndown) || (isDeparture && countIconLeft !== undefined && countTextLeft !== undefined)) &&
    hasTime && // Time must exist
    hasGuestCount; // Guest count must exist
  
  // Calculate guest count top position based on adjustedDateTop (which accounts for wrapped names)
  // This ensures guest count is positioned correctly below the date, even when name wraps
  // For Arrival/Stayover/Turndown: position below date range with proper spacing
  // When date and time are on same row, use the taller lineHeight (time: 18px vs date: 17px)
  // Spacing: max lineHeight (18px) + gap (2px) = 20px total spacing from date top (reduced from 4px)
  const dateTimeRowHeight = (isArrival || isStayover || isTurndown) && guest.timeLabel && guest.time && guest.timeLabel !== 'N/A'
    ? Math.max(GUEST_INFO.dateRange.lineHeight, GUEST_INFO.time.lineHeight) // Use taller lineHeight when time is present
    : GUEST_INFO.dateRange.lineHeight; // Just date lineHeight when no time
  const guestCountTop = shouldShowGuestCountBelow
    ? (countTop !== undefined
        ? countTop * normalizedScaleX // Use custom position if provided (Room Detail screen)
        : hasNotes
          ? ((GUEST_INFO.guestCount.positions.withNotes.iconTop ?? 0)) * normalizedScaleX
          : (adjustedDateTop + dateTimeRowHeight + 2) * normalizedScaleX) // Use adjustedDateTop + dateTimeRowHeight + 2px gap (reduced from 4px)
    : 0;

  // Guest count top is already adjusted (uses adjustedDateTop), so no additional adjustment needed
  const adjustedGuestCountTop = guestCountTop;
  const iconVerticalOffset = shouldShowGuestCountBelow
    ? (GUEST_INFO.guestCount.lineHeight * normalizedScaleX - GUEST_INFO.guestCount.icon.height * normalizedScaleX) / 2
    : 0;
  const guestCountIconLeft = shouldShowGuestCountBelow
    ? (countIconLeft !== undefined
        ? countIconLeft * normalizedScaleX // Use custom position if provided (Room Detail screen)
        : hasNotes 
          ? ((GUEST_INFO.guestCount.positions.withNotes.iconLeft) - calculatedContainerLeft) * normalizedScaleX
          : ((GUEST_INFO.guestCount.positions.standardArrival.iconLeft) - calculatedContainerLeft) * normalizedScaleX)
    : 0;
  const guestCountTextLeft = shouldShowGuestCountBelow
    ? (countTextLeft !== undefined
        ? countTextLeft * normalizedScaleX // Use custom position if provided (Room Detail screen)
        : hasNotes
          ? ((GUEST_INFO.guestCount.positions.withNotes.textLeft) - calculatedContainerLeft) * normalizedScaleX
          : ((GUEST_INFO.guestCount.positions.standardArrival.textLeft) - calculatedContainerLeft) * normalizedScaleX)
    : 0;

  // Calculate container width using relative approach
  // Reserve space for status button: use percentage-based calculation
  // Status button takes ~31% of card width (134/426), reserve ~4% padding
  // Guest name area should be ~52% of card width (from left edge to before status button)
  const STATUS_BUTTON_WIDTH_PERCENT = 0.31; // 31% for status button
  const PADDING_PERCENT = 0.04; // 4% padding between name and button
  const GUEST_AREA_MAX_PERCENT = 0.52; // 52% max width for guest info area
  
  const cardWidthScaled = CARD_DIMENSIONS.width * normalizedScaleX;
  const containerLeftScaled = calculatedContainerLeft * normalizedScaleX;
  
  // Calculate max width: either full available space or limited by status button position
  const maxWidthBeforeButton = cardWidthScaled * GUEST_AREA_MAX_PERCENT;
  
  const containerWidth = hasGuestImage 
    ? effectiveContainerWidth 
    : Math.min(
        cardWidthScaled - containerLeftScaled,
        maxWidthBeforeButton - containerLeftScaled
      );

  if (isVacantGuest) {
    // For vacant turndown rooms, position at guest container top
    // and center vertically within the container height
    const vacantRowTop = isTurndown 
      ? GUEST_CONTAINER_BG.positions.turndown.top 
      : calculatedNameTop;
    const vacantRowHeight = isTurndown
      ? GUEST_CONTAINER_BG.positions.turndown.height
      : 100;
    // Align to the same left as standard guest rows inside the container
    const vacantRowLeft = 0;
    
    return (
      <View
        style={[
          styles.container,
          {
            left: calculatedContainerLeft * normalizedScaleX,
            width: containerWidth,
          },
          contentOffsetStyle,
          containerStyle,
        ]}
      >
        <View
          style={[
            styles.guestRow,
            styles.guestRowVacant,
            {
              top: vacantRowTop * normalizedScaleX,
              left: vacantRowLeft,
              height: vacantRowHeight * normalizedScaleX,
            },
          ]}
        >
          <Image
            source={require('../../../assets/icons/vacant-chair.png')}
            style={[
              styles.guestIconVacant,
              isPMTheme ? styles.guestIconPM : styles.guestIconNoTint,
            ]}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.guestName,
              styles.guestVacantText,
              isPMTheme && styles.guestNamePM,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {guest.name || 'Vacant'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View 
      style={[
        styles.container, 
        { 
          left: effectiveContainerLeft * normalizedScaleX,
          width: containerWidth,
        },
        contentOffsetStyle,
        containerStyle,
      ]}
    >
      {hasGuestImage && !hideNameRow ? (
        /* Two-column layout: image left, info right (Figma) - All Rooms cards */
        <View
          style={[
            styles.twoColumnRow,
            {
              top: (guestIconPos?.top ?? calculatedNameTop) * normalizedScaleX,
              minHeight: guestImageHeight,
            },
          ]}
        >
          <View style={[styles.guestImageContainer, { marginRight: guestImageGap }]}>
            {onGuestImagePress ? (
              <View ref={guestImageWrapRef} collapsable={false}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    guestImageWrapRef.current?.measureInWindow(
                      (x, y, width, height) => {
                        onGuestImagePress(guest, { x, y, width, height });
                      }
                    );
                  }}
                >
                  <Image
                    source={{ uri: guest.imageUrl! }}
                    style={[
                      styles.guestImage,
                      {
                        width: guestImageWidth,
                        height: guestImageHeight,
                        borderRadius: guestImageRadius,
                      },
                    ]}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <Image
                source={{ uri: guest.imageUrl! }}
                style={[
                  styles.guestImage,
                  {
                    width: guestImageWidth,
                    height: guestImageHeight,
                    borderRadius: guestImageRadius,
                  },
                ]}
                resizeMode="cover"
              />
            )}
            {/* Category Badge at bottom right */}
            {((isArrival || isDeparture || isStayover || isTurndown) || (isArrivalDeparture || category === 'ArrivalDeparture')) && (
              <View
                style={[
                  styles.imageBadge,
                  {
                    backgroundColor: (isArrival || ((isArrivalDeparture || category === 'ArrivalDeparture') && isFirstGuest))
                      ? '#41D541' // Green for Arrival
                      : (isDeparture || ((isArrivalDeparture || category === 'ArrivalDeparture') && isSecondGuest))
                      ? '#f92424' // Red for Departure
                      : isStayover
                      ? '#3BC1F6' // Light blue for Stayover
                      : '#9b51e0', // Purple for Turndown
                  },
                ]}
              >
                <Image
                  source={
                    (isArrival || ((isArrivalDeparture || category === 'ArrivalDeparture') && isFirstGuest))
                      ? require('../../../assets/icons/arrow-forward.png')
                      : (isDeparture || ((isArrivalDeparture || category === 'ArrivalDeparture') && isSecondGuest))
                      ? require('../../../assets/icons/departure-spear.png')
                      : isStayover
                      ? require('../../../assets/icons/stayover-guest_icon.png')
                      : guestIconSource
                  }
                  style={isTurndown ? styles.imageBadgeIconNoTint : styles.imageBadgeIcon}
                  resizeMode="contain"
                />
              </View>
            )}
          </View>
          <View style={[styles.guestInfoColumn, { marginTop: 0 }]}>
            <View style={styles.guestNameContainer}>
              {/* First line: First 23 characters (or full name if <= 23 chars) */}
              {shouldWrapName ? (
                <>
                  <Text 
                    style={[styles.guestName, isPMTheme && styles.guestNamePM]} 
                    numberOfLines={1}
                  >
                    {firstNamePart}
                  </Text>
                  {/* Second line: Remaining characters with badge */}
                  {secondNamePart && (
                    <View style={styles.guestNameSecondRow}>
                      <Text 
                        style={[styles.guestName, isPMTheme && styles.guestNamePM]} 
                        numberOfLines={1}
                      >
                        {secondNamePart}
                      </Text>
                      {displayBadge && (
                        <Text 
                          style={[styles.priorityCountInline, isPMTheme && styles.priorityCountInlinePM]}
                          numberOfLines={1}
                        >
                          {displayBadge}
                        </Text>
                      )}
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.guestNameSingleRow}>
                  <Text 
                    style={[styles.guestName, isPMTheme && styles.guestNamePM]} 
                    numberOfLines={1}
                  >
                    {firstNamePart}
                  </Text>
                  {displayBadge && (
                    <Text 
                      style={[styles.priorityCountInline, isPMTheme && styles.priorityCountInlinePM]}
                      numberOfLines={1}
                    >
                      {displayBadge}
                    </Text>
                  )}
                </View>
              )}
            </View>
            {/* Date + guest count + ETA/EDT row (inside info column when two-column) */}
            {timeLeft !== undefined && timeTop !== undefined ? (
              // ROOM DETAIL SCREEN: Apply layout pattern
              <>
                {/* First line: datesOfStay + guest count (if both present) */}
                <View style={[styles.detailsRow, styles.detailsRowFlex, { marginTop: infoGap, alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap' }]}>
                  {hasDatesOfStay && (
                    <Text style={[styles.dateRange, isPMTheme && styles.dateRangePM, { marginRight: 8 * normalizedScaleX }]}>
                      {formatDatesOfStay(guest.datesOfStay)}
                    </Text>
                  )}
                  {/* Guest Count - inline if available */}
                  {hasGuestCount && (
                    <>
                      <Image
                        source={require('../../../assets/icons/people-icon.png')}
                        style={[styles.countIconInline, isPMTheme && styles.countIconInlinePM, { marginLeft: 0, marginRight: 4 * normalizedScaleX }]}
                        resizeMode="contain"
                      />
                      <Text style={[styles.countTextInline, { marginRight: shouldSplitTimeToNewLine ? 0 : 8 * normalizedScaleX }]}>
                        {formatGuestCount(guest.guestCount)}
                      </Text>
                    </>
                  )}
                  {/* Time (ETA/EDT) - inline if available and not N/A, but only if NOT splitting to new line */}
                  {hasTime && !shouldSplitTimeToNewLine && (
                    <Text style={[styles.timeInline, isPMTheme && styles.timeInlinePM]}>
                      {`${guest.timeLabel}: ${guest.time}`}
                    </Text>
                  )}
                </View>
                {/* Second line: ETA/EDT (only if splitting to new line) */}
                {shouldSplitTimeToNewLine && (
                  <Text style={[styles.time, styles.timeFlex, isPMTheme && styles.timePM, { marginTop: infoGap }]}>
                    {`${guest.timeLabel}: ${guest.time}`}
                  </Text>
                )}
              </>
            ) : (isArrivalDeparture || category === 'ArrivalDeparture') ? (
              <>
                {/* First line: datesOfStay (+ guest count only if hasTime) */}
                <View style={[styles.detailsRowWithCount, styles.detailsRowFlex, { marginTop: infoGap }]}>
                  {hasDatesOfStay && (
                    <Text style={[styles.dateRange, isPMTheme && styles.dateRangePM]}>{formatDatesOfStay(guest.datesOfStay)}</Text>
                  )}
                  {/* Show guest count inline only if there's time (ETA/EDT) */}
                  {hasTime && countPos && hasGuestCount && (
                    <>
                      <Image source={require('../../../assets/icons/people-icon.png')} style={[styles.countIconInline, isPMTheme && styles.countIconInlinePM]} resizeMode="contain" />
                      <Text style={styles.countTextInline}>{formatGuestCount(guest.guestCount)}</Text>
                    </>
                  )}
                </View>
                {/* Second line: ETA/EDT or guest count (if no time) */}
                {hasTime ? (
                  <Text style={[styles.time, styles.timeFlex, isPMTheme && styles.timePM, { marginTop: infoGap }]}>
                    {`${guest.timeLabel}: ${guest.time}`}
                  </Text>
                ) : (
                  /* If no time, show guest count on second line */
                  countPos && hasGuestCount && (
                    <View style={[styles.detailsRowWithCount, styles.detailsRowFlex, { marginTop: infoGap }]}>
                      <Image source={require('../../../assets/icons/people-icon.png')} style={[styles.countIconInline, isPMTheme && styles.countIconInlinePM]} resizeMode="contain" />
                      <Text style={styles.countTextInline}>{formatGuestCount(guest.guestCount)}</Text>
                    </View>
                  )
                )}
              </>
            ) : (
              <>
                {/* First line: datesOfStay + guest count */}
                <View style={[styles.detailsRow, styles.detailsRowFlex, { marginTop: infoGap, alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap' }]}>
                  {hasDatesOfStay && (
                    <Text style={[styles.dateRange, isPMTheme && styles.dateRangePM, { marginRight: 8 * normalizedScaleX }]}>
                      {formatDatesOfStay(guest.datesOfStay)}
                    </Text>
                  )}
                  {/* Guest Count - inline if available */}
                  {hasGuestCount && (
                    <>
                      <Image source={require('../../../assets/icons/people-icon.png')} style={[styles.countIconInline, isPMTheme && styles.countIconInlinePM, { marginRight: 4 * normalizedScaleX }]} resizeMode="contain" />
                      <Text style={[styles.countTextInline, { marginRight: shouldSplitTimeToNewLine ? 0 : 8 * normalizedScaleX }]}>
                        {formatGuestCount(guest.guestCount)}
                      </Text>
                    </>
                  )}
                  {/* Time (ETA/EDT) - inline if available and not N/A, but only if NOT splitting to new line */}
                  {hasTime && !shouldSplitTimeToNewLine && (
                    <Text style={[styles.timeInline, isPMTheme && styles.timeInlinePM]}>
                      {`${guest.timeLabel}: ${guest.time}`}
                    </Text>
                  )}
                </View>
                {/* Second line: ETA/EDT (only if splitting to new line) */}
                {shouldSplitTimeToNewLine && (
                  <Text style={[styles.time, styles.timeFlex, isPMTheme && styles.timePM, { marginTop: infoGap }]}>
                    {`${guest.timeLabel}: ${guest.time}`}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      ) : hasGuestImage && hideNameRow && timeLeft !== undefined && timeTop !== undefined ? (
        /* Room Detail Screen: Two-column layout but name rendered by parent (GuestInfoCard) */
        /* Render date/time/count row aligned with info column (after image + gap) */
        /* Position: left aligns with name (infoColumnLeft), top is below name row */
        <>
          {/* First line: datesOfStay + guest count */}
          <View
            style={[
              styles.detailsRow,
              {
                top: dateTop !== undefined ? dateTop * normalizedScaleX : adjustedDateTop * normalizedScaleX,
                left: dateLeft !== undefined ? dateLeft * normalizedScaleX : 0,
                alignItems: 'flex-start', // Align items to start for proper alignment with name
                flexDirection: 'row',
                flexWrap: 'wrap',
                zIndex: 10,
                paddingLeft: 0, // Remove any left padding
                marginLeft: 0, // Remove any left margin
                paddingStart: 0, // Remove any start padding (for RTL)
                marginStart: 0, // Remove any start margin (for RTL)
              },
            ]}
          >
            {hasDatesOfStay && (
              <Text style={[styles.dateRange, isPMTheme && styles.dateRangePM, { marginRight: 12 * normalizedScaleX, paddingLeft: 0, marginLeft: 0, paddingStart: 0, marginStart: 0, textAlign: 'left' }]}>
                {formatDatesOfStay(guest.datesOfStay)}
              </Text>
            )}
            {/* Guest Count - inline if available */}
            {hasGuestCount && (
              <>
                <Image
                  source={require('../../../assets/icons/people-icon.png')}
                  style={[styles.countIconInline, isPMTheme && styles.countIconInlinePM, { marginLeft: 0, marginRight: 4 * normalizedScaleX }]}
                  resizeMode="contain"
                />
                <Text style={[styles.countTextInline, { marginRight: shouldSplitTimeToNewLine ? 0 : 12 * normalizedScaleX }]}>
                  {formatGuestCount(guest.guestCount)}
                </Text>
              </>
            )}
            {/* Time (ETA/EDT) - inline if available and not N/A, but only if NOT splitting to new line */}
            {hasTime && !shouldSplitTimeToNewLine && (
              <Text style={[styles.timeInline, isPMTheme && styles.timeInlinePM]}>
                {`${guest.timeLabel}: ${guest.time}`}
              </Text>
            )}
          </View>
          {/* Second line: ETA/EDT (only if splitting to new line) */}
          {shouldSplitTimeToNewLine && (
            <Text
              style={[
                styles.time,
                styles.timeFlex,
                isPMTheme && styles.timePM,
                {
                  top: (dateTop !== undefined ? dateTop : adjustedDateTop) * normalizedScaleX + (GUEST_INFO.dateRange.lineHeight + infoGap) * normalizedScaleX,
                  left: dateLeft !== undefined ? dateLeft * normalizedScaleX : 0,
                  paddingLeft: 0,
                  marginLeft: 0,
                  paddingStart: 0,
                  marginStart: 0,
                  textAlign: 'left',
                },
              ]}
            >
              {`${guest.timeLabel}: ${guest.time}`}
            </Text>
          )}
        </>
      ) : (
        /* Original layout when no guest image */
        <>
          {!hideNameRow && guestIconPos !== null && (
            <Image
              source={guestIconSource}
              style={[
                styles.guestIconAbsolute,
                {
                  left: (guestIconPos.left - calculatedContainerLeft) * normalizedScaleX,
                  top: guestIconPos.top * normalizedScaleX,
                  tintColor: iconTintColor,
                },
              ]}
              resizeMode="contain"
            />
          )}
          {!hideNameRow && (
            <View style={[styles.guestRow, { top: calculatedNameTop * normalizedScaleX, left: nameLeft !== undefined ? nameLeft * normalizedScaleX : 0 }]}>
              {guestIconPos === null && (
                <Image
                  source={guestIconSource}
                  style={[
                    styles.guestIcon,
                    (isArrival || isDeparture || isStayover || isTurndown || isNoTask) && !isPMTheme && styles.guestIconNoTint,
                    isPMTheme && styles.guestIconPM,
                  ]}
                  resizeMode="contain"
                />
              )}
              <View style={[styles.guestNameContainer, guestIconPos !== null && styles.guestNameContainerNoIcon]}>
                {shouldWrapName ? (
                  <>
                    <Text style={[styles.guestName, isPMTheme && styles.guestNamePM]} numberOfLines={1}>{firstNamePart}</Text>
                    {secondNamePart && (
                      <View style={styles.guestNameSecondRow}>
                        <Text style={[styles.guestName, isPMTheme && styles.guestNamePM]} numberOfLines={1}>{secondNamePart}</Text>
                        {displayBadge && <Text style={[styles.priorityCountInline, isPMTheme && styles.priorityCountInlinePM]} numberOfLines={1}>{displayBadge}</Text>}
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.guestNameSingleRow}>
                    <Text style={[styles.guestName, isPMTheme && styles.guestNamePM]} numberOfLines={1}>{firstNamePart}</Text>
                    {displayBadge && <Text style={[styles.priorityCountInline, isPMTheme && styles.priorityCountInlinePM]} numberOfLines={1}>{displayBadge}</Text>}
                  </View>
                )}
              </View>
            </View>
          )}
        </>
      )}

      {/* Date Range Row - when NOT two-column layout (no guest image) */}
      {!hasGuestImage && (
      <>
      {timeLeft !== undefined && timeTop !== undefined ? (
        // ROOM DETAIL SCREEN: Apply layout pattern
        <>
          {/* First line: datesOfStay + guest count */}
          <View style={[
            styles.detailsRow, 
            { 
              top: adjustedDateTop * normalizedScaleX,
              left: dateLeft !== undefined ? dateLeft * normalizedScaleX : 0,
              zIndex: 10,
              alignItems: 'center',
              flexDirection: 'row',
              flexWrap: 'wrap',
            }
          ]}>
            {hasDatesOfStay && (
              <Text style={[styles.dateRange, isPMTheme && styles.dateRangePM, { marginRight: 8 * normalizedScaleX }]}>
                {formatDatesOfStay(guest.datesOfStay)}
              </Text>
            )}
            {/* Guest Count - inline if available */}
            {hasGuestCount && (
              <>
                <Image
                  source={require('../../../assets/icons/people-icon.png')}
                  style={[styles.countIconInline, isPMTheme && styles.countIconInlinePM, { marginLeft: 0, marginRight: 4 * normalizedScaleX }]}
                  resizeMode="contain"
                />
                <Text style={[styles.countTextInline, { marginRight: shouldSplitTimeToNewLine ? 0 : 8 * normalizedScaleX }]}>
                  {formatGuestCount(guest.guestCount)}
                </Text>
              </>
            )}
            {/* Time (ETA/EDT) - inline if available and not N/A, but only if NOT splitting to new line */}
            {hasTime && !shouldSplitTimeToNewLine && (
              <Text style={[styles.timeInline, isPMTheme && styles.timeInlinePM]}>
                {`${guest.timeLabel}: ${guest.time}`}
              </Text>
            )}
          </View>
          {/* Second line: ETA/EDT (only if splitting to new line) */}
          {shouldSplitTimeToNewLine && (
            <Text
              style={[
                styles.time,
                styles.timeFlex,
                isPMTheme && styles.timePM,
                {
                  top: adjustedDateTop * normalizedScaleX + (GUEST_INFO.dateRange.lineHeight + infoGap) * normalizedScaleX,
                  left: dateLeft !== undefined ? dateLeft * normalizedScaleX : 0,
                  zIndex: 10,
                },
              ]}
            >
              {`${guest.timeLabel}: ${guest.time}`}
            </Text>
          )}
        </>
      ) : (isArrivalDeparture || category === 'ArrivalDeparture') ? (
        // ALL ROOMS - Arrival/Departure: Apply layout pattern
        <>
          {/* First line: datesOfStay + guest count */}
          <View
            style={[
              styles.detailsRowWithCount,
              {
                top: adjustedDateTop * normalizedScaleX,
                left: dateLeft !== undefined ? dateLeft * normalizedScaleX : 0,
                zIndex: 10,
              },
            ]}
          >
            {hasDatesOfStay && (
              <Text style={[styles.dateRange, isPMTheme && styles.dateRangePM]}>
                {formatDatesOfStay(guest.datesOfStay)}
              </Text>
            )}
            {countPos && hasGuestCount && (
              <>
                <Image
                  source={require('../../../assets/icons/people-icon.png')}
                  style={[styles.countIconInline, isPMTheme && styles.countIconInlinePM]}
                  resizeMode="contain"
                />
                <Text style={styles.countTextInline}>{formatGuestCount(guest.guestCount)}</Text>
              </>
            )}
          </View>
          {/* Second line: ETA/EDT (only if splitting to new line) */}
          {shouldSplitTimeToNewLine && (
            <Text style={[styles.time, styles.timeFlex, isPMTheme && styles.timePM, { marginTop: infoGap }]}>
              {`${guest.timeLabel}: ${guest.time}`}
            </Text>
          )}
        </>
      ) : (isArrival || isStayover || isTurndown || isDeparture) ? (
        // ALL ROOMS - Other types (Arrival, Stayover, Turndown, Departure): Apply layout pattern
        <>
          {/* First line: datesOfStay + guest count */}
          <View style={[
            styles.detailsRow, 
            { 
              top: adjustedDateTop * normalizedScaleX,
              left: dateLeft !== undefined ? dateLeft * normalizedScaleX : 0,
              zIndex: 10,
              alignItems: 'center',
              flexDirection: 'row',
              flexWrap: 'wrap',
            }
          ]}>
            {hasDatesOfStay && (
              <Text style={[styles.dateRange, isPMTheme && styles.dateRangePM, { marginRight: 8 * normalizedScaleX }]}>
                {formatDatesOfStay(guest.datesOfStay)}
              </Text>
            )}
            {hasGuestCount && (
              <>
                <Image
                  source={require('../../../assets/icons/people-icon.png')}
                  style={[styles.countIconInline, isPMTheme && styles.countIconInlinePM, { marginRight: 4 * normalizedScaleX }]}
                  resizeMode="contain"
                />
                <Text style={[styles.countTextInline, { marginRight: shouldSplitTimeToNewLine ? 0 : 8 * normalizedScaleX }]}>
                  {formatGuestCount(guest.guestCount)}
                </Text>
              </>
            )}
            {/* Time (ETA/EDT) - inline if available and not N/A, but only if NOT splitting to new line */}
            {hasTime && !shouldSplitTimeToNewLine && (
              <Text style={[styles.timeInline, isPMTheme && styles.timeInlinePM]}>
                {`${guest.timeLabel}: ${guest.time}`}
              </Text>
            )}
          </View>
          {/* Second line: ETA/EDT (only if splitting to new line) */}
          {shouldSplitTimeToNewLine && (
            <Text
              style={[
                styles.time,
                styles.timeFlex,
                isPMTheme && styles.timePM,
                {
                  top: adjustedDateTop * normalizedScaleX + (GUEST_INFO.dateRange.lineHeight + infoGap) * normalizedScaleX,
                  left: dateLeft !== undefined ? dateLeft * normalizedScaleX : 0,
                  zIndex: 10,
                },
              ]}
            >
              {`${guest.timeLabel}: ${guest.time}`}
            </Text>
          )}
        </>
      ) : (
        // Fallback - just date
        <View style={[
          styles.detailsRow, 
          { 
            top: adjustedDateTop * normalizedScaleX,
            left: dateLeft !== undefined ? dateLeft * normalizedScaleX : 0,
            zIndex: 10,
            alignItems: 'center',
          }
        ]}>
          <Text style={[styles.dateRange, isPMTheme && styles.dateRangePM]}>
            {formatDatesOfStay(guest.datesOfStay)}
          </Text>
        </View>
      )}

      {/* Line 2 Rendering */}
      {/* Arrival/Departure: Line 2 = EDT/ETA (only for All Rooms screen) */}
      {(isArrivalDeparture || category === 'ArrivalDeparture') && hasTime && !(timeLeft !== undefined && timeTop !== undefined) ? (
        // Arrival/Departure: Line 2 = EDT/ETA
        <Text style={[
          styles.time,
          isPMTheme && styles.timePM,
          {
            left: ((timePos?.left ?? 0) - calculatedContainerLeft) * normalizedScaleX,
            top: (adjustedDateTop + dateTimeRowHeight + 4) * normalizedScaleX, // Below date row
          }
        ]}>
          {`${guest.timeLabel}: ${guest.time}`}
        </Text>
      ) : null}
      
      {/* Other types: Line 2 = guestcount (only if time exists and is not N/A, and not Room Detail screen) */}
      {shouldShowGuestCountBelow && guest.guestCount && guest.guestCount.adults !== undefined && !(timeLeft !== undefined && timeTop !== undefined) ? (
        <>
          <Image
            source={require('../../../assets/icons/people-icon.png')}
            style={[
              styles.countIcon,
              isPMTheme && styles.countIconPM,
              {
                left: guestCountIconLeft,
                top: adjustedGuestCountTop + iconVerticalOffset,
              }
            ]}
            resizeMode="contain"
          />
          <Text style={[
            styles.countText,
            isPMTheme && styles.countTextPM,
            {
              left: guestCountTextLeft,
              top: adjustedGuestCountTop,
            }
          ]}>
            {formatGuestCount(guest.guestCount)}
          </Text>
        </>
      ) : null}
      </>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    overflow: 'visible', // Ensure content is not clipped
    zIndex: 10, // Ensure container and its children are above dividers
    pointerEvents: 'box-none', // Allow pointer events to pass through to children on iOS
    // Width is set dynamically in component to ensure content is visible
  },
  guestRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-start', // Default: prevent text clipping for regular guests
    left: 0,
    width: 300 * normalizedScaleX, // Fixed width - card is 426px, container starts at 73px, so 426-73=353px available, use 300px to leave space
    overflow: 'visible', // Ensure text is not clipped
    zIndex: 30, // Highest z-index to ensure guest name is above divider and all other elements on iOS
    elevation: 30, // Android elevation for proper layering
  },
  guestRowVacant: {
    alignItems: 'center', // Center icon and text vertically for vacant state
    height: 100 * normalizedScaleX,
    justifyContent: 'center',
    paddingLeft: 0,
  },
  guestVacantText: {
    marginLeft: 6 * normalizedScaleX,
    lineHeight: GUEST_INFO.name.lineHeight * normalizedScaleX,
  },
  guestIconVacant: {
    width: GUEST_INFO.icon.width * normalizedScaleX,
    height: GUEST_INFO.icon.height * normalizedScaleX,
    marginRight: 6 * normalizedScaleX,
  },
  guestIcon: {
    width: GUEST_INFO.icon.width * normalizedScaleX,
    height: GUEST_INFO.icon.height * normalizedScaleX,
    marginRight: 4 * normalizedScaleX,
    tintColor: '#334866',
  },
  guestAvatar: {
    marginRight: 8 * normalizedScaleX,
  },
  guestAvatarAbsolute: {
    position: 'absolute',
  },
  twoColumnRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    left: 0,
    right: 0,
    zIndex: 30,
  },
  guestImageContainer: {
    position: 'relative',
  },
  guestImage: {
    flexShrink: 0,
  },
  imageBadge: {
    position: 'absolute',
    bottom: -2 * normalizedScaleX,
    right: -2 * normalizedScaleX,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageBadgeIcon: {
    width: 12 * normalizedScaleX,
    height: 12 * normalizedScaleX,
    tintColor: '#ffffff',
  },
  imageBadgeIconNoTint: {
    width: 12 * normalizedScaleX,
    height: 12 * normalizedScaleX,
    tintColor: '#FFEA80',
  },
  guestInfoColumn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    minWidth: 0,
  },
  guestIconPM: {
    tintColor: '#ffffff',
  },
  guestIconAbsolute: {
    position: 'absolute',
    width: GUEST_INFO.iconArrivalDeparture.width * normalizedScaleX,
    height: GUEST_INFO.iconArrivalDeparture.height * normalizedScaleX,
    tintColor: '#334866',
  },
  guestIconNoTint: {
    tintColor: undefined,
  },
  guestNameContainer: {
    flexDirection: 'column', // Vertical layout for name lines
    alignItems: 'flex-start', // Align name lines to start
    flexShrink: 1, // Allow shrinking but prefer to show full name
    flex: 1, // Take available space
    minWidth: 0, // Allow flex to work properly
    overflow: 'visible', // Ensure text is not clipped
    paddingRight: 8 * normalizedScaleX, // Padding from container edge
    paddingBottom: 0, // Remove bottom padding
    marginBottom: 0, // Remove bottom margin
  },
  guestNameSingleRow: {
    flexDirection: 'row', // Horizontal layout for name and badge when name is short
    alignItems: 'baseline', // Align badge with text baseline
    flexWrap: 'wrap',
  },
  guestNameSecondRow: {
    flexDirection: 'row', // Horizontal layout for second part and badge
    alignItems: 'baseline', // Align badge with text baseline
    flexWrap: 'wrap',
    marginTop: 2 * normalizedScaleX, // Small spacing between first and second line of name (responsive)
  },
  guestNameContainerNoIcon: {
    marginLeft: 0,
  },
  guestNameContainerWithSpacing: {
    marginRight: 8 * normalizedScaleX, // Add spacing after name for Arrival/Departure cards (matches Figma)
  },
  guestName: {
    fontSize: GUEST_INFO.name.fontSize * normalizedScaleX,
    fontFamily: 'Helvetica',
    fontWeight: typography.fontWeights.bold as any,
    color: GUEST_INFO.name.color,
    lineHeight: GUEST_INFO.name.lineHeight * normalizedScaleX,
    backgroundColor: 'transparent', // Ensure no background covers text
    includeFontPadding: false, // Remove extra padding that clips text
    textAlignVertical: 'top', // Align to top so bottom part is visible
    paddingBottom: 0, // Remove bottom padding
    marginBottom: 0, // Remove bottom margin
  },
  guestNamePM: {
    color: '#ffffff',
  },
  priorityCount: {
    position: 'absolute',
    fontSize: GUEST_INFO.priorityBadge.fontSize * normalizedScaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.light as any,
    color: GUEST_INFO.priorityBadge.color,
    lineHeight: GUEST_INFO.priorityBadge.lineHeight * normalizedScaleX,
  },
  priorityCountInline: {
    fontSize: GUEST_INFO.priorityBadge.fontSize * normalizedScaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.light as any,
    color: GUEST_INFO.priorityBadge.color,
    lineHeight: GUEST_INFO.priorityBadge.lineHeight * normalizedScaleX,
    marginLeft: 4 * normalizedScaleX, // Consistent spacing after name text - matches Figma (4px)
    flexShrink: 0, // Prevent badge from shrinking
    includeFontPadding: false, // Remove extra padding
    textAlignVertical: 'top', // Align to top for consistent baseline
  },
  priorityCountInlinePM: {
    color: '#ffffff',
  },
  priorityCountSmall: {
    fontSize: (GUEST_INFO.priorityBadge.fontSize * 0.85) * normalizedScaleX, // 85% of original size (12 * 0.85 = 10.2px)
    lineHeight: (GUEST_INFO.priorityBadge.lineHeight * 0.85) * normalizedScaleX, // Proportionally smaller line height
  },
  detailsRowFlex: {
    position: 'relative',
    left: undefined,
    top: undefined,
  },
  detailsRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    left: 0,
    minHeight: GUEST_INFO.dateRange.lineHeight * normalizedScaleX, // Changed from fixed height to minHeight
    zIndex: 5, // Very low z-index so time appears above
    overflow: 'visible', // Ensure content is not clipped
    paddingLeft: 0, // Ensure no left padding
    marginLeft: 0, // Ensure no left margin
    paddingStart: 0, // Ensure no start padding (RTL)
    marginStart: 0, // Ensure no start margin (RTL)
  },
  detailsRowWithCount: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center', // Keep 'center' for this row to align icon and count text properly on same line
    left: 0,
    minHeight: GUEST_INFO.dateRange.lineHeight * normalizedScaleX, // Changed from fixed height to minHeight
    zIndex: 5, // Very low z-index so time appears above
    overflow: 'visible', // Ensure content is not clipped
  },
  detailsRowWithTime: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-start', // Changed from 'center' to 'flex-start' to prevent clipping
    left: 0,
    minHeight: Math.max(GUEST_INFO.dateRange.lineHeight, GUEST_INFO.time.lineHeight) * normalizedScaleX, // Use the taller of date or time lineHeight to prevent overlap
    zIndex: 5, // Very low z-index so time appears above
    overflow: 'visible', // Ensure content is not clipped
    maxWidth: 180 * normalizedScaleX, // Match guest info container width to prevent overflow
    flexWrap: 'wrap', // Allow wrapping if needed
  },
  guestCountRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    left: 0,
    height: GUEST_INFO.guestCount.lineHeight * normalizedScaleX,
  },
  dateRange: {
    fontSize: GUEST_INFO.dateRange.fontSize * normalizedScaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.light as any,
    color: GUEST_INFO.dateRange.color,
    lineHeight: GUEST_INFO.dateRange.lineHeight * normalizedScaleX,
    includeFontPadding: false, // Remove extra padding for better alignment
    textAlignVertical: 'center', // Center text vertically
    backgroundColor: 'transparent', // Ensure no background covers time
    paddingLeft: 0, // Remove any left padding
    marginLeft: 0, // Remove any left margin
    paddingStart: 0, // Remove any start padding (RTL)
    marginStart: 0, // Remove any start margin (RTL)
  },
  dateRangeWithTime: {
    marginRight: 8 * normalizedScaleX, // Add spacing between date and time to prevent overlap
    flexShrink: 1, // Allow date to shrink when time is present
    maxWidth: '65%', // Limit date width to leave space for time (EDT/ETA)
  },
  dateRangePM: {
    color: '#ffffff',
  },
  countIconInline: {
    width: GUEST_INFO.guestCount.icon.width * normalizedScaleX,
    height: GUEST_INFO.guestCount.icon.height * normalizedScaleX,
    tintColor: '#334866',
    marginLeft: 8 * normalizedScaleX, // Spacing after date
    alignSelf: 'center', // Vertically center icon with text on same row
  },
  countIconInlinePM: {
    tintColor: '#ffffff',
  },
  countTextInline: {
    fontSize: GUEST_INFO.guestCount.fontSize * normalizedScaleX,
    fontFamily: 'Helvetica',
    fontWeight: typography.fontWeights.light as any,
    color: GUEST_INFO.guestCount.color,
    lineHeight: GUEST_INFO.guestCount.lineHeight * normalizedScaleX,
    includeFontPadding: false,
    textAlignVertical: 'center',
    marginLeft: 4 * normalizedScaleX, // Spacing after icon
    marginTop: 0, // Ensure no extra top margin
    paddingTop: 0, // Ensure no extra top padding
  },
  time: {
    position: 'absolute',
    fontSize: GUEST_INFO.time.fontSize * normalizedScaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: GUEST_INFO.time.color,
    lineHeight: GUEST_INFO.time.lineHeight * normalizedScaleX,
    includeFontPadding: false, // Remove extra padding for better alignment
    textAlignVertical: 'center', // Center text vertically
    zIndex: 30, // Highest z-index to ensure ETA/EDT are always visible above date
    elevation: 30, // Android elevation for proper layering
    backgroundColor: 'transparent', // Ensure no background
  },
  timePM: {
    color: '#ffffff',
  },
  timeFlex: {
    position: 'relative',
    left: undefined,
    top: undefined,
  },
  timeInline: {
    fontSize: GUEST_INFO.time.fontSize * normalizedScaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: GUEST_INFO.time.color,
    lineHeight: GUEST_INFO.dateRange.lineHeight * normalizedScaleX, // Match date range line height for vertical alignment
    includeFontPadding: false,
    textAlignVertical: 'center',
    marginLeft: 8 * normalizedScaleX, // Spacing after date (matches Figma spacing)
    zIndex: 25, // Highest z-index to ensure ETA/EDT are always visible above date
    elevation: 25, // Android elevation for proper layering
  },
  timeInlinePM: {
    color: '#ffffff',
  },
  countIcon: {
    position: 'absolute',
    width: GUEST_INFO.guestCount.icon.width * normalizedScaleX,
    height: GUEST_INFO.guestCount.icon.height * normalizedScaleX,
    tintColor: '#334866',
  },
  countIconPM: {
    tintColor: '#ffffff',
  },
  countText: {
    position: 'absolute',
    fontSize: GUEST_INFO.guestCount.fontSize * normalizedScaleX,
    fontFamily: 'Helvetica',
    fontWeight: typography.fontWeights.light as any,
    color: GUEST_INFO.guestCount.color,
    lineHeight: GUEST_INFO.guestCount.lineHeight * normalizedScaleX,
    includeFontPadding: false, // Remove extra padding for better alignment
    textAlignVertical: 'center', // Center text vertically
  },
  countTextPM: {
    color: '#ffffff',
  },
});

