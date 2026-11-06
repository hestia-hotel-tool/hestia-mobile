import { useCallback, useEffect, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Easing, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

/** Scrolled this far down before the header may collapse. */
const COLLAPSE_AT = 24;
/** At (or pulled past) the top the header is always open. */
const EXPAND_AT = 4;
/** Upward travel, anywhere in the list, that brings the header back ("quick return"). */
const QUICK_RETURN = 48;
/** Downward travel before collapsing, so a resting finger's jitter does nothing. */
const DOWN_TRAVEL = 8;
/**
 * Only collapse a list with clearly more to scroll than the header gives back.
 * Otherwise collapsing grows the list past its content, the offset clamps
 * back to the top and the header reopens — a flicker loop.
 */
const MIN_RANGE = 240;
/** Near the bottom an offset can be clamped by a resize; it is not a scroll up. */
const BOTTOM_GUARD = 160;
export const HEADER_COLLAPSE_MS = 220;

export type CollapsingHeader = {
  /** 1 open, 0 collapsed — animated, for the header's styles. */
  progress: SharedValue<number>;
  /** Feed every scroll event of the list here. */
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

/**
 * A list header that gets out of the way — the Rooms screen's profile band.
 *
 * Scrolling down collapses it and leaves the search field pinned; scrolling
 * up by a flick, anywhere in the list, brings it back (the quick-return
 * pattern of Mail, Gmail and most feed apps), so the AM/PM toggle is never
 * far. At the top it is always open.
 *
 * Discrete and timed, not scroll-linked: the header stays in the flex flow
 * because the banded list floats its pinned In Progress band at the list's own
 * top (GroupedRoomsList), which an overlay header would cover. A height that
 * tracked the finger frame by frame would resize the list under it on every
 * frame; one short animation per change does not.
 *
 * `enabled: false` freezes it — while the status popover measures its card,
 * a header changing height would move the card out from under the anchor.
 */
export function useCollapsingHeader({ enabled }: { enabled: boolean }): CollapsingHeader {
  const progress = useSharedValue(1);
  const state = useRef({ collapsed: false, lastY: 0, travel: 0, lockedUntil: 0 });
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const setCollapsed = useCallback(
    (collapsed: boolean) => {
      const s = state.current;
      s.collapsed = collapsed;
      s.travel = 0;
      // The list resizes while the header animates; its scroll events are not the user's.
      s.lockedUntil = Date.now() + HEADER_COLLAPSE_MS + 80;
      progress.set(withTiming(collapsed ? 0 : 1, {
        duration: HEADER_COLLAPSE_MS,
        easing: Easing.out(Easing.cubic),
      }));
    },
    [progress]
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const s = state.current;
      const y = contentOffset.y;
      const dy = y - s.lastY;
      s.lastY = y;
      if (!enabledRef.current || Date.now() < s.lockedUntil) return;

      if (y <= EXPAND_AT) {
        if (s.collapsed) setCollapsed(false);
        return;
      }

      // Distance travelled in the current direction; a reversal starts over.
      s.travel = dy !== 0 && Math.sign(dy) === Math.sign(s.travel) ? s.travel + dy : dy;
      const range = contentSize.height - layoutMeasurement.height;

      if (!s.collapsed) {
        if (y > COLLAPSE_AT && range > MIN_RANGE && s.travel > DOWN_TRAVEL) setCollapsed(true);
      } else if (s.travel < -QUICK_RETURN && y < range - BOTTOM_GUARD) {
        setCollapsed(false);
      }
    },
    [setCollapsed]
  );

  return { progress, onScroll };
}
