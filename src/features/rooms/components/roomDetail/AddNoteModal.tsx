import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { typography } from '@/theme';
import { scaleX } from '../../constants/roomDetailStyles';

interface AddNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (noteText: string) => void;
  roomNumber?: string;
}

export default function AddNoteModal({
  visible,
  onClose,
  onSave,
  roomNumber,
}: AddNoteModalProps) {
  const [noteText, setNoteText] = useState('');

  const handleSave = () => {
    if (noteText.trim()) {
      onSave(noteText.trim());
      setNoteText('');
      onClose();
    }
  };

  const handleClose = () => {
    setNoteText('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.overlay} />
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleClose}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.backButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Add Note</Text>
              <TouchableOpacity
                style={[styles.saveButton, !noteText.trim() && styles.saveButtonDisabled]}
                onPress={handleSave}
                activeOpacity={0.7}
                disabled={!noteText.trim()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.saveButtonText, !noteText.trim() && styles.saveButtonTextDisabled]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>

            {/* Room Number */}
            {roomNumber && (
              <Text style={styles.roomNumber}>Room {roomNumber}</Text>
            )}

            {/* Note Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter note..."
                placeholderTextColor="#999999"
                value={noteText}
                onChangeText={setNoteText}
                multiline
                textAlignVertical="top"
                autoFocus
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlay: {
    position: 'absolute',
    top: '20%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20 * scaleX,
    borderTopRightRadius: 20 * scaleX,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100 * scaleX,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20 * scaleX,
    paddingTop: 20 * scaleX,
    paddingBottom: 16 * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    paddingVertical: 8 * scaleX,
    paddingHorizontal: 12 * scaleX,
  },
  backButtonText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: '#5a759d',
  },
  title: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#1e1e1e',
  },
  saveButton: {
    paddingVertical: 8 * scaleX,
    paddingHorizontal: 12 * scaleX,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#5a759d',
  },
  saveButtonTextDisabled: {
    color: '#999999',
  },
  roomNumber: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: '#666666',
    paddingHorizontal: 20 * scaleX,
    paddingTop: 16 * scaleX,
    paddingBottom: 8 * scaleX,
  },
  inputContainer: {
    paddingHorizontal: 20 * scaleX,
    paddingTop: 16 * scaleX,
  },
  input: {
    minHeight: 150 * scaleX,
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8 * scaleX,
    padding: 12 * scaleX,
    textAlignVertical: 'top',
  },
});
