import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View, Text } from '@/tw';
import { typography } from '@/theme';
import { VIP_NEUTRAL, vipTierFor, vipTierLabel } from '@/domain/vip';
import { useVipTiers } from '@/store/vipTiers';

export type VipCodeProps = {
  /** The guest's stored code. Anything that is not 1–10 draws nothing (a regular guest). */
  code: string | number | null | undefined;
  /** Font size of the code; the pill scales around it. */
  fontSize?: number;
  /** The design's weight where the code sits: light beside a name (2961:163), bold on the room card. */
  weight?: 'light' | 'bold';
  style?: StyleProp<ViewStyle>;
};

/**
 * A guest's VIP level ("V2") beside their name, on the grey VIP disc colour — the inline
 * counterpart of the room card's VIP disc (GuestRow), for lists that print the
 * code next to a name (room picker, Lost & Found).
 *
 * The level keeps the design's type (Helvetica 12, #334866, light beside a
 * name) on a small pill in the room card disc's grey (VIP_NEUTRAL).
 */
export function VipCode({ code, fontSize = 12, weight = 'light', style }: VipCodeProps) {
  const tiers = useVipTiers();
  const tier = vipTierFor(code, tiers);
  if (!tier || code == null) return null;
  return (
    <View
      className="items-center justify-center rounded-full"
      style={[
        {
          minWidth: fontSize * 1.9,
          paddingHorizontal: fontSize * 0.45,
          paddingVertical: fontSize * 0.12,
          backgroundColor: VIP_NEUTRAL.disc,
        },
        style,
      ]}
      accessible
      accessibilityLabel={`VIP ${vipTierLabel(tier.tier)}, ${tier.name} (code ${String(code).trim()})`}
    >
      <Text
        style={{
          fontFamily: typography.fontFamily.primary,
          fontSize,
          fontWeight: weight === 'bold' ? '700' : '300',
          color: VIP_NEUTRAL.ink,
        }}
      >
        {/* The level ("V2"), like the room card's disc — not the hotel's code. */}
        {vipTierLabel(tier.tier)}
      </Text>
    </View>
  );
}

export default VipCode;
