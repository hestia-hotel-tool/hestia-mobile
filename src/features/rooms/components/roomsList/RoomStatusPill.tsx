import React from 'react';
import { View, Text, Pressable } from '@/tw';
import { ActivityIndicator, View as RNView } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { colors, typography } from '@/theme';
import { STATUS_CONFIGS, type RoomDisplayStatus } from '../../types/allRooms.types';
import { ROOM_CARD, cardPx } from './roomCardLayout';

export type RoomStatusPillProps = {
  status: RoomDisplayStatus;
  /**
   * Opens the status menu. Omit it for a reader who may not change housekeeping
   * status: the pill then draws as a badge — glyph and words, no chevron, not a
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
 * The card's action control — Figma 4553:902.
 *
 * 207 x 70: the status glyph, the status in words (bold 17) and a chevron,
 * on the status colour. It sits in the card's footer, right of the attendant.
 *
 * Every mark is placed where the frame draws it (GLYPH, LABEL, CHEVRON): the
 * glyphs differ in width, so a shared left edge would set them off-centre
 * against each other.
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
  const label = PILL_LABEL[status] ?? config.label ?? status;

  /*
   * The chevron means "this opens the status menu", so it appears only where
   * the pill actually does. Front Office's pill (3859:1919) is a status badge:
   * never a chevron, and its own marks for Dirty and Paused. The priority pill
   * flags attention rather than offering the next status: centred, no chevron.
   */
  const showChevron = !!onPress && !isPriority && !frontOffice;
  const glyph = (frontOffice && FRONT_OFFICE_GLYPHS[status]) || {
    icon: config.iconName,
    height: PILL_GLYPH_HEIGHT[status] ?? config.glyphHeight ?? 25.4,
  };
  const at = GLYPH[status] ?? DEFAULT_GLYPH;

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
        accessibilityLabel={isPriority ? 'Priority room' : `Status: ${label}`}
        className={isPriority || loading ? 'flex-row items-center justify-center rounded-7xl' : 'rounded-7xl'}
        style={{
          width: ROOM_CARD.pill.width,
          height: ROOM_CARD.pill.height,
          backgroundColor: isPriority ? colors.badge.priority : config.color,
        }}
      >
        {loading ? (
          <ActivityIndicator color={glyphColor} />
        ) : isPriority ? (
          // The rush figure: 33.8 x 28.6 in 3883:5795, centred.
          <Icon name="action-flag" size={cardPx(28.6)} color={glyphColor} />
        ) : (
          <>
            <View
              className="absolute items-center justify-center"
              style={{
                left: cardPx(at.x) - GLYPH_BOX / 2,
                top: cardPx(at.y) - GLYPH_BOX / 2,
                width: GLYPH_BOX,
                height: GLYPH_BOX,
              }}
            >
              <Icon name={glyph.icon} size={cardPx(glyph.height)} color={glyphColor} />
            </View>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              className="absolute text-center"
              style={{
                left: LABEL.left,
                width: LABEL.width,
                top: LABEL.top,
                fontFamily: typography.fontFamily.primary,
                fontSize: LABEL.size,
                lineHeight: LABEL.line,
                fontWeight: '700',
                color: PILL_LABEL_COLOR[status] ?? glyphColor,
              }}
            >
              {label}
            </Text>
            {showChevron ? (
              // 4553:1400: 25 x 12 at (160, 31). The registered chevron points
              // right, so it is turned -90deg inside a box with the turned footprint.
              <View
                className="absolute items-center justify-center"
                style={{ left: CHEVRON.left, top: CHEVRON.top, width: CHEVRON.width, height: CHEVRON.height }}
              >
                <View style={{ transform: [{ rotate: '-90deg' }] }}>
                  <Icon name="action-chevron" size={CHEVRON.width} color={glyphColor} />
                </View>
              </View>
            ) : null}
          </>
        )}
      </Pressable>
    </RNView>
  );
}

/** The pill's words where they differ from the status's own label (4553:1370, 4553:1652). */
const PILL_LABEL: Partial<Record<RoomDisplayStatus, string>> = {
  RefusedService: 'No Service',
  DoNotDisturb: 'DND',
};

/** Return Later's words are #7587ae (4553:1467), a shade off its #5a759d glyph and chevron. */
const PILL_LABEL_COLOR: Partial<Record<RoomDisplayStatus, string>> = {
  ReturnLater: '#7587ae',
};

/** Paused draws its vacuum 31.2 tall on this pill (4553:1131), not the 48 of the old one. */
const PILL_GLYPH_HEIGHT: Partial<Record<RoomDisplayStatus, number>> = {
  Paused: 31.2,
};

/**
 * Each glyph's centre on the pill, from 4553:262. Inspected is not drawn
 * there and takes Cleaned's place.
 */
const GLYPH: Partial<Record<RoomDisplayStatus, { x: number; y: number }>> = {
  Dirty: { x: 37.4, y: 35.9 },
  InProgress: { x: 31.8, y: 33.3 },
  Cleaned: { x: 37, y: 33.3 },
  Inspected: { x: 37, y: 33.3 },
  Paused: { x: 37.4, y: 34.8 },
  RefusedService: { x: 31.8, y: 33.4 },
  ReturnLater: { x: 31, y: 33 },
  DoNotDisturb: { x: 38.4, y: 34.8 },
};
const DEFAULT_GLYPH = { x: 35, y: 35 };
/** Wide enough for the widest mark (the DND tag, 40.6). */
const GLYPH_BOX = cardPx(50);

/**
 * The words, centred on 104 across the pill — where every label in
 * 4553:262 centres, give or take 4 — between the glyph and the chevron.
 * Bold 17 cap tops at 26.9, so a 20 line starts at 24.5.
 */
const LABEL = {
  left: cardPx(50),
  width: cardPx(108),
  top: cardPx(24.5),
  size: cardPx(17),
  line: cardPx(20),
};

const CHEVRON = { left: cardPx(160), top: cardPx(31), width: cardPx(25), height: cardPx(12.5) };

/**
 * Front Office draws Dirty with the vacuum (3883:5047, 25.4) rather than the
 * dust cloud, and Paused as a pause ring (3859:2921: 36.8, 39 with its stroke)
 * rather than the paused vacuum. Every other mark is housekeeping's.
 */
const FRONT_OFFICE_GLYPHS: Partial<Record<RoomDisplayStatus, { icon: IconName; height: number }>> = {
  Dirty: { icon: 'status-vacuum', height: 25.4 },
  Paused: { icon: 'status-pause-circle', height: 39 },
};

export default RoomStatusPill;
