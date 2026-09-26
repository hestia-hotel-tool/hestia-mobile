import React, { useEffect, useRef } from 'react';
import { View as RNView, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, View } from '@/tw';
import { Icon } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import { resolveRoomDetailHeader } from '../../constants/roomDetailHeaderTheme';
import type { RoomStatus, RoomActivityState } from '../../types/allRooms.types';
import type { RoomCleaningInput } from '../../types/roomDetail.types';
import { useNow } from '@/hooks/useNow';
import { cleaningClock } from '../../utils/cleaningClock';
import { describeRoomActivity } from '../../utils/describeRoomActivity';
import { ROOM_DETAIL_HEADER_LAYOUT as L } from './roomDetailHeaderLayout';
import { RoomActivityLine } from './RoomActivityLine';
import { RoomHeaderIdentity } from './RoomHeaderIdentity';
import { RoomHeaderStatusButton } from './RoomHeaderStatusButton';

export interface RoomDetailHeaderProps {
  roomNumber: string;
  roomCode: string;
  status: RoomStatus;
  /**
   * What the room is doing — paused, returning later, refused, or nothing.
   * Replaces the eight props this used to take (`customStatusText`, `pausedAt`,
   * `assignmentPaused`, and four timestamps).
   */
  activity: RoomActivityState;
  /**
   * Optional. Omitted, the header goes back through expo-router itself — see
   * `goBack` below. Passed, the caller wins.
   */
  onBackPress?: () => void;
  onStatusPress?: () => void;
  statusButtonRef?: React.Ref<RNView>;
  /**
   * **Currently unreachable.** Figma 2333-132 has no Resume button, so the
   * paused chrome row sets `inlineAction: null` and nothing renders this. The
   * prop and the `'resume'` arm of `inlineAction` are kept rather than deleted
   * because the affordance may come back with a later frame, and because its
   * sibling `'clear'` uses the identical mechanism — deleting one arm of a
   * two-arm union to chase a dead branch would leave the other looking
   * arbitrary. `RoomDetailScreen.handleResumePause` is dead for the same
   * reason; unpausing now goes through the status sheet.
   */
  onResumePause?: () => void;
  onReturnLaterElapsed?: () => void;
  /** Credit and cleaning clock — drives "32 min left" / "Over time by 8 min". */
  cleaning?: RoomCleaningInput;
  onClearRefuseService?: () => void;
  /** Red flag in a white disc after the room number. */
  flagged?: boolean;
  /** Front-office status, e.g. "Stayover" — only Stayover rooms show one. */
  frontOfficeLabel?: string;
  /** "with Linen" beside the front-office label. Meaningless without it. */
  showWithLinenBadge?: boolean;
  /**
   * The header's measured height in **design units**, reported on every layout.
   *
   * The status sheets are placed flush under `headerHeight * scaleX`
   * (`StatusPopover` ignores the button anchor because the screen passes
   * `showTriangle={false}`), and that number used to be the hard-coded 232 this
   * header asserted. Now that the column's height falls out of its content —
   * and out of the device's top inset — the sheet has to be told.
   */
  onHeightChange?: (designPx: number) => void;
}

/**
 * The Room Detail header.
 *
 * A flex column, in the flow, content-height — where this was ~620 lines of
 * absolutely-positioned boxes with every offset multiplied by a frozen `scaleX`.
 * Each block is a child with a gap between it and the next, so the header's
 * height is the sum of its parts rather than a 232 that had to be kept in sync
 * by hand with the two status sheets.
 *
 * Three pieces, each taking plain props: `RoomHeaderIdentity` (the title block
 * and its two badges), `RoomHeaderStatusButton` (mark, label, chevron), and
 * `RoomActivityLine` (the one line underneath, which replaced four
 * near-identical absolutely-positioned rows). What varies between the five
 * activity states is resolved once, above them, by `resolveRoomDetailHeader` —
 * structure from `ROOM_DETAIL_HEADER_CHROME`, colour from the theme resolver.
 *
 * Geometry lives in `roomDetailHeaderLayout.ts`, which also carries the policy
 * for the state-by-state rebuild: the numbers there are shared by all five
 * states and only some have been read off a frame.
 */
