/**
 * The one scroll method the Rooms list hooks need.
 *
 * `useKeepRoomVisible` and `useStatusPopoverAnchor` only ever call
 * `scrollTo({ y })`. The list behind them is a virtualised FlatList or
 * SectionList, neither of which is a ScrollView, so the screen hands the hooks
 * this shape instead of a ScrollView ref.
 */
export type ScrollTarget = {
  scrollTo: (options: { y: number; animated?: boolean }) => void;
};

/** Anything that can give up its underlying ScrollView — FlatList, SectionList. */
type HasScrollResponder = {
  // Typed loosely in RN's own definitions (FlatList says JSX.Element); it is
  // the ScrollView instance at runtime.
  getScrollResponder: () => unknown;
};

/** Adapts a virtualised list to a `ScrollTarget`, or `null` once it unmounts. */
export function scrollTargetOf(list: HasScrollResponder | null): ScrollTarget | null {
  if (!list) return null;
  return {
    scrollTo: ({ y, animated }) => {
      const responder = list.getScrollResponder() as Partial<ScrollTarget> | null | undefined;
      responder?.scrollTo?.({ y, animated });
    },
  };
}

/**
 * Registers a mounted view handle under `id`, and returns its unregister.
 *
 * Every live handle is kept per id, and `map[id]` is the newest still
 * mounted: a room can be drawn twice at once (the floating In Progress band),
 * and unmounting one copy must not drop the other.
 */
export function trackRef(
  map: Record<string, unknown>,
  stacks: Map<string, unknown[]>,
  id: string,
  ref: unknown,
): () => void {
  const stack = stacks.get(id) ?? [];
  stack.push(ref);
  stacks.set(id, stack);
  map[id] = ref;
  return () => {
    const live = (stacks.get(id) ?? []).filter((r) => r !== ref);
    if (live.length) {
      stacks.set(id, live);
      map[id] = live[live.length - 1];
    } else {
      stacks.delete(id);
      delete map[id];
    }
  };
}
