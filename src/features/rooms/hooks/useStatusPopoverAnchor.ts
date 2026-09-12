import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';
import type { RoomCardData } from '../types/allRooms.types';

/** A measured window rect. */
export type Rect = { x: number; y: number; width: number; height: number };

/** Anything with `measureInWindow` — a native view handle. */
type Measurable = { measureInWindow?: (cb: (...args: number[]) => void) => void } | null | undefined;

export type UseStatusPopoverAnchorOptions = {
  /** The list the cards live in, scrolled to make room for the sheet. */
  scrollRef: React.RefObject<ScrollView | null>;
  /** Card wrappers by room id. The blur seam is the selected card's bottom. */
  cardRefs: React.MutableRefObject<Record<string, Measurable>>;
  /** Status pill wrappers by room id. The sheet's tail points at this. */
  pillRefs: React.MutableRefObject<Record<string, Measurable>>;
  /** Live scroll offset, so the position can be restored on dismiss. */
  scrollOffsetRef: React.MutableRefObject<number>;
  /** Real px per design px. */
  scaleX: number;
  screenHeight: number;
  topInset: number;
  bottomInset: number;
  /** The sheet's height and its gap from the pill, both in design px. */
  sheetHeight: number;
  spacing: number;
  /**
   * How close the lifted card may come to the top of the screen, in real px.
   * The card is scrolled over the search field on purpose; this keeps it clear
   * of the profile band and the notch above it.
   */
  liftFloor?: number;
};

export type StatusPopoverAnchor = {
  /** The room the sheet belongs to, once it is open. */
  room: RoomCardData | null;
  /** The pill the tail points at, in window coordinates. */
  anchor: Rect | null;
  /** Window y where the blur starts — the selected card's bottom edge. */
  blurTop: number | null;
  isOpen: boolean;
  /**
   * Opening *or* open.
   *
   * Distinct from `isOpen` because the lift happens before the sheet appears:
   * callers use this to unclip the list and drop chrome so the measure pass
   * reads the layout the sheet will actually be placed against.
   */
  overlayActive: boolean;
  open: (room: RoomCardData) => void;
  close: () => void;
  /**
   * Patch the open room in place, for a change made from inside the sheet that
   * the sheet itself keeps displaying — flagging, in practice.
   */
  patchRoom: (update: (room: RoomCardData) => RoomCardData) => void;
};

/**
 * Places the room status sheet against the pill that opened it.
 *
 * The sequence is the whole point, and it is why this is a hook rather than a
 * handler: opening the sheet changes the layout it has to be measured against.
 * Hiding the screen's title shortens the header and reflows the list, so a
 * measurement taken in the press handler describes a position the card has
 * already left. Each step therefore waits for the last:
 *
 *   press -> stage the room -> chrome drops, list reflows -> measure the pill
 *         -> scroll if the sheet would overflow -> re-measure -> open
 *
 * Lives here so every Rooms variant — supervisor, attendant, the flat list —
 * gets the same behaviour from the same code, whatever card or header it draws.
 */
