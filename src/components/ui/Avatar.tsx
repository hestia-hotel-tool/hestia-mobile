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
 */
export function Avatar({ uri, name, size = 51, className }: AvatarProps) {
  const initials = initialsFrom(name);
  const label = name ? `${name}'s photo` : 'Profile photo';

  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-full bg-surface-secondary ${className ?? ''}`}
      style={{ width: size, height: size }}
      accessibilityLabel={label}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <Text
          className="font-hestia-primary font-bold text-ink-accent"
          style={{ fontSize: size * 0.36 }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
