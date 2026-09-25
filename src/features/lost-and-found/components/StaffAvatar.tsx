import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { typography } from '@/theme';

/** Fills for the initial disc — Figma 733:192 draws Zoe Tsakeri's "Z" on #ff4dd8. */
const INITIAL_COLORS = ['#ff4dd8', '#5a759d', '#607aa1', '#f0be1b'];

function initialColor(name: string): string {
  return INITIAL_COLORS[(name.charCodeAt(0) || 0) % INITIAL_COLORS.length];
}

/** A staff photo is either a URL string (`users.avatar_url`) or an `{ uri }` source. */
function uriOf(avatar: unknown): string | undefined {
  if (typeof avatar === 'string') return avatar.trim() || undefined;
  if (avatar && typeof avatar === 'object' && 'uri' in avatar) {
    const { uri } = avatar as { uri?: unknown };
    return typeof uri === 'string' && uri.trim() ? uri : undefined;
  }
  return undefined;
}

export type StaffAvatarProps = {
  name?: string | null;
  avatar?: unknown;
  /** Diameter in real px. */
  size: number;
};

/**
 * A person in the Lost & Found staff pickers — Figma 733:192.
 *
 * Their photo in a circle, or — with no photo, or one that fails to load — a
 * filled circle holding the first letter of their name in white bold.
 *
 * Replaces four inline copies that passed `users.avatar_url` straight to
 * `<Image source>`. A bare string is not an image source in React Native, so
 * every staff photo in the form and the picker rendered as nothing at all.
 */
export function StaffAvatar({ name, avatar, size }: StaffAvatarProps) {
  const uri = uriOf(avatar);
  const [failed, setFailed] = useState(false);
  const label = (name ?? '').trim();
  const circle = { width: size, height: size, borderRadius: size / 2 };

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[styles.photo, circle]}
        resizeMode="cover"
        onError={() => setFailed(true)}
        accessibilityLabel={label ? `${label}'s photo` : 'Profile photo'}
      />
    );
  }

  return (
    <View
      style={[styles.disc, circle, { backgroundColor: initialColor(label || '?') }]}
      accessibilityLabel={label || 'Staff member'}
    >
      <Text style={[styles.initial, { fontSize: size * 0.5 }]}>
        {label ? label.charAt(0).toUpperCase() : '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    // Android does not clip an image to borderRadius without this.
    overflow: 'hidden',
    backgroundColor: '#eef0f6',
  },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
    includeFontPadding: false,
  },
});

export default StaffAvatar;
