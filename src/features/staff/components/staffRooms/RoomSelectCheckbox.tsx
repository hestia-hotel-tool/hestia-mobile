import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { View } from '@/tw';
import { scaleX } from '@/utils/responsive';
import { STAFF_ROOMS_LAYOUT as L, STAFF_ROOMS_CHROME as C } from './staffRoomsLayout';

interface RoomSelectCheckboxProps {
  checked: boolean;
}

/**
 * The selection mark beside a room card in select mode — Figma 4361:6099:
 * a **square** 29x28 box with square corners and a 1pt #1e1e1e outline,
 * ticked (4361:6101, a thin 14x9 tick in the same ink) once selected.
 *
 * Replaces the 37pt circle of 3831:1059. The outline is constant; only the
 * tick toggles.
 *
 * **Not a `Pressable`.** The whole row is the target, because the box is under
 * the 44pt minimum and the rooms, not the boxes, are what is being selected.
 */
export default function RoomSelectCheckbox({ checked }: RoomSelectCheckboxProps) {
  const s = (n: number) => n * scaleX;
  const B = L.reassign.checkbox;

  return (
    <View
      className="items-center justify-center"
      style={{
        width: s(B.width),
        height: s(B.height),
        borderWidth: B.borderWidth,
        borderColor: C.selectBox,
      }}
      // Decoration: the row that owns it carries the checkbox role and the
      // checked state, so announcing this separately would say it twice.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {checked ? (
        // 4361:6101, exported as-is: 15x11 viewBox, 1pt stroke.
        <Svg width={s(B.tick.width)} height={s(B.tick.height)} viewBox="0 0 15 11" fill="none">
          <Path
            d="M0.363709 5.12128L5.12128 9.87885L14.6364 0.363709"
            stroke={C.selectBox}
            strokeWidth={1.03}
          />
        </Svg>
      ) : null}
    </View>
  );
}
