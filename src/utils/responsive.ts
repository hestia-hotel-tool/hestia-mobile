/**
 * @deprecated Use `useDesignScale()` from `@/ui`.
 *
 * These values snapshot `Dimensions.get('window')` at module load, so they go
 * stale on rotation, split view and folding — they can never be correct on a
 * device that resizes.
 *
 * Kept alive only for the five components that build `StyleSheet.create` at
 * module scope and therefore cannot call a hook: `MoreMenuItem`,
 * `CategoryCard`, `PriorityBadge`, `StatusIndicator`, `GuestInfoDisplay`.
 * Moving one of those to the hook means moving its `StyleSheet.create` into
 * render. Delete this file when the last one is done.
 *
 * The `[0.8, 1.2]` clamp is deliberately left at its legacy value rather than
 * converged on `SCALE_CLAMP` (`[0.85, 1.15]`), so that removing the old helpers
 * changes no pixels. `useDesignScale().normalizedScaleX` matches this exactly;
 * `useDesignScale().scale` is the new clamp. Each component converges when it
 * is refactored.
 */
import { Dimensions } from 'react-native';
import { DESIGN_FRAME } from '@/theme';

/** @deprecated Use `useDesignScale().ratio`. */
export const scaleX = Dimensions.get('window').width / DESIGN_FRAME.width;

/** @deprecated Use `useDesignScale().scale`. */
export const normalizedScaleX: number = Math.max(0.8, Math.min(1.2, scaleX));
