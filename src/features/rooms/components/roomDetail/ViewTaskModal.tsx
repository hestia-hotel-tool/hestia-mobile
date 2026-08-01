import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { typography } from '@/theme';
import { scaleX } from '../../constants/roomDetailStyles';
import type { Task } from '../../types/roomDetail.types';

interface ViewTaskModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
}

export default function ViewTaskModal({
  visible,
  task,
  onClose,
}: ViewTaskModalProps) {
  if (!task) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.overlay} />
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Task</Text>
              <View style={styles.placeholder} />
            </View>

            {/* Task Content */}
            <View style={styles.contentContainer}>
              <Text style={styles.taskText}>{task.text}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
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
    top: '15%',
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
  closeButton: {
    paddingVertical: 8 * scaleX,
    paddingHorizontal: 12 * scaleX,
  },
  closeButtonText: {
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
  placeholder: {
    width: 60 * scaleX, // Match close button width for centering
  },
  contentContainer: {
    paddingHorizontal: 20 * scaleX,
    paddingTop: 24 * scaleX,
  },
  taskText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: '#1e1e1e',
    lineHeight: 24 * scaleX,
    paddingHorizontal: 16 * scaleX, // Add left and right padding for the text
  },
});
