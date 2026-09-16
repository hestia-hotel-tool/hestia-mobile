import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { typography } from '@/theme';
import { Icon, type IconName } from '@/components/Icon';
import { scaleX, ROOM_DETAIL_HEADER } from '../../constants/roomDetailStyles';
import {
  resolveRoomDetailHeaderTheme,
  type HeaderOverlayIcon,
} from '../../constants/roomDetailHeaderTheme';
import { STATUS_CONFIGS, ROOM_ACTIVITY_LABEL } from '../../types/allRooms.types';
import type { RoomStatus, RoomActivityState } from '../../types/allRooms.types';

/**
 * The three states whose status mark is a glyph on a tinted disc, rather than a
 * bare glyph like the four core statuses (which already render through
 * STATUS_CONFIGS + <Icon>).
 *
 * These were the last three `require()`d PNGs in this file, and the only ones
 * that could not be swapped one-for-one: each 51×51 asset bakes the disc and
 * the glyph into a single two-tone image, which is why the old code had to
 * refuse to tint them. The registry carries the glyphs alone, so the disc moves
 * into RN — the same split `STATUS_CONFIGS` already uses, and the shape commit
 * 63bb69b introduced for the status pill.
 *
 * Every number and colour below was measured out of the PNG it replaces rather
 * than taken from `STATUS_OPTIONS`, whose discs belong to the status *picker*
 * and are different (`#ff9090` for refuse-service, where the header's is a 12%
 * `#3abdff`). The asset's disc is a circle inscribed in the full 51×51 box, so
 * it takes the whole 24.367 the image used to occupy, and each glyph keeps its
 * share of that box: `viewBox height / 51 × 24.367`.
 *
 * The three registry viewBoxes match the PNGs' glyph bounding boxes to the
 * decimal (28.38 vs 28×28, 29.75 vs 25×29, 30.75 vs 22×31), which is how we
 * know they are the same drawings and not lookalikes.
 */
const OVERLAY_DISC = 24.367;

type OverlaySpec = {
  icon: IconName;
  /** Disc fill, at the alpha the PNG carried. */
  disc: string;
  glyph: string;
  /** Glyph height inside the disc, in design units. */
  glyphHeight: number;
};

const OVERLAY_SPECS: Record<HeaderOverlayIcon, OverlaySpec> = {
  refuseService: {
    icon: 'action-refuse-service',
    disc: 'rgba(58, 189, 255, 0.122)',
    glyph: '#5a759d',
    glyphHeight: (28.381 / 51) * OVERLAY_DISC,
  },
  returnLater: {
    icon: 'action-return-later',
    disc: 'rgba(58, 189, 255, 0.122)',
    glyph: '#5a759d',
    glyphHeight: (29.7501 / 51) * OVERLAY_DISC,
  },
  promisedTime: {
    icon: 'action-promised-time',
    disc: 'rgba(236, 189, 28, 0.212)',
    glyph: '#3f4c5f',
    glyphHeight: (30.75 / 51) * OVERLAY_DISC,
  },
};

interface RoomDetailHeaderProps {
  roomNumber: string;
  roomCode: string;
  status: RoomStatus;
  /**
   * What the room is doing — paused, returning later, refused, or nothing.
   *
   * Replaces the eight props this used to take (`customStatusText`, `pausedAt`,
   * `assignmentPaused`, and four timestamps). Those could describe states the
   * data did not support, and `customStatusText` was built from whichever modal
   * happened to be open.
   */
  activity: RoomActivityState;
  onBackPress: () => void;
  onStatusPress?: () => void;
  statusButtonRef?: React.RefObject<any>;
  onResumePause?: () => void;
  onReturnLaterElapsed?: () => void;
  onClearRefuseService?: () => void;
  isPriority?: boolean; // Reserved for future priority UI
  flagged?: boolean; // When true, show red flag in circular white badge after room number (flag room)
  frontOfficeLabel?: string; // Front office status e.g. "Stayover" - shown below room code for Stayover rooms
  showWithLinenBadge?: boolean; // When true, show "with Linen" badge next to Stayover label
}

