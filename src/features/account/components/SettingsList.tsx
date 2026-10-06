import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { typography } from '@/theme';

export const SETTINGS_COLORS = {
  screen: '#f4f6fa',
  header: '#e4eefe',
  title: '#5a759d',
  ink: '#1e1e1e',
  muted: '#6b7a90',
  card: '#ffffff',
  divider: 'rgba(90,117,157,0.16)',
  danger: '#e5484d',
} as const;

const C = SETTINGS_COLORS;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** A titled group of rows on a white card, with an optional note under it. */
export function SettingsSection({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
}) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.card}>
        {rows.map((row, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <View style={styles.divider} /> : null}
            {row}
          </React.Fragment>
        ))}
      </View>
      {footer ? <Text style={styles.sectionFooter}>{footer}</Text> : null}
    </View>
  );
}

/**
 * One row: a tinted icon tile, the label, an optional value on the right, and
 * a chevron when it leads somewhere. `destructive` draws it in red (Sign Out).
 */
export function SettingsRow({
  icon,
  tint = C.title,
  label,
  value,
  detail,
  onPress,
  chevron = !!onPress,
  destructive,
  busy,
  accessibilityHint,
}: {
  icon?: IoniconName;
  tint?: string;
  label: string;
  value?: string;
  /** A second line under the label. */
  detail?: string;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  busy?: boolean;
  accessibilityHint?: string;
}) {
  const color = destructive ? C.danger : tint;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || busy}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.rowPressed : null]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={accessibilityHint}
    >
      {icon ? (
        <View style={[styles.iconTile, { backgroundColor: `${color}1f` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text style={[styles.label, destructive && { color: C.danger }]} numberOfLines={1}>
          {label}
        </Text>
        {detail ? (
          <Text style={styles.detail} numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
      </View>
      {busy ? <ActivityIndicator color={C.title} /> : null}
      {!busy && value ? (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {!busy && chevron ? <Ionicons name="chevron-forward" size={18} color="#b4bfd0" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  sectionTitle: {
    marginBottom: 8,
    marginLeft: 6,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: C.muted,
  },
  sectionFooter: {
    marginTop: 8,
    marginHorizontal: 6,
    fontFamily: typography.fontFamily.primary,
    fontSize: 12,
    lineHeight: 17,
    color: C.muted,
  },
  card: {
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.divider,
    overflow: 'hidden',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.divider, marginLeft: 60 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  rowPressed: { backgroundColor: '#f1f4f9' },
  iconTile: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  label: { fontFamily: typography.fontFamily.primary, fontSize: 16, color: C.ink },
  detail: { marginTop: 2, fontFamily: typography.fontFamily.primary, fontSize: 12, color: C.muted },
  value: { maxWidth: '62%', fontFamily: typography.fontFamily.primary, fontSize: 15, color: C.muted },
});
