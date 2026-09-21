import React, { useRef } from 'react';
import { ActivityIndicator, View as RNView } from 'react-native';
import { Pressable, Text, View } from '@/tw';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
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
};

/**
 * The status pill — Figma nodes 3871:3587 and 3871:3621.
 *
 * **Content-hugging.** The frame's 118 and 126 are the two labels' widths plus
 * one padding, not two settings; see `lostAndFoundCardLayout.statusPill`.
 *
 * **Not a touchable when `onStatusPress` is absent.** Room Detail renders this
 * card without a status handler, and a `Pressable` that does nothing still
 * takes the press, swallows it from the card underneath, and reads as
 * interactive to a screen reader. So the read-only case renders a plain View.
 */
export function ItemStatusPill({ chrome, onStatusPress, updating = false }: ItemStatusPillProps) {
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
  const handlePressIn = (event: { nativeEvent?: { pageX?: number; pageY?: number } }) => {
    if (!onStatusPress) return;
    const { pageX, pageY } = event.nativeEvent ?? {};
    if (typeof pageX !== 'number' || typeof pageY !== 'number') return;
    const height = L.statusPill.height * scaleX;
    onStatusPress({ x: pageX, y: pageY - height / 2, width: 0, height });
  };

  const handlePress = () => {
    if (!onStatusPress) return;
    onStatusPress(undefined);

    const measure = (ref.current as unknown as {
      measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
    } | null)?.measureInWindow;
    if (typeof measure !== 'function') return;
    try {
      measure((x, y, width, height) => onStatusPress({ x, y, width, height }));
    } catch {
      // iOS can throw here (__internalInstanceHandle undefined). The popover is
      // already open on the estimate; it just keeps that position.
    }
  };

  const body = updating ? (
    <ActivityIndicator size="small" color={tone.label} />
  ) : (
    <>
      <Text
        className="font-hestia-primary font-bold"
        numberOfLines={1}
        style={{
          fontSize: L.statusPill.fontSize * scaleX,
          fontFamily: typography.fontFamily.primary,
          color: tone.label,
        }}
      >
        {chrome.pillLabel}
      </Text>
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
          the outer box carries the designed 17x8 footprint while the inner View
          rotates a glyph laid out 8 wide by 16 tall into it.
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
              size={L.statusPill.chevron.height * 2 * scaleX}
              color={tone.glyph}
            />
          </View>
        </View>
      )}
    </>
  );

  const shape = {
    height: L.statusPill.height * scaleX,
    borderRadius: L.statusPill.radius * scaleX,
    backgroundColor: tone.pill,
    paddingLeft: L.statusPill.paddingLeft * scaleX,
    paddingRight: L.statusPill.paddingRight * scaleX,
    gap: L.statusPill.gap * scaleX,
  };

  if (!onStatusPress) {
    return (
      <View className="flex-row items-center" style={shape}>
        {body}
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
        {body}
      </Pressable>
    </RNView>
  );
}

export default ItemStatusPill;
