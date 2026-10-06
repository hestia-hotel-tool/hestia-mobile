import React from 'react';
import { View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';

export type LostAndFoundStatusKey = 'stored' | 'shipped' | 'discarded';

/**
 * The status marks Lost & Found was designed with — the same icon on the same
 * colour as the card's status pill and its status popover: a cube on yellow
 * (Stored), a plane on green (Shipped), a bin on grey (Discarded).
 */
export const LOST_AND_FOUND_STATUS_MARK: Record<
  LostAndFoundStatusKey,
  { icon: IconName; tone: string; glyph: number }
> = {
  stored: { icon: 'lf-stored', tone: '#f0be1b', glyph: 0.56 },
  shipped: { icon: 'lf-shipped', tone: '#39d47f', glyph: 0.5 },
  discarded: { icon: 'lf-discarded', tone: '#57595d', glyph: 0.54 },
};

/**
 * A status as a disc of its colour holding its white icon. Used wherever the
 * Register sheet shows a status (the dropdown, the field, the summary), which
 * used to be a bare coloured dot — with Discarded the same yellow as Stored.
 */
export function LostAndFoundStatusDisc({ status, size }: { status: LostAndFoundStatusKey; size: number }) {
  const mark = LOST_AND_FOUND_STATUS_MARK[status] ?? LOST_AND_FOUND_STATUS_MARK.stored;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: mark.tone,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={mark.icon} size={size * mark.glyph} color="#ffffff" />
    </View>
  );
}

export default LostAndFoundStatusDisc;
