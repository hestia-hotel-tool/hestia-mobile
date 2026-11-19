import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';

/** The form's three urgencies (Figma 589:514); stored as tickets.priority. */
export type TicketUrgency = 'high' | 'medium' | 'low';

export const URGENCY: Record<TicketUrgency, { label: string; flags: number; color: string; tint: string }> = {
  // The row tints are Figma's fills at its 20% layer opacity, flattened.
  high: { label: 'High Priority', flags: 3, color: '#f92424', tint: 'rgba(249, 36, 36, 0.056)' },
  medium: { label: 'Normal', flags: 2, color: '#f0be1b', tint: 'rgba(240, 190, 27, 0.072)' },
  low: { label: 'Low Priority', flags: 1, color: '#9797a3', tint: 'rgba(217, 217, 217, 0.2)' },
};
export const URGENCY_ORDER: TicketUrgency[] = ['high', 'medium', 'low'];

/** The form's urgency as `tickets.priority`. */
export function urgencyToTicketPriority(u: TicketUrgency): 'urgent' | 'medium' | 'notUrgent' {
  return u === 'high' ? 'urgent' : u === 'medium' ? 'medium' : 'notUrgent';
}

const INK = '#5a759d';
const PINK = '#ff4dd8';
const FLAG = { width: 14 * scaleX, height: 19 * scaleX };
const CHECK = { width: 15.5 * scaleX, height: 13.1 * scaleX };

/** One, two or three flags in the urgency's colour, in a slot wide enough for three. */
export function PriorityFlags({ priority }: { priority: TicketUrgency }) {
  const { flags, color } = URGENCY[priority];
  return (
    <View style={styles.flagSlot}>
      {Array.from({ length: flags }, (_, i) => (
        <Icon key={i} name="action-flag-priority" width={FLAG.width} height={FLAG.height} color={color} />
      ))}
    </View>
  );
}

export type UrgencyPickerProps = {
  value: TicketUrgency;
  onChange: (value: TicketUrgency) => void;
  /** Whether the three options start unfolded. */
  initiallyOpen?: boolean;
  /** Placement of the pink box (its margins). */
  style?: StyleProp<ViewStyle>;
};

/**
 * Urgency — the choice in a pink frame; its chevron unfolds the three options
 * (Figma 589:514, and the checklist tickets of 4759:1554). Shared by the
 * ticket form and the checklist's bulk tickets.
 */
export default function UrgencyPicker({ value, onChange, initiallyOpen = false, style }: UrgencyPickerProps) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <>
      <TouchableOpacity
        style={[styles.box, style]}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Urgency: ${URGENCY[value].label}`}
        accessibilityState={{ expanded: open }}
      >
        <PriorityFlags priority={value} />
        <Text style={styles.boxLabel}>{URGENCY[value].label}</Text>
        {/* Down while the options show (as drawn); right while they are folded away. */}
        <View style={open ? undefined : styles.chevronClosed}>
          <Icon name="action-chevron-down-wide" width={21 * scaleX} height={10 * scaleX} color={INK} />
        </View>
      </TouchableOpacity>
      {open ? (
        <View style={styles.options}>
          {URGENCY_ORDER.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.row, { backgroundColor: URGENCY[p].tint }]}
              onPress={() => onChange(p)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityLabel={URGENCY[p].label}
              accessibilityState={{ selected: value === p }}
            >
              <PriorityFlags priority={p} />
              <Text style={styles.rowLabel}>{URGENCY[p].label}</Text>
              {value === p ? <Icon name="action-check" width={CHECK.width} height={CHECK.height} color={INK} /> : null}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 68 * scaleX,
    borderWidth: 1,
    borderColor: PINK,
    borderRadius: 8 * scaleX,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15 * scaleX,
    paddingRight: 27 * scaleX,
  },
  chevronClosed: { transform: [{ rotate: '-90deg' }] },
  boxLabel: {
    flex: 1,
    marginLeft: 22 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  options: { marginTop: 19 * scaleX, gap: 8 * scaleX },
  row: {
    height: 46 * scaleX,
    borderRadius: 5 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14 * scaleX,
    paddingRight: 20 * scaleX,
  },
  rowLabel: {
    flex: 1,
    marginLeft: 22 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
  },
  flagSlot: { width: 54 * scaleX, flexDirection: 'row', gap: 6 * scaleX },
});
