import React from 'react';
import { ActivityIndicator, Pressable, Text, View, type View as RNView } from 'react-native';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { ROOM_CARD, cardPx } from './roomCardLayout';
import { PORTER_STATUS_UI, type PorterStatus } from '../../utils/porter';

/**
 * The porter's status pill — Figma 3859:1041 (nodes 4470:440 / 4470:489):
 * the label and a chevron, white on the status colour. Same footprint as the
 * room status pill, so the two lists line up.
 */
export function PorterStatusPill({
  status,
  onPress,
  loading = false,
  measureRef,
}: {
  status: PorterStatus;
  onPress?: () => void;
  loading?: boolean;
  /** Measured by the screen to anchor the Change Status menu under the pill. */
  measureRef?: React.Ref<RNView>;
}) {
  const ui = PORTER_STATUS_UI[status];
  return (
    <View ref={measureRef} collapsable={false}>
    <Pressable
      onPress={onPress}
      disabled={loading || !onPress}
      accessibilityRole="button"
      accessibilityLabel={`Porter check: ${ui.label}`}
      accessibilityHint={onPress ? 'Change the porter check for this room' : undefined}
      style={({ pressed }) => ({
        width: ROOM_CARD.pill.width,
        height: ROOM_CARD.pill.height,
        borderRadius: ROOM_CARD.pill.height / 2,
        backgroundColor: ui.color,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: cardPx(10),
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <>
          <Text
            numberOfLines={1}
            style={{
              color: '#ffffff',
              fontFamily: typography.fontFamily.primary,
              fontSize: cardPx(15),
              fontWeight: '400',
            }}
          >
            {ui.label}
          </Text>
          {onPress ? (
            <View style={{ transform: [{ rotate: '-90deg' }] }}>
              <Icon name="action-chevron" size={cardPx(18)} color="#ffffff" />
            </View>
          ) : null}
        </>
      )}
    </Pressable>
    </View>
  );
}

/**
 * "Guest in" (green) / "Guest Out" (red) — Figma 3859:1041, nodes 4480:72 and
 * 4480:91. Where the attendant's card shows its assignee: the porter needs to
 * know whether to knock.
 */
export function GuestPresence({ guestIn }: { guestIn: boolean }) {
  return (
    <View
      // Right-aligned in the header's right column, inset from the card edge
      // as Figma 3859:1041 draws it (the column is laid out for an avatar,
      // which starts on the left).
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        alignSelf: 'stretch',
        gap: cardPx(6),
        paddingRight: cardPx(16),
        marginTop: cardPx(12),
      }}
      accessible
      accessibilityLabel={guestIn ? 'Guest in the room' : 'Guest out'}
    >
      <View
        style={{
          width: cardPx(12),
          height: cardPx(12),
          borderRadius: cardPx(6),
          backgroundColor: guestIn ? '#39d47f' : '#f92424',
        }}
      />
      <Text style={{ fontFamily: typography.fontFamily.primary, fontSize: cardPx(13), color: '#1e1e1e' }}>
        {guestIn ? 'Guest in' : 'Guest Out'}
      </Text>
    </View>
  );
}
