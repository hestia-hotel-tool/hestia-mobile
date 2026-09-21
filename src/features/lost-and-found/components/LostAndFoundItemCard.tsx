/**
 * The item card moved to `itemCard/`, where it is a shell plus nine small
 * components over one layout table — mirroring `rooms/components/roomsList/`,
 * which is the worked example of this same surgery.
 *
 * This file stays as a re-export so its two consumers keep compiling unchanged:
 * `../index.ts` and `rooms/components/roomDetail/LostAndFoundSection.tsx`. That
 * keeps the rebuild reviewable as a visual change to Room Detail rather than a
 * visual change tangled up with an import churn.
 */
export {
  LostAndFoundCard as default,
  type LostAndFoundStatusAnchorLayout,
} from './itemCard/LostAndFoundCard';