export default function RoomDetailHeader({
  roomNumber,
  roomCode,
  status,
  activity,
  onBackPress,
  onStatusPress,
  statusButtonRef,
  onResumePause,
  onReturnLaterElapsed,
  cleaning,
  onClearRefuseService,
  flagged = false,
  frontOfficeLabel,
  showWithLinenBadge = false,
  onHeightChange,
}: RoomDetailHeaderProps) {
  const insets = useSafeAreaInsets();
  const { chrome, theme, label, mark } = resolveRoomDetailHeader(activity, status);
  // One shared tick for every live label; times are shown to the minute.
  const now = useNow();
  const clock = cleaning ? cleaningClock(cleaning, now) : null;

  // Return Later clears itself once its time comes — once per return time.
  const returnDueAt = activity.kind === 'returnLater' ? activity.dueAt : null;
  const firedFor = useRef<number | null>(null);
  useEffect(() => {
    if (returnDueAt == null || now < returnDueAt || firedFor.current === returnDueAt) return;
    firedFor.current = returnDueAt;
    onReturnLaterElapsed?.();
  }, [returnDueAt, now, onReturnLaterElapsed]);

  /*
   * Back, without the caller having to wire it.
   *
   * `canGoBack` is not optional: a cold-start deep link into a room has no
   * history behind it, and a bare `router.back()` would leave the chevron dead.
   * The screen's own handler has had this fallback all along; making it the
   * default means a second caller cannot forget it.
   */
  const goBack = () => {
    if (onBackPress) return onBackPress();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/(rooms)');
  };

  const activityLine = describeRoomActivity(activity, { now, status, clock });

  const action =
    chrome.inlineAction === 'resume' && onResumePause
      ? { label: 'Resume', onPress: onResumePause }
      : chrome.inlineAction === 'clear' && onClearRefuseService
        ? { label: 'Clear', onPress: onClearRefuseService }
        : null;

  const handleLayout = (event: LayoutChangeEvent) => {
    // Reported in design units, because that is what the sheets multiply back
    // up by `scaleX`. Copied from AllRoomsScreen's header measurement.
    onHeightChange?.(event.nativeEvent.layout.height / scaleX);
  };

  return (
    <RNView
      collapsable={false}
      onLayout={handleLayout}
      style={{
        backgroundColor: theme.headerBackground,
        paddingTop: insets.top + L.safeAreaGap * scaleX,
        paddingBottom: L.bottomGap * scaleX,
        zIndex: 100,
        elevation: 100,
      }}
    >
      {/*
        The one element the design does not centre, so the one that stays
        absolute. `action-chevron` already points left — the rotated uses of it
        elsewhere are turning this same mark — and its viewBox aspect is exactly
        0.5, so a height of 28 paints 14 wide, which is the frame's back arrow.
      */}
      <Pressable
        onPress={goBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="absolute items-center justify-center"
        style={{
          left: L.backChevron.left * scaleX,
          top: insets.top + L.safeAreaGap * scaleX,
          height: L.roomNumber.height * scaleX,
          zIndex: 200,
          elevation: 200,
        }}
      >
        <Icon
          name="action-chevron"
          size={L.backChevron.height * scaleX}
          color={theme.backArrowTint}
        />
      </Pressable>

      <RoomHeaderIdentity
        roomNumber={roomNumber}
        roomCode={roomCode}
        numberColor={theme.roomNumberColor}
        codeColor={theme.roomCodeColor}
        flagged={flagged}
        frontOfficeLabel={frontOfficeLabel}
        showWithLinenBadge={showWithLinenBadge}
      />

      <View
        style={{
          height:
            (frontOfficeLabel ? L.frontOfficeToStatus : L.codeToStatus) * scaleX,
        }}
      />

      <RoomHeaderStatusButton
        label={label}
        mark={mark}
        color={theme.statusTextAndIconColor}
        emphasis={chrome.labelEmphasis}
        onPress={onStatusPress}
        measureRef={statusButtonRef}
      />

      {chrome.subtitle && activityLine.text ? (
        <>
          <View style={{ height: L.statusToActivity * scaleX }} />
          <RoomActivityLine
            text={activityLine.text}
            emphasis={activityLine.emphasis}
            color={theme.subtitleColor}
            action={action}
          />
        </>
      ) : null}
    </RNView>
  );
}