/** "2:30 PM" — the time the subtitle rows print. */
function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** "14:05" — the 24-hour form the paused row has always shown. */
function formatClock(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

function formatRemaining(diffMs: number, withSeconds: boolean): string {
  if (withSeconds) {
    const totalMins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    if (totalMins >= 60) {
      const hours = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      return `${hours}h ${mins} min ${secs}s`;
    }
    return `${totalMins} mins ${secs}s`;
  }
  const totalMins = Math.max(0, Math.ceil(diffMs / 60000));
  return totalMins >= 60
    ? `${Math.floor(totalMins / 60)}h ${totalMins % 60} min`
    : `${totalMins} mins`;
}

/**
 * Live "time remaining" label for a deadline, or '' when there isn't one.
 *
 * Return Later and Promised Time each had their own copy of this; they differed
 * only in tick rate and whether seconds show.
 */
function useCountdown(
  targetMs: number | null,
  opts: { withSeconds: boolean; onElapsed?: () => void }
): string {
  const { withSeconds, onElapsed } = opts;
  const [label, setLabel] = useState('');
  // Kept in a ref so a new callback identity doesn't restart the interval.
  const onElapsedRef = React.useRef(onElapsed);
  useEffect(() => {
    onElapsedRef.current = onElapsed;
  }, [onElapsed]);

  useEffect(() => {
    if (targetMs == null) {
      setLabel('');
      return;
    }
    let didFire = false;
    const tick = () => {
      const diff = targetMs - Date.now();
      if (diff <= 0) {
        setLabel(withSeconds ? '0h 0 min 0s' : '0 mins');
        if (!didFire) {
          didFire = true;
          onElapsedRef.current?.();
        }
        return;
      }
      const next = formatRemaining(diff, withSeconds);
      // Avoid pointless state churn (keeps the UI smooth on slower devices).
      setLabel((prev) => (prev === next ? prev : next));
    };
    tick();
    const id = setInterval(tick, withSeconds ? 1000 : 10_000);
    return () => clearInterval(id);
  }, [targetMs, withSeconds]);

  return label;
}

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
  onClearRefuseService,
  isPriority = false,
  flagged = false,
  frontOfficeLabel,
  showWithLinenBadge = false,
}: RoomDetailHeaderProps) {
  const statusConfig = STATUS_CONFIGS[status] ?? STATUS_CONFIGS.Dirty;
  const theme = resolveRoomDetailHeaderTheme(activity, status);

  // Paused swaps the status glyph; every other activity keeps the room's own.
  const iconConfig =
    STATUS_CONFIGS[activity.kind === 'paused' ? 'Paused' : status] ?? STATUS_CONFIGS.Dirty;
  const overlaySpec = theme.overlayIcon ? OVERLAY_SPECS[theme.overlayIcon] : null;
  const displayStatusText = ROOM_ACTIVITY_LABEL[activity.kind] ?? statusConfig.label;

  const returnLaterRemaining = useCountdown(
    activity.kind === 'returnLater' ? activity.dueAt : null,
    { withSeconds: false, onElapsed: onReturnLaterElapsed }
  );
  const promiseTimeRemaining = useCountdown(
    activity.kind === 'promisedTime' ? activity.dueAt : null,
    { withSeconds: true }
  );

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.headerBackground }]}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBackPress}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {/*
          `action-chevron` already points left, so this needs no rotation — the
          rotated uses of it elsewhere (RoomStatusPill's `-90deg` down-chevron)
          are turning that same left-pointing mark. `size` is the height, and
          the width follows the 0.5 viewBox aspect: 9.31×18 painted inside the
          35×18 button, which is exactly what the 15×29 PNG painted at
          `resizeMode="contain"`.
        */}
        <Icon
          name="action-chevron"
          size={ROOM_DETAIL_HEADER.backButton.height * scaleX}
          color={theme.backArrowTint}
        />
      </TouchableOpacity>

      {/* Room Number + optional flag badge (when room is flagged) */}
      <View style={styles.roomNumberRow}>
        <Text
          style={[styles.roomNumber, { color: theme.roomNumberColor }]}
        >
          Room {roomNumber}
        </Text>
        {flagged && (
          <View style={styles.priorityBadge}>
            {/* The outline variant, not `action-flag`: the 14×19 PNG's 0.737
                aspect matches outline's 0.718, where the filled mark is 1.18. */}
            <Icon name="action-flag-outline" size={12 * scaleX} color="#f92424" />
          </View>
        )}
      </View>

      {/* Room Code */}
      <Text
        style={[styles.roomCode, { color: theme.roomCodeColor }]}
      >
        {roomCode}
      </Text>

      {/* Front Office Label (e.g. Stayover) + with Linen badge when applicable */}
      {frontOfficeLabel && (
        <View style={styles.frontOfficeLabelRow}>
          <Text
            style={[styles.frontOfficeLabel, { color: theme.roomCodeColor }]}
          >
            {frontOfficeLabel}
          </Text>
          {showWithLinenBadge && (
            <View style={styles.withLinenBadge}>
              <Text style={styles.withLinenBadgeText}>
                with Linen
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Status Indicator - always shows houseKeepingStatus (Dirty, In Progress, Cleaned, Inspected) */}
      <TouchableOpacity
        ref={statusButtonRef}
        style={styles.statusIndicator}
        onPress={onStatusPress}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <>
            {overlaySpec ? (
              // Disc in RN, glyph from the registry — see OVERLAY_SPECS.
              <View style={[styles.overlayStatusDisc, { backgroundColor: overlaySpec.disc }]}>
                <Icon
                  name={overlaySpec.icon}
                  size={overlaySpec.glyphHeight * scaleX}
                  color={overlaySpec.glyph}
                />
              </View>
            ) : (
              <Icon
                name={iconConfig.iconName}
                size={iconConfig.glyphHeight * scaleX}
                color={theme.statusTextAndIconColor}
                style={{ marginRight: 8 * scaleX }}
              />
            )}
            <Text
              style={[
                styles.statusText,
                { color: theme.statusTextAndIconColor },
                theme.statusTextStyle,
              ]}
            >
              {displayStatusText}
            </Text>
            {/*
              The same `action-chevron`, turned to point down. Two views because
              a transform does not change layout size: the outer one keeps the
              24.367×25.434 footprint the <Image> occupied, so the status row's
              spacing is untouched, and the inner one rotates. `size` is the
              *unrotated* height — 24.367 tall × 12.18 wide becomes 24.367 wide
              × 12.18 tall once turned, which is what the 18×9 PNG painted.
              Pattern copied from roomsList/RoomStatusPill.tsx:129-134.
            */}
            <View style={styles.dropdownArrow}>
              <View style={{ transform: [{ rotate: '-90deg' }] }}>
                <Icon
                  name="action-chevron"
                  size={24.367 * scaleX}
                  color={theme.statusTextAndIconColor}
                />
              </View>
            </View>
        </>
      </TouchableOpacity>

      {/*
        The state line under the status.

        These were four sibling blocks, each absolutely positioned at the same
        top — so if two of the DB columns were ever set at once they overlapped
        and rendered on top of each other. One state, one row.
      */}
      {activity.kind === 'paused' && (
        <View style={styles.pausedRow} pointerEvents="box-none">
          <Text style={[styles.pausedTimeInline, { color: theme.subtitleColor }]}>
            {activity.since == null ? 'Paused' : `Paused at: ${formatClock(activity.since)}`}
          </Text>
          {!!onResumePause && (
            <TouchableOpacity
              onPress={onResumePause}
              activeOpacity={0.75}
              style={styles.resumeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.resumeBtnText}>Resume</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {activity.kind === 'returnLater' && activity.dueAt != null && (
        <Text pointerEvents="none" style={[styles.returnLaterAt, { color: theme.subtitleColor }]}>
          {formatTime(activity.dueAt)}
          {returnLaterRemaining ? ` · ${returnLaterRemaining}` : ''}
        </Text>
      )}

      {activity.kind === 'promisedTime' && activity.dueAt != null && (
        <Text pointerEvents="none" style={[styles.returnLaterAt, { color: theme.subtitleColor }]}>
          {formatTime(activity.dueAt)}
          {promiseTimeRemaining ? ` · ${promiseTimeRemaining}` : ''}
        </Text>
      )}

      {activity.kind === 'refuseService' && (activity.reason != null || activity.at != null) && (
        <View style={styles.refuseRow} pointerEvents="box-none">
          <Text pointerEvents="none" style={[styles.refuseText, { color: theme.subtitleColor }]}>
            Refused: {activity.reason ?? (activity.at != null ? formatTime(activity.at) : '')}
          </Text>
          {!!onClearRefuseService && (
            <TouchableOpacity
              onPress={onClearRefuseService}
              activeOpacity={0.75}
              style={styles.clearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ROOM_DETAIL_HEADER.height * scaleX,
    // backgroundColor is set dynamically based on status
    zIndex: 100, // Above all other content
    elevation: 100, // For Android
  },
  backButton: {
    position: 'absolute',
    left: ROOM_DETAIL_HEADER.backButton.left * scaleX,
    top: ROOM_DETAIL_HEADER.backButton.top * scaleX,
    width: ROOM_DETAIL_HEADER.backButton.width * scaleX,
    height: ROOM_DETAIL_HEADER.backButton.height * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200, // Ensure it's above subtitle overlays
    elevation: 200,
  },
  roomNumberRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    left: 0,
    right: 0,
    top: ROOM_DETAIL_HEADER.roomNumber.top * scaleX,
    gap: 10 * scaleX,
  },
  roomNumber: {
    fontSize: ROOM_DETAIL_HEADER.roomNumber.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: ROOM_DETAIL_HEADER.roomNumber.color,
  },
  priorityBadge: {
    width: 28 * scaleX,
    height: 28 * scaleX,
    borderRadius: 14 * scaleX,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomCode: {
    position: 'absolute',
    fontSize: ROOM_DETAIL_HEADER.roomCode.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.light as any,
    color: ROOM_DETAIL_HEADER.roomCode.color,
    top: ROOM_DETAIL_HEADER.roomCode.top * scaleX,
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  frontOfficeLabelRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    left: 0,
    right: 0,
    top: 130 * scaleX,
    gap: 6 * scaleX,
  },
  frontOfficeLabel: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: ROOM_DETAIL_HEADER.roomCode.color,
  },
  withLinenBadge: {
    paddingHorizontal: 8 * scaleX,
    paddingVertical: 2 * scaleX,
    borderRadius: 6 * scaleX,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(123, 31, 162, 0.7)',
  },
  withLinenBadgeFlagged: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(123, 31, 162, 0.8)',
  },
  withLinenBadgeText: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#334866',
  },
  withLinenBadgeTextFlagged: {
    color: '#334866',
  },
  statusIndicator: {
    position: 'absolute',
    left: ROOM_DETAIL_HEADER.statusIndicator.left * scaleX,
    top: ROOM_DETAIL_HEADER.statusIndicator.top * scaleX,
    width: ROOM_DETAIL_HEADER.statusIndicator.width * scaleX,
    height: ROOM_DETAIL_HEADER.statusIndicator.height * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flaggedFlagIcon: {
    width: ROOM_DETAIL_HEADER.flagged.pill.flagIcon.width * scaleX,
    height: ROOM_DETAIL_HEADER.flagged.pill.flagIcon.height * scaleX,
    marginRight: 8 * scaleX,
  },
  flaggedPillText: {
    fontSize: 19 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300' as any,
    color: ROOM_DETAIL_HEADER.flagged.pill.textAndIconTint,
  },
  flaggedDropdownArrow: {
    width: ROOM_DETAIL_HEADER.flagged.pill.dropdownArrow.width * scaleX,
    height: ROOM_DETAIL_HEADER.flagged.pill.dropdownArrow.height * scaleX,
    marginLeft: 8 * scaleX,
  },
  overlayStatusDisc: {
    // The disc the 51×51 asset drew, now in RN. `width` is the whole box the
    // image occupied, because the asset's circle was inscribed in it.
    width: OVERLAY_DISC * scaleX,
    height: OVERLAY_DISC * scaleX,
    borderRadius: (OVERLAY_DISC / 2) * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8 * scaleX,
  },
  statusText: {
    fontSize: 19 * scaleX,
    fontFamily: 'Helvetica',
    fontStyle: 'normal',
    fontWeight: '300' as any,
    lineHeight: undefined,
    color: '#FFF',
  },
  dropdownArrow: {
    // Footprint only; the rotation lives on the inner view. The `tintColor`
    // that used to sit here was dead anyway — the inline style overrode it.
    width: 24.367 * scaleX,
    height: 25.434 * scaleX,
    marginLeft: 8 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pausedTime: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (ROOM_DETAIL_HEADER.statusIndicator.top + ROOM_DETAIL_HEADER.statusIndicator.height + 8) * scaleX, // Below status indicator with 8px spacing
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: 'light' as any,
    color: '#ffffff',
    textAlign: 'center',
  },
  pausedRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (ROOM_DETAIL_HEADER.statusIndicator.top + ROOM_DETAIL_HEADER.statusIndicator.height + 8) * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10 * scaleX,
  },
  pausedTimeInline: {
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: 'light' as any,
    color: '#ffffff',
    textAlign: 'center',
  },
  resumeBtn: {
    height: 18 * scaleX,
    paddingHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeBtnText: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#f92424',
    includeFontPadding: false,
  },
  returnLaterAt: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (ROOM_DETAIL_HEADER.statusIndicator.top + ROOM_DETAIL_HEADER.statusIndicator.height + 8) * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: 'light' as any,
    color: '#ffffff',
    textAlign: 'center',
  },
  refuseRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (ROOM_DETAIL_HEADER.statusIndicator.top + ROOM_DETAIL_HEADER.statusIndicator.height + 8) * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10 * scaleX,
  },
  refuseText: {
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: 'light' as any,
    textAlign: 'center',
  },
  clearBtn: {
    height: 18 * scaleX,
    paddingHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#f92424',
    includeFontPadding: false,
  },
});

