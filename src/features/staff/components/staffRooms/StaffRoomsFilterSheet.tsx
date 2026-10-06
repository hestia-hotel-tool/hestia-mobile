import React, { useState } from 'react';
import { Modal, Pressable as RNPressable, StyleSheet } from 'react-native';

import { View, Text, Pressable } from '@/tw';
import { Icon } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';

export type RoomFilterKey = 'Dirty' | 'InProgress' | 'Cleaned' | 'Inspected' | 'Priority';

const ROWS: { key: RoomFilterKey; label: string; color: string }[] = [
  { key: 'Dirty', label: 'Dirty', color: '#f92424' },
  { key: 'InProgress', label: 'In Progress', color: '#f0be1b' },
  { key: 'Cleaned', label: 'Cleaned', color: '#4a91fc' },
  { key: 'Inspected', label: 'Inspected', color: '#41d541' },
  { key: 'Priority', label: 'Priority', color: '#f92424' },
];

export const ALL_ROOM_FILTERS: ReadonlySet<RoomFilterKey> = new Set(ROWS.map((r) => r.key));

interface StaffRoomsFilterSheetProps {
  visible: boolean;
  /** What is on now; the sheet edits a copy and hands it back on Continue. */
  selected: ReadonlySet<RoomFilterKey>;
  counts: Record<RoomFilterKey, number>;
  onApply: (next: ReadonlySet<RoomFilterKey>) => void;
  onClose: () => void;
}

/**
 * "Rooms Filter" — Figma 3831:99: the housekeeping statuses as ticks, each
 * with its colour and a count, then Continue and Cancel.
 */
export default function StaffRoomsFilterSheet({ visible, selected, counts, onApply, onClose }: StaffRoomsFilterSheetProps) {
  const s = (n: number) => n * scaleX;
  const [draft, setDraft] = useState<ReadonlySet<RoomFilterKey>>(selected);

  const toggle = (key: RoomFilterKey) =>
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    // Each opening starts from what is applied, not from the last unsaved edit.
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onShow={() => setDraft(selected)}>
      <RNPressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.6)' }]} onPress={onClose} />
      <View
        className="bg-surface-primary"
        style={{
          position: 'absolute',
          left: s(20),
          right: s(20),
          top: '22%',
          borderRadius: s(20),
          borderWidth: 1,
          borderColor: '#e3e3e3',
          paddingHorizontal: s(28),
          paddingTop: s(26),
          paddingBottom: s(20),
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 6,
        }}
      >
        <Text style={{ fontSize: s(18), fontWeight: '700', fontFamily: typography.fontFamily.primary, color: '#1e1e1e' }}>
          Rooms Filter
        </Text>
        <Text
          style={{ marginTop: s(26), fontSize: s(14), fontWeight: '700', fontFamily: typography.fontFamily.primary, color: '#1e1e1e' }}
        >
          Housekeeping Status
        </Text>

        <View style={{ marginTop: s(10) }}>
          {ROWS.map((row) => {
            const on = draft.has(row.key);
            return (
              <Pressable
                key={row.key}
                onPress={() => toggle(row.key)}
                className="flex-row items-center"
                style={{ height: s(44), gap: s(14) }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${row.label}, ${counts[row.key]} rooms`}
              >
                <View
                  className="items-center justify-center"
                  style={{ width: s(22), height: s(22), borderWidth: 1.5, borderColor: '#5a759d' }}
                >
                  {on ? <Icon name="action-check" size={s(10)} color="#5a759d" /> : null}
                </View>
                {row.key === 'Priority' ? (
                  <Icon name="action-flag" size={s(16)} color={row.color} />
                ) : (
                  <View style={{ width: s(16), height: s(16), borderRadius: s(8), backgroundColor: row.color }} />
                )}
                <Text style={{ flex: 1, fontSize: s(15), fontFamily: typography.fontFamily.primary, color: '#1e1e1e' }}>
                  {row.label}
                </Text>
                <Text style={{ fontSize: s(10), fontFamily: typography.fontFamily.primary, color: '#9aa4b2' }}>
                  {counts[row.key]} {counts[row.key] === 1 ? 'Room' : 'Rooms'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => onApply(draft)}
          className="items-center justify-center"
          style={{ marginTop: s(28), height: s(56), backgroundColor: '#5a759d' }}
          accessibilityRole="button"
        >
          <Text style={{ fontSize: s(16), fontWeight: '700', fontFamily: typography.fontFamily.primary, color: '#ffffff' }}>
            Continue
          </Text>
        </Pressable>
        <Pressable onPress={onClose} hitSlop={10} className="items-center" style={{ marginTop: s(14) }} accessibilityRole="button">
          <Text style={{ fontSize: s(14), fontFamily: typography.fontFamily.primary, color: '#1e1e1e' }}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
