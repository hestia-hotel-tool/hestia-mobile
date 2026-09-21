import React from 'react';
import { View, Text } from '@/tw';
import { Image } from '@/tw/image';

export type AvatarProps = {
  /** Remote or local image. When absent, initials are drawn instead. */
  uri?: string | null;
  /** Used for the initials fallback and the accessibility label. */
  name?: string | null;
  /** Diameter in px. The header uses 51 (Figma node 2702:3465). */
  size?: number;
  className?: string;
};

/** "Stella Kitou" -> "SK"; "Stella" -> "S". */
function initialsFrom(name?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * Circular person avatar with an initials fallback.
 *
 * Person images are not assets — they come from `users.avatar_url` or mock
 * data, per assets/README.md. Nothing here reaches into assets/.
 *
 * **The initials fallback is filled, not tinted.** It used to draw `#5a759d`
 * initials on a `surface-secondary` (`#eef0f6`) disc, which is within a few
 * percent of every surface it sits on — white ticket cards, the `#f9fafc`
 * empty card, the `#e4eefe` home header band. The initials were legible but the
 * avatar itself read as nothing, so a staff member with no photo looked like a
 * gap in the row rather than a person. Inverting it — accent disc, white
 * initials — costs no new token and makes the slot visible on all of them.
 *
 * The fill is reserved for the case it is meant to solve. With a photo the disc
 * is covered anyway, and filling it would flash dark while the image loads;
 * with neither photo nor name there are no initials to carry, and a solid disc
 * with nothing in it reads as a rendering fault. Both keep the neutral disc.
 */
export function Avatar({ uri, name, size = 51, className }: AvatarProps) {
  const initials = initialsFrom(name);
  const label = name ? `${name}'s photo` : 'Profile photo';
  const showsInitials = !uri && initials.length > 0;

  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-full ${
        showsInitials ? 'bg-ink-accent' : 'bg-surface-secondary'
      } ${className ?? ''}`}
      style={{ width: size, height: size }}
      accessibilityLabel={label}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <Text
          className="font-hestia-primary font-bold text-ink-white"
          style={{ fontSize: size * 0.36 }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
