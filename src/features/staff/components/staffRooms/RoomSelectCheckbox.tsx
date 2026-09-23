import React from 'react';

import { View } from '@/tw';
import { Icon } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import { STAFF_ROOMS_LAYOUT as L, STAFF_ROOMS_CHROME as C } from './staffRoomsLayout';

interface RoomSelectCheckboxProps {
  checked: boolean;
}

/**
 * The selection mark beside a room card in reassign mode — node 3831:1059.
 *
 * **The ring is constant; only the tick toggles.** Empty by default, ticked on
 * touch. So what 3831:99 draws — an `ink-accent` ring with an `ink-accent`
 * tick — is the *selected* state, and its eight ticked circles against an
 * "Assign 2 Rooms" button are the frame showing the mark rather than a
 * consistent selection.
 *
 * A first pass had it the other way round, reading the ticked circle as the
 * "tappable" affordance and filling the disc on selection. Filling is the
 * stronger signal, but it is not what this is.
 *
 * **Not a `Pressable`.** The whole row is the target in reassign mode, because
 * a 37pt circle is under the 44pt minimum and because the frame's instruction
 * is "Touch to select rooms" — the rooms, not the little circles.
 */
export default function RoomSelectCheckbox({ checked }: RoomSelectCheckboxProps) {
  const s = (n: number) => n * scaleX;
  const B = L.reassign.checkbox;

  return (
    <View
      className="items-center justify-center"
      style={{
        width: s(B.size),
        height: s(B.size),
        borderRadius: s(B.size / 2),
        borderWidth: B.borderWidth,
        borderColor: C.selectRing,
      }}
      // Decoration: the row that owns it carries the button role and the
      // checked state, so announcing this separately would say it twice.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {checked ? <Icon name="action-check" size={s(B.glyph)} color={C.selectRing} /> : null}
    </View>
  );
}
