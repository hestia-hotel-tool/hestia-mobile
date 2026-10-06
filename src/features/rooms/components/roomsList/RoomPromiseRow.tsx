import React from 'react';
import { View, Text } from '@/tw';

/** The accent pink, for a promise made to the guest. */
const PROMISE_COLOR = '#ff46a3';

/**
 * "Promise time: 14:30" — a row of the card's own under the header, right
 * aligned, rather than a line squeezed into the attendant block beside the
 * room number. Renders nothing when there is no promise.
 */
export function RoomPromiseRow({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <View className="flex-row justify-end px-xl pt-sm">
      <Text
        className="font-hestia-primary text-hestia-sm font-bold"
        style={{ color: PROMISE_COLOR }}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

export default RoomPromiseRow;
