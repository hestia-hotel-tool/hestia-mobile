import type { ScrollView } from 'react-native';

/** Anything with `measureInWindow` — a native view handle. */
type Measurable = { measureInWindow?: (cb: (...args: number[]) => void) => void } | null | undefined;

export type UseKeepRoomVisibleOptions = {
  /** The list the cards live in. */
  scrollRef: React.RefObject<ScrollView | null>;
  /** Card wrappers by room id, registered by the screen. */
  cardRefs: React.MutableRefObject<Record<string, Measurable>>;
  /** Live scroll offset, so a correction can be applied relative to it. */
  scrollOffsetRef: React.MutableRefObject<number>;
  /** Window y below which the list is actually visible — under the header. */
  topBound: number;
  /** Window y above which the list is actually visible — over the tab bar. */
  bottomBound: number;
};

/**
 * Keep a room on screen after its own status change.
 *
 * Why this is needed. The housekeeping Rooms list is *banded* by status
 * (`groupRoomsByStatus`), so changing a room from In Progress to Dirty does not
 * repaint it in place — it moves the card out of one band and into another,
 * further down. The band it left may also disappear entirely, since
 * `groupRoomsByStatus` drops empty bands, which pulls everything above the card
 * upwards as well. The net effect is that the room you just acted on jumps
 * somewhere else, often off-screen, and the confirmation you wanted to see is
 * the one thing you cannot.
 *
 * The correction is deliberately *minimal*: if the card is still fully visible
 * after the re-band, nothing happens at all. Only when it has left the usable
 * viewport is the list nudged by exactly the overshoot, so the card comes back
 * to the nearest edge rather than being centred or scrolled to the top. A
 * bigger scroll would be its own kind of "the list moved under me".
 *
 * Not restricted to the banded variants: on the flat list the card does not
 * move, the measurement lands inside the bounds, and this is a no-op.
 *
 * Deliberately measure-then-scroll rather than predicting the new offset from
 * the group tables. The floating In Progress band (`GroupedRoomsList`) renders
 * its rooms a second time, so a room can have two live card refs and a computed
 * position would have to guess which one the reader is looking at. What the
 * view reports is not a guess.
 */
/**
 * The scroll offset that brings a card back inside the usable viewport, or
 * `null` when it is already there.
 *
 * Pure and exported so the one piece of arithmetic here can be checked without
 * a device — the rest of the hook is a measurement and a `scrollTo`, and the
 * interaction that triggers it is tap-gated.
 *
 * The correction is the overshoot and nothing more: a card that has fallen
 * below the fold comes back to the bottom edge, not to the middle or the top.
 */
export function scrollCorrection(
  rect: { y: number; height: number },
  offset: number,
  topBound: number,
  bottomBound: number
): number | null {
  if (rect.y < topBound) return Math.max(0, offset - (topBound - rect.y));
  if (rect.y + rect.height > bottomBound) {
    return Math.max(0, offset + (rect.y + rect.height - bottomBound));
  }
  return null;
}

export function useKeepRoomVisible({
  scrollRef,
  cardRefs,
  scrollOffsetRef,
  topBound,
  bottomBound,
}: UseKeepRoomVisibleOptions) {
  /*
   * Returned unmemoised on purpose. It reads `cardRefs.current`, which the
   * React Compiler cannot reconcile with a manual dependency list, and there is
   * nothing to gain: it is called from a press handler, never passed to a
   * memoised child or used as another hook's dependency.
   */
  return async (roomId: string): Promise<void> => {
    const list = scrollRef.current;
    if (!list) return;

    // One frame for the re-grouped list to commit, one for it to lay out.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

    /*
     * Read the handle *after* the wait, never before it. Re-banding moves the
     * card to a different parent in `GroupedRoomsList`, so it unmounts and
     * remounts: a ref captured before the re-render points at the view the card
     * used to be, which measures as stale coordinates or nothing at all.
     */
    const card = cardRefs.current[roomId];
    if (!card?.measureInWindow) return;

    const rect = await new Promise<{ y: number; height: number } | null>((resolve) => {
      try {
        card.measureInWindow!((_x, y, _width, height) => {
          const bad = [y, height].some((v) => typeof v !== 'number' || Number.isNaN(v));
          // Android reports zeros for a view collapsed out of the native
          // tree; that is unmeasurable, not the origin.
          resolve(bad || height <= 0 ? null : { y, height });
        });
      } catch {
        resolve(null);
      }
    });

    // No rect means the card is gone — filtered out by an active status
    // filter, most often. There is nothing to keep in view.
    if (!rect) return;

    const next = scrollCorrection(rect, scrollOffsetRef.current, topBound, bottomBound);
    if (next == null) return;

    list.scrollTo({ y: next, animated: true });
  };
}

export default useKeepRoomVisible;
