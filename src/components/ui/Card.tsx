import React from 'react';
import { View } from '@/tw';

export type CardProps = {
  children: React.ReactNode;
  /** Extra classes, e.g. `mt-lg`. Merged after the defaults so they win. */
  className?: string;
};

/**
 * The standard content card — Figma node 2702:3234.
 *
 * Width is left to the parent rather than pinned to the design's 422px. The
 * design frame is 440 wide with the card inset 9px each side, so a screen with
 * horizontal padding produces the same result and keeps working on every other
 * device width.
 *
 * Height is content-driven for the same reason. The design's 223px falls out of
 * the title row, divider and status row naturally.
 */
export function Card({ children, className }: CardProps) {
  return (
    <View
      className={`w-full rounded-xl border border-border-card bg-surface-card ${className ?? ''}`}
    >
      {children}
    </View>
  );
}

/**
 * The hairline that separates a card's header from its body — Figma node
 * 2702:3249, a 414px rule inside a 422px card, so 4px inset each side.
 */
export function CardDivider({ className }: { className?: string }) {
  return <View className={`mx-[4px] h-px bg-border-medium ${className ?? ''}`} />;
}
