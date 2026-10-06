import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeModal as Modal } from '@/components/ui/SafeModal';
import { TimeWheelPicker } from '@/components/ui/TimeWheelPicker';
import { useToast } from '@/contexts/ToastContext';
import { typography } from '@/theme';
import { formatMinutesSpan } from '@/utils/formatting';
import { deleteBreakRule, saveBreakRule, type BreakRule, type BreakRuleInput } from '../services/breaks';
import { SETTINGS_COLORS as C } from './SettingsList';

const NAMES = ['Lunch', 'Coffee break', 'Dinner', 'Rest'];
const DURATIONS = [10, 15, 20, 30, 45, 60];

type Props = {
  visible: boolean;
  shiftId: string;
  shiftName: string;
  /** Default window when "Between" is first chosen: the shift's own hours. */
  shiftStart: string;
  shiftEnd: string;
  /** The break being edited; absent to add one. */
  rule?: BreakRule | null;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * Add or edit one of a shift's breaks: name (a common one, or typed),
 * length, and when it may be taken — any time, or between two times.
 * Editing also offers Delete.
 */
export function BreakRuleSheet(props: Props) {
  // Remount per opening so the form starts from the break being edited.
  if (!props.visible) return null;
  return <BreakRuleForm key={props.rule?.id ?? 'new'} {...props} />;
}

function BreakRuleForm({ visible, shiftId, shiftName, shiftStart, shiftEnd, rule, onClose, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [name, setName] = useState(rule?.name ?? 'Lunch');
  const [minutes, setMinutes] = useState(rule?.minutes ?? 30);
  const [windowed, setWindowed] = useState(!!rule?.windowStart);
  const [start, setStart] = useState(rule?.windowStart ?? shiftStart);
  const [end, setEnd] = useState(rule?.windowEnd ?? shiftEnd);
  const [editingTime, setEditingTime] = useState<'start' | 'end' | null>(null);
  const [saving, setSaving] = useState(false);

  const input: BreakRuleInput = {
    name,
    minutes,
    windowStart: windowed ? start : null,
    windowEnd: windowed ? end : null,
  };
  const problem = !name.trim()
    ? 'Give the break a name.'
    : windowed && start === end
      ? 'The window cannot start and end at the same time.'
      : null;

  const save = async () => {
    if (problem) return;
    setSaving(true);
    try {
      await saveBreakRule(shiftId, input, rule?.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show(`${name.trim()} saved for the ${shiftName} shift.`, { type: 'success' });
      onSaved();
    } catch (e) {
      setSaving(false);
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Break not saved' });
    }
  };

  const remove = () => {
    if (!rule) return;
    Alert.alert(`Delete ${rule.name}?`, 'Staff on this shift will no longer see it. Breaks already taken stay on record.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBreakRule(rule.id);
            toast.show(`${rule.name} removed.`, { type: 'success' });
            onSaved();
          } catch (e) {
            toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Break not deleted' });
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onClose} disabled={saving} hitSlop={10}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>{rule ? 'Edit break' : 'Add break'}</Text>
          {saving ? (
            <ActivityIndicator color={C.title} />
          ) : (
            <Pressable onPress={save} disabled={!!problem} hitSlop={10}>
              <Text style={[styles.save, !!problem && { opacity: 0.35 }]}>Save</Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Name</Text>
          <View style={styles.chips}>
            {NAMES.map((n) => (
              <Chip key={n} label={n} selected={name === n} onPress={() => setName(n)} />
            ))}
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Or type a name"
            placeholderTextColor="#9ca3af"
            style={styles.input}
            maxLength={40}
          />

          <Text style={[styles.label, styles.gap]}>Length</Text>
          <View style={styles.chips}>
            {DURATIONS.map((d) => (
              <Chip key={d} label={formatMinutesSpan(d * 60_000)} selected={minutes === d} onPress={() => setMinutes(d)} />
            ))}
          </View>

          <Text style={[styles.label, styles.gap]}>When</Text>
          <View style={styles.segment}>
            <Segment label="Any time" selected={!windowed} onPress={() => setWindowed(false)} />
            <Segment label="Between" selected={windowed} onPress={() => setWindowed(true)} />
          </View>
          {windowed ? (
            <>
              <View style={styles.times}>
                <TimeButton label="From" value={start} active={editingTime === 'start'} onPress={() => setEditingTime(editingTime === 'start' ? null : 'start')} />
                <TimeButton label="Until" value={end} active={editingTime === 'end'} onPress={() => setEditingTime(editingTime === 'end' ? null : 'end')} />
              </View>
              {editingTime ? (
                <TimeWheelPicker
                  key={editingTime}
                  value={editingTime === 'start' ? start : end}
                  onChange={editingTime === 'start' ? setStart : setEnd}
                />
              ) : null}
            </>
          ) : null}

          <Text style={styles.summary}>
            {problem ??
              `${name.trim() || 'Break'} · ${formatMinutesSpan(minutes * 60_000)} · ${
                windowed ? `between ${start} and ${end}` : `any time during the ${shiftName} shift`
              }`}
          </Text>

          {rule ? (
            <Pressable onPress={remove} style={({ pressed }) => [styles.delete, pressed && { opacity: 0.8 }]} accessibilityRole="button">
              <Text style={styles.deleteText}>Delete break</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function Segment({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segItem, selected && styles.segItemSelected]} accessibilityRole="radio" accessibilityState={{ selected }}>
      <Text style={[styles.segText, selected && styles.segTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function TimeButton({ label, value, active, onPress }: { label: string; value: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.timeButton, active && styles.timeButtonActive]} accessibilityRole="button" accessibilityLabel={`${label} ${value}`}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={styles.timeValue}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  title: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 17, color: C.ink },
  cancel: { fontFamily: typography.fontFamily.primary, fontSize: 16, color: C.title },
  save: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 16, color: C.title },
  content: { paddingHorizontal: 20 },
  label: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 14, color: C.ink },
  gap: { marginTop: 24 },
  chips: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(90,117,157,0.25)',
    backgroundColor: '#f9fafc',
  },
  chipSelected: { borderColor: C.title, backgroundColor: C.title },
  chipText: { fontFamily: typography.fontFamily.primary, fontSize: 14, color: C.title },
  chipTextSelected: { fontWeight: '700', color: '#ffffff' },
  input: {
    marginTop: 10,
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(90,117,157,0.25)',
    backgroundColor: '#f9fafc',
    fontFamily: typography.fontFamily.primary,
    fontSize: 16,
    color: C.ink,
  },
  segment: { marginTop: 10, flexDirection: 'row', padding: 4, gap: 4, borderRadius: 12, backgroundColor: '#f1f4f9' },
  segItem: { flex: 1, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segItemSelected: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  segText: { fontFamily: typography.fontFamily.primary, fontWeight: '600', fontSize: 14, color: C.muted },
  segTextSelected: { color: C.ink, fontWeight: '700' },
  times: { marginTop: 12, flexDirection: 'row', gap: 10 },
  timeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(90,117,157,0.25)',
    backgroundColor: '#f9fafc',
  },
  timeButtonActive: { borderColor: C.title, backgroundColor: C.header },
  timeLabel: { fontFamily: typography.fontFamily.primary, fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  timeValue: { marginTop: 2, fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 22, color: C.ink },
  summary: { marginTop: 24, fontFamily: typography.fontFamily.primary, fontSize: 14, lineHeight: 20, color: C.muted, textAlign: 'center' },
  delete: {
    marginTop: 28,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.35)',
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 16, color: C.danger },
});

export default BreakRuleSheet;
