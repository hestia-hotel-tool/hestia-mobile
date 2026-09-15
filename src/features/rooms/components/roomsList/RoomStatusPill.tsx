import React from 'react';
import { View, Pressable } from '@/tw';
import { ActivityIndicator, View as RNView } from 'react-native';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme';
import { STATUS_CONFIGS, type RoomDisplayStatus } from '../../types/allRooms.types';
import { ROOM_CARD } from './roomCardLayout';

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
}: RoomStatusPillProps) {
  const config = STATUS_CONFIGS[status];
  if (!config) return null;

  const isPriority = tone === 'priority';
  const glyphColor = isPriority ? colors.status.dirty : colors.text.white;

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
  const showChevron = !!onPress && !isPriority;

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
        // Spread when there are two marks, centred when there is one. Measured
        // off the priority pill (node 3838:1341, whose red-on-pale glyphs scan
        // cleanly where white-on-amber does not): the glyph's left edge sits at
        // x=21 and the chevron's right edge at x=105 of 134, so the two sit
        // apart with the ground showing between them. Centring them as a pair
        // bunched both into the middle.
        className={
          showChevron
            ? 'flex-row items-center justify-between rounded-7xl pl-[21px] pr-[28px]'
            : 'flex-row items-center justify-center rounded-7xl'
        }
        style={{
          width: ROOM_CARD.pill.width,
          height: ROOM_CARD.pill.height,
          backgroundColor: isPriority ? colors.badge.priority : config.color,
        }}
      >
        {loading ? (
          <View className="flex-1 items-center">
            <ActivityIndicator color={glyphColor} />
          </View>
        ) : (
          <>
            <Icon
              name={isPriority ? 'action-flag' : config.iconName}
              // The rush figure is drawn larger than the status marks: 34x28 in
              // the design against the vacuum's 25.4 tall.
              size={isPriority ? 28 : (config.glyphHeight ?? 25.4)}
              color={glyphColor}
            />
            {/* Two nested views on purpose. The registered chevron points
                right, so it is rotated -90deg to aim it down — but a transform
                does not change layout size: the icon lays out 13 wide and 26
                tall, then paints 26 wide and 13 tall, overflowing its own box
                by 6.5px each side. Left to itself `justify-between` then placed
                the *box* against the padding and let the visible mark spill
                past it, landing the chevron ~8pt right of the design. The outer
                view carries the rotated footprint (26x13, against the design's
                25x12) so layout and paint agree. */}
            {showChevron && (
              <View className="items-center justify-center" style={{ width: 26, height: 13 }}>
                <View style={{ transform: [{ rotate: '-90deg' }] }}>
                  <Icon name="action-chevron" size={26} color={glyphColor} />
                </View>
              </View>
            )}
          </>
        )}
      </Pressable>
    </RNView>
  );
}

export default RoomStatusPill;
