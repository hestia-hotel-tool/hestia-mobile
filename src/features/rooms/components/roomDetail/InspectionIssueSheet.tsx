import React, { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeModal } from '@/components/ui/SafeModal';
import { SafeKeyboardAvoidingView } from '@/components/ui/SafeKeyboardAvoidingView';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';

export type InspectionIssueSheetProps = {
  /** The item being reported; null hides the sheet. */
  itemName: string | null;
  /** The note already saved, when editing an issue. */
  initialNote?: string | null;
  /** Editing an existing issue: offers "Remove issue". */
  isExisting?: boolean;
  onSave: (note: string) => void;
  onRemove?: () => void;
  onCancel: () => void;
};

const MAX_NOTE = 500;

/**
 * What is wrong — asked when a checklist item is marked Issue. The note is
 * what the ticket says if one is raised, so it is required.
 */
export default function InspectionIssueSheet({
  itemName,
  initialNote,
  isExisting = false,
  onSave,
  onRemove,
  onCancel,
}: InspectionIssueSheetProps) {
  const [note, setNote] = useState('');
  useEffect(() => {
    if (itemName) setNote(initialNote ?? '');
  }, [itemName, initialNote]);

  const trimmed = note.trim();

  return (
    <SafeModal visible={!!itemName} transparent animationType="slide" onRequestClose={onCancel}>
      <SafeKeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <Text style={styles.title}>Issue: {itemName}</Text>
          <Text style={styles.subtitle}>What is wrong? This becomes the ticket if you raise one.</Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Safe battery is dead"
            placeholderTextColor="#a0a0a0"
            multiline
            maxLength={MAX_NOTE}
            autoFocus
            accessibilityLabel="Issue note"
          />
          <View style={styles.actions}>
            {isExisting && onRemove ? (
              <TouchableOpacity onPress={onRemove} style={styles.textButton} accessibilityRole="button">
                <Text style={styles.remove}>Remove issue</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.spacer} />
            <TouchableOpacity onPress={onCancel} style={styles.textButton} accessibilityRole="button">
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => trimmed && onSave(trimmed)}
              disabled={!trimmed}
              style={[styles.save, !trimmed && styles.saveDisabled]}
              accessibilityRole="button"
              accessibilityState={{ disabled: !trimmed }}
            >
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeKeyboardAvoidingView>
    </SafeModal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16 * scaleX,
    borderTopRightRadius: 16 * scaleX,
    paddingHorizontal: 24 * scaleX,
    paddingTop: 22 * scaleX,
    paddingBottom: 34 * scaleX,
  },
  title: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  subtitle: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#334866',
    marginTop: 6 * scaleX,
  },
  input: {
    minHeight: 96 * scaleX,
    marginTop: 14 * scaleX,
    borderWidth: 1,
    borderColor: '#e3e8f0',
    borderRadius: 8 * scaleX,
    padding: 12 * scaleX,
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#1e1e1e',
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 16 * scaleX },
  spacer: { flex: 1 },
  textButton: { paddingVertical: 10 * scaleX, paddingHorizontal: 12 * scaleX },
  remove: { fontSize: 15 * scaleX, fontFamily: typography.fontFamily.primary, color: '#f92424', fontWeight: '700' },
  cancel: { fontSize: 15 * scaleX, fontFamily: typography.fontFamily.primary, color: '#5a759d' },
  save: {
    backgroundColor: '#5a759d',
    borderRadius: 8 * scaleX,
    paddingVertical: 10 * scaleX,
    paddingHorizontal: 22 * scaleX,
    marginLeft: 4 * scaleX,
  },
  saveDisabled: { opacity: 0.4 },
  saveText: { fontSize: 15 * scaleX, fontFamily: typography.fontFamily.primary, color: '#ffffff', fontWeight: '700' },
});
