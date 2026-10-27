import React from 'react';
import { View, Pressable } from '@/tw';
import { ActivityIndicator, View as RNView } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { colors } from '@/theme';
import { STATUS_CONFIGS, type RoomDisplayStatus } from '../../types/allRooms.types';
import { ROOM_CARD, cardPx } from './roomCardLayout';

export type RoomStatusPillProps = {
  status: RoomDisplayStatus;
  /**
   * Opens the status menu. Omit it for a reader who may not change housekeeping
   * status: the pill then draws as a badge — glyph centred, no chevron, not a
   * tap target — which is how Front Office's frame (3859:1919) shows it.
   */
  onPress?: () => void;
  /**
   * `priority` is the pale variant on a priority card — Figma 3883:5794: an
   * #ffebeb ground with a red rush glyph and no chevron, because the card is
   * flagging attention rather than offering the next status.
   */
  tone?: 'solid' | 'priority';
  loading?: boolean;
  /** Measured by the screen to anchor the status popover. See RoomCardShell. */
  measureRef?: React.Ref<RNView>;
  /**
   * Front Office's pill (Figma 3859:1919): never the menu chevron — the pill
   * still opens the menu when `onPress` is given — and its own marks for Dirty
   * and Paused (FRONT_OFFICE_GLYPHS).
   */
  frontOffice?: boolean;
};

/**
 * The card's action control — Figma 3883:6417.
 *
 * 134x70 with the status glyph and a chevron, white on the status colour.
 *
 * It is a normal flex child of the guest panel, not an overlay. In the design
 * the panel spans x=16..408 and the pill sits at x=243..377 fully inside it,
 * vertically centred — and centred across *both* rows on an Arrival/Departure
 * card. That is `self-center` in a fixed-width column, which is why this
 * component needs no `top`, no `cardHeight` and no per-card-type position
 * table.
 */
export function RoomStatusPill({
  status,
  onPress,
  tone = 'solid',
  loading = false,
  measureRef,
  frontOffice = false,
}: RoomStatusPillProps) {
  const config = STATUS_CONFIGS[status];
  if (!config) return null;

  const isPriority = tone === 'priority';
  const glyphColor = isPriority ? colors.status.dirty : (config.foreground ?? colors.text.white);

  /*
   * The chevron means "this opens the status menu", so it appears only where
   * the pill actually does.
   *
   * Measured off the frames rather than assumed. Comparing the executive
   * housekeeper's Rooms screen (3883:5570) against Front Office's (3859:1919),
   * which is otherwise the same frame pixel for pixel: on the 134pt pill the
   * housekeeper's glyph sits at offset 20 with a chevron at 85, while Front
   * Office's single glyph is centred on the pill and there is no chevron. Front
   * Office holds no `rooms.status.update`, so their pill is a status badge.
   *
   * The priority pill is centred and chevron-less in *both* frames — it flags
   * attention rather than offering the next status — which is what this
   * component's own prop doc already claimed while the markup did the opposite.
   */
  const showChevron = !!onPress && !isPriority && !frontOffice;
  const glyph = (frontOffice && FRONT_OFFICE_GLYPHS[status]) || { icon: config.iconName, height: config.glyphHeight ?? 25.4 };

  return (
    <RNView
      ref={measureRef}
      collapsable={false}
      /*
       * Swallow the touch when the pill is not a control.
       *
       * A disabled `Pressable` does not claim the responder, so without this
       * the press falls through to the card behind it and opens room detail —
       * tapping a status badge would silently navigate. Claiming the responder
       * here makes the click do nothing at all, which is what "cannot change
       * status" should feel like.
       */
      onStartShouldSetResponder={onPress ? undefined : () => true}
    >
      <Pressable
        onPress={onPress}
        disabled={loading || !onPress}
        accessibilityRole={showChevron ? 'button' : 'image'}
        accessibilityLabel={isPriority ? 'Priority room' : `Status: ${config.label ?? status}`}
        // With a chevron, both marks are placed where the frame draws them
        // (GLYPH_CENTRE, CHEVRON_LEFT); a lone mark is centred.
        className={showChevron ? 'rounded-7xl' : 'flex-row items-center justify-center rounded-7xl'}
        style={{
          width: ROOM_CARD.pill.width,
          height: ROOM_CARD.pill.height,
          backgroundColor: isPriority ? colors.badge.priority : config.color,
        }}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={glyphColor} />
          </View>
        ) : showChevron ? (
          <>
            {/* Where the frame draws each mark: its centre across the pill. */}
            <View
              className="absolute items-center justify-center"
              style={{
                left: cardPx(GLYPH_CENTRE[status] ?? 38) - GLYPH_BOX / 2,
                width: GLYPH_BOX,
                top: cardPx(GLYPH_MIDDLE[status] ?? 35) - GLYPH_BOX / 2,
                height: GLYPH_BOX,
              }}
            >
              <Icon name={glyph.icon} size={cardPx(glyph.height)} color={glyphColor} />
            </View>
            {/* 3883:6421: 25x12 at x81, centred down the pill. The registered
                chevron points right, so it is turned -90deg inside a box
                that carries the turned footprint. */}
            <View
              className="absolute items-center justify-center"
              style={{ left: CHEVRON_LEFT, width: CHEVRON, height: CHEVRON / 2, top: (ROOM_CARD.pill.height - CHEVRON / 2) / 2 }}
            >
              <View style={{ transform: [{ rotate: '-90deg' }] }}>
                <Icon name="action-chevron" size={CHEVRON} color={glyphColor} />
              </View>
            </View>
          </>
        ) : (
          <Icon
            name={isPriority ? 'action-flag' : glyph.icon}
            // The rush figure: 33.8 x 28.6 in 3883:5795, centred.
            size={cardPx(isPriority ? 28.6 : glyph.height)}
            color={glyphColor}
          />
        )}
      </Pressable>
    </RNView>
  );
}

/**
 * Each mark's centre across the 134 pill, from the frame's pills
 * (3883:5570): the marks differ in width, so a shared left edge would set
 * them off-centre against each other.
 */
const GLYPH_CENTRE: Partial<Record<RoomDisplayStatus, number>> = {
  Dirty: 38.5,
  InProgress: 35,
  Cleaned: 38,
  Inspected: 37,
  Paused: 41.5,
  RefusedService: 40,
  ReturnLater: 41,
  DoNotDisturb: 40.5,
};
/** Wide enough for the widest mark (the paused vacuum, 46). */
/**
 * Front Office draws Dirty with the vacuum (3883:5047, 25.4) rather than the
 * dust cloud, and Paused as a pause ring (3859:2921: 36.8, 39 with its stroke)
 * rather than the paused vacuum. Every other mark is housekeeping's.
 */
const FRONT_OFFICE_GLYPHS: Partial<Record<RoomDisplayStatus, { icon: IconName; height: number }>> = {
  Dirty: { icon: 'status-vacuum', height: 25.4 },
  Paused: { icon: 'status-pause-circle', height: 39 },
};

/** Its centre down the pill, where the frame draws it off the 35 middle. */
const GLYPH_MIDDLE: Partial<Record<RoomDisplayStatus, number>> = {
  Paused: 31.4,
  Inspected: 32.5,
};
const GLYPH_BOX = cardPx(50);
const CHEVRON_LEFT = cardPx(81);
const CHEVRON = cardPx(26);

export default RoomStatusPill;
