import React, { useRef } from 'react';
import { ActivityIndicator, Text, View as RNView } from 'react-native';
import { Pressable, View } from '@/tw';
import { Icon } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import { LOST_AND_FOUND_CARD_LAYOUT as L } from './lostAndFoundCardLayout';
import type { LostAndFoundCardChrome } from '../../constants/lostAndFoundCardChrome';
import { LOST_AND_FOUND_CARD_THEME } from '../../constants/lostAndFoundTheme';

/** Where the popover should point, in window coordinates. */
export type LostAndFoundStatusAnchorLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ItemStatusPillProps = {
  chrome: LostAndFoundCardChrome;
  /** Absent on Room Detail, which shows the pill but does not let you change it. */
  onStatusPress?: (anchor?: LostAndFoundStatusAnchorLayout) => void;
  updating?: boolean;
  /**
   * `large`: the card's own pill in Figma 3128:32 as redrawn (4735:396) —
   * 177 x 70, icon, the status in words (bold 17 white) and a wide chevron.
   * `small` (default): the 56 x 38 icon-and-chevron pill.
   */
  size?: 'small' | 'large';
};

/** 4735:396 — 177 x 70, radius 45: the icon 18 in, the label at 56, the chevron 22 from the end. */
const LARGE = { width: 177, height: 70, radius: 45, paddingLeft: 18, paddingRight: 22, iconSlot: 24, gap: 14 };

/**
 * The status pill — Figma 3128:32 (nodes 4319:1510, 4319:1549, 4319:1598):
 * the status's icon and a chevron on its colour, 56 x 38. The status in words
 * is its accessibility label.
 *
 * **Not a touchable when `onStatusPress` is absent.** Room Detail renders this
 * card without a status handler, and a `Pressable` that does nothing still
 * takes the press, swallows it from the card underneath, and reads as
 * interactive to a screen reader. So the read-only case renders a plain View.
 */
export function ItemStatusPill({ chrome, onStatusPress, updating = false, size = 'small' }: ItemStatusPillProps) {
  const ref = useRef<RNView>(null);
  const tone = LOST_AND_FOUND_CARD_THEME[chrome.pillTone];

  /*
   * Report an approximate anchor on press-in, then the measured one.
   *
   * `measureInWindow` resolves a frame or more later and on iOS can fail to
   * invoke its callback at all for some refs. Opening on the estimate means the
   * popover appears immediately and merely re-points once the real rect lands,
   * rather than not opening.
   */
  /** Where the finger landed — the fallback anchor if measuring fails. */
  const touchEstimate = useRef<LostAndFoundStatusAnchorLayout | null>(null);

  const handlePressIn = (event: { nativeEvent?: { pageX?: number; pageY?: number } }) => {
    const { pageX, pageY } = event.nativeEvent ?? {};
    if (typeof pageX !== 'number' || typeof pageY !== 'number') return;
    const height = L.statusPill.height * scaleX;
    touchEstimate.current = { x: pageX, y: pageY - height / 2, width: 0, height };
  };

  /*
   * Open the popover exactly once, anchored to the pill.
   *
   * This used to fire three times: an estimate on press-in (which opened the
   * popover mid-tap), then `onStatusPress(undefined)` on press — wiping that
   * estimate, so the popover fell back to sitting flush under the header — and
   * then a measurement that never arrived, because `measureInWindow` was read
   * off the ref and called detached. Without its `this` it threw, the empty
   * `catch` swallowed it, and the popover stayed at the top of the screen.
   */
  const handlePress = () => {
    if (!onStatusPress) return;
    const fallback = touchEstimate.current ?? undefined;
    const node = ref.current as unknown as {
      measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
    } | null;

    if (!node?.measureInWindow) {
      onStatusPress(fallback);
      return;
    }
    try {
      node.measureInWindow((x, y, width, height) => {
        const measured = [x, y, width, height].every((v) => typeof v === 'number' && !Number.isNaN(v));
        onStatusPress(measured && height > 0 ? { x, y, width, height } : fallback);
      });
    } catch {
      onStatusPress(fallback);
    }
  };

  const largeBody = (
    <>
      <View className="items-center justify-center" style={{ width: LARGE.iconSlot * scaleX }}>
        <Icon
          name={chrome.pillIcon}
          size={(chrome.pillTone === 'shipped' ? 22 : 24) * scaleX}
          color={tone.glyph}
        />
      </View>
      <Text
        style={{ flex: 1, fontSize: 17 * scaleX, fontFamily: 'Helvetica', fontWeight: '700', color: tone.label }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {chrome.pillLabel}
      </Text>
      <Icon name="action-chevron-down-wide" width={23 * scaleX} height={10.8 * scaleX} color={tone.glyph} />
    </>
  );

  const body = updating ? (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="small" color={tone.label} />
    </View>
  ) : (
    <>
      <View className="items-center justify-center" style={{ width: L.statusPill.iconSlot * scaleX }}>
        <Icon name={chrome.pillIcon} size={L.statusPill.iconSize * scaleX} color={tone.glyph} />
      </View>
      {chrome.pillGlyph === 'tick' ? (
        <Icon
          name="action-check"
          width={L.statusPill.tick.width * scaleX}
          height={L.statusPill.tick.height * scaleX}
          color={tone.glyph}
        />
      ) : (
        /*
          A chevron turned down. The transform does not change layout size, so
          the outer box carries the designed footprint while the inner View
          rotates a glyph laid out tall and narrow into it.
        */
        <View
          className="items-center justify-center"
          style={{
            width: L.statusPill.chevron.width * scaleX,
            height: L.statusPill.chevron.height * scaleX,
          }}
        >
          <View style={{ transform: [{ rotate: '-90deg' }] }}>
            <Icon
              name="action-chevron"
              size={L.statusPill.chevron.width * scaleX}
              color={tone.glyph}
            />
          </View>
        </View>
      )}
    </>
  );

  const shape =
    size === 'large'
      ? {
          width: LARGE.width * scaleX,
          height: LARGE.height * scaleX,
          borderRadius: LARGE.radius * scaleX,
          backgroundColor: tone.pill,
          paddingLeft: LARGE.paddingLeft * scaleX,
          paddingRight: LARGE.paddingRight * scaleX,
          gap: LARGE.gap * scaleX,
        }
      : {
          width: L.statusPill.width * scaleX,
          height: L.statusPill.height * scaleX,
          borderRadius: L.statusPill.radius * scaleX,
          backgroundColor: tone.pill,
          paddingLeft: L.statusPill.paddingLeft * scaleX,
          gap: L.statusPill.gap * scaleX,
        };
  const content = size === 'large' && !updating ? largeBody : body;

  if (!onStatusPress) {
    return (
      <View className="flex-row items-center" style={shape} accessibilityLabel={chrome.pillLabel}>
        {content}
      </View>
    );
  }

  /*
   * A plain react-native View holds the ref, not the `@/tw` wrapper.
   *
   * `measureInWindow` needs the native handle, and the CSS wrappers are typed
   * `ComponentType<any>` with no contract that they forward a ref to it. The
   * popover's whole position depends on this measurement, so it uses the
   * component that is documented to provide it.
   */
  return (
    <RNView ref={ref} collapsable={false}>
      <Pressable
        className="flex-row items-center"
        style={shape}
        onPressIn={handlePressIn}
        onPress={handlePress}
        disabled={updating}
        accessibilityRole="button"
        accessibilityLabel={`Change status, currently ${chrome.pillLabel}`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {content}
      </Pressable>
    </RNView>
  );
}

export default ItemStatusPill;
