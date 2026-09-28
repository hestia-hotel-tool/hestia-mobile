import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Avatar } from './Avatar';
import { typography } from '@/theme';

const C = {
  title: '#5a759d',
  ink: '#1e1e1e',
  muted: '#6b7a90',
  card: '#f9fafc',
  cardBorder: 'rgba(90,117,157,0.18)',
} as const;

/**
 * The rounded card of a record's detail screen (a lost & found item, a
 * ticket), holding `DetailRow`s / `DetailPersonRow`s or free text.
 */
export function DetailCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** An uppercase label over a value, with an optional link on the right. */
export function DetailRow({
  label,
  value,
  action,
  last,
}: {
  label: string;
  value: string;
  action?: { label: string; onPress: () => void };
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValueWrap}>
        <Text style={styles.rowValue}>{value}</Text>
        {action ? (
          <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="link">
            <Text style={styles.rowAction}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** A label over a person: avatar, name and an optional second line. */
export function DetailPersonRow({
  label,
  name,
  avatarUrl,
  detail,
  last,
}: {
  label: string;
  name: string;
  avatarUrl?: string;
  detail?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.person}>
        <Avatar uri={avatarUrl} name={name} size={28} />
        <View style={styles.personText}>
          <Text style={styles.rowValue} numberOfLines={1}>
            {name}
          </Text>
          {detail ? <Text style={styles.personDetail}>{detail}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    backgroundColor: C.card,
    paddingHorizontal: 16,
  },
  row: { paddingVertical: 13, gap: 4 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(90,117,157,0.25)' },
  rowLabel: { fontFamily: typography.fontFamily.primary, fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  rowValueWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowValue: { flexShrink: 1, fontFamily: typography.fontFamily.primary, fontSize: 16, color: C.ink },
  rowAction: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 14, color: C.title },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  personText: { flexShrink: 1 },
  personDetail: { marginTop: 1, fontFamily: typography.fontFamily.primary, fontSize: 12, color: C.muted },
});