export function useStatusPopoverAnchor({
  scrollRef,
  cardRefs,
  pillRefs,
  scrollOffsetRef,
  scaleX,
  screenHeight,
  topInset,
  bottomInset,
  sheetHeight,
  spacing,
  liftFloor,
}: UseStatusPopoverAnchorOptions): StatusPopoverAnchor {
  const [pendingRoom, setPendingRoom] = useState<RoomCardData | null>(null);
  const [room, setRoom] = useState<RoomCardData | null>(null);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const [cardRect, setCardRect] = useState<Rect | null>(null);
  const restoreScrollY = useRef(0);

  const open = useCallback((next: RoomCardData) => setPendingRoom(next), []);

  const close = useCallback(() => {
    setRoom(null);
    setAnchor(null);
    setCardRect(null);
    setPendingRoom(null);
    const restore = restoreScrollY.current;
    if (restore > 0 && scrollRef.current) {
      // Let the sheet finish dismissing before the list moves under it.
      setTimeout(() => scrollRef.current?.scrollTo({ y: restore, animated: true }), 100);
    }
    restoreScrollY.current = 0;
  }, [scrollRef]);

  useEffect(() => {
    if (!pendingRoom) return;
    const target = pendingRoom;
    const savedScrollY = scrollOffsetRef.current;
    let cancelled = false;

    const measure = (ref: Measurable): Promise<Rect | null> =>
      new Promise((resolve) => {
        if (!ref?.measureInWindow) {
          resolve(null);
          return;
        }
        try {
          ref.measureInWindow((x, y, width, height) => {
            const bad = [x, y, width, height].some(
              (v) => typeof v !== 'number' || Number.isNaN(v)
            );
            // Android reports zeros for a view collapsed out of the native
            // tree; that is unmeasurable, not the origin.
            resolve(bad || height <= 0 ? null : { x, y, width, height });
          });
        } catch {
          resolve(null);
        }
      });

    /** One frame for the chrome to unmount, one for the list to settle. */
    const afterLayout = () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );

    const commit = (pill: Rect | null, card: Rect | null) => {
      if (cancelled) return;
      setAnchor(pill);
      setCardRect(card);
      setRoom(target);
      setPendingRoom(null);
    };

    const run = async () => {
      await afterLayout();
      if (cancelled) return;

      const pill = await measure(pillRefs.current[target.id]);
      if (cancelled) return;
      if (!pill) {
        // No anchor: the sheet falls back to sitting flush under the header.
        restoreScrollY.current = 0;
        commit(null, null);
        return;
      }

      const gap = spacing * scaleX;
      const sheet = sheetHeight * scaleX;
      // The same bound the popover clamps to, so the prediction here and the
      // placement there cannot disagree.
      const maxSheetBottom = screenHeight - bottomInset - 12 * scaleX;
      const overflow = pill.y + pill.height + gap + sheet - maxSheetBottom;

      const settle = async (movedBy: number) => {
        const finalPill = movedBy > 0 ? (await measure(pillRefs.current[target.id])) ?? pill : pill;
        if (cancelled) return;
        const finalCard = await measure(cardRefs.current[target.id]);
        if (cancelled) return;
        commit(finalPill, finalCard);
      };

      if (overflow <= 0 || !scrollRef.current) {
        restoreScrollY.current = 0;
        await settle(0);
        return;
      }

      const card = await measure(cardRefs.current[target.id]);
      if (cancelled) return;
      const cardTop = card ? card.y : pill.y;
      const floor = liftFloor ?? topInset + 96;
      const moveUp = Math.min(overflow, Math.max(0, cardTop - floor));

      if (moveUp <= 0) {
        restoreScrollY.current = 0;
        await settle(0);
        return;
      }

      restoreScrollY.current = savedScrollY;
      scrollRef.current.scrollTo({ y: Math.max(0, savedScrollY + moveUp), animated: true });
      // A plain ScrollView has no scroll-end callback, so wait the animation out.
      await new Promise<void>((resolve) => setTimeout(resolve, 350));
      if (cancelled) return;
      await settle(moveUp);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    pendingRoom,
    scaleX,
    screenHeight,
    topInset,
    bottomInset,
    sheetHeight,
    spacing,
    liftFloor,
    cardRefs,
    pillRefs,
    scrollRef,
    scrollOffsetRef,
  ]);

  const patchRoom = useCallback(
    (update: (current: RoomCardData) => RoomCardData) =>
      setRoom((current) => (current ? update(current) : current)),
    []
  );

  return {
    room,
    anchor,
    blurTop: cardRect ? cardRect.y + cardRect.height : null,
    isOpen: room != null,
    overlayActive: pendingRoom != null || room != null,
    open,
    close,
    patchRoom,
  };
}

export default useStatusPopoverAnchor;
