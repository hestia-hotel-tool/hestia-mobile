import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, Image } from 'react-native';
import { RETURN_LATER_MODAL } from '../../constants/returnLaterModalStyles';
import { ASSIGNED_TO } from '../../constants/roomDetailStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scaleX = SCREEN_WIDTH / 430;

const REFUSE_REASONS = [
  'Guest Requested Privacy',
  'Guest Already Cleaned/Organized the Room',
  'Guest Has a Do Not Disturb Sign',
  'Guest Is Resting or Sleeping',
];

interface RefuseServiceModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  roomNumber?: string;
  assignedTo?: {
    id: string;
    name: string;
    avatar?: any;
    initials?: string;
    avatarColor?: string;
    department?: string;
  };
  onReassignPress?: () => void;
}

export default function RefuseServiceModal({
  visible,
  onClose,
  onConfirm,
  roomNumber,
  assignedTo,
  onReassignPress,
}: RefuseServiceModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setSelectedReason(null);
      setCustomReason('');
    }
  }, [visible]);

  const selectReason = (reason: string) => {
    setSelectedReason(prev => (prev === reason ? null : reason));
    setCustomReason('');
  };

  const handleCustomChange = (text: string) => {
    setCustomReason(text);
    if (text.trim()) setSelectedReason(null);
  };

  const handleConfirm = () => {
    const reason = customReason.trim() || selectedReason;
    if (reason) onConfirm(reason);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <Text style={styles.title}>Refuse Service</Text>

            {/* Question */}
            <Text style={styles.question}>Why did the guest refuse service?</Text>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Checkboxes - single selection only */}
            {REFUSE_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={styles.checkboxRow}
                onPress={() => selectReason(reason)}
                activeOpacity={0.7}
              >
                <View style={styles.checkbox}>
                  {selectedReason === reason && !customReason.trim() && (
                    <Image
                      source={require('../../../../../assets/icons/tick.png')}
                      style={styles.checkmark}
                      resizeMode="contain"
                    />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>{reason}</Text>
              </TouchableOpacity>
            ))}

            {/* Custom section */}
            <Text style={styles.customLabel}>Custom</Text>
            <TextInput
              style={styles.customInput}
              placeholder="Add custom reason..."
              placeholderTextColor="#999999"
              multiline
              numberOfLines={4}
              value={customReason}
              onChangeText={handleCustomChange}
              textAlignVertical="top"
            />

            {/* Confirm Button - enabled only when one reason or custom is selected */}
            <TouchableOpacity
              style={[styles.confirmButton, (!selectedReason && !customReason.trim()) && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              activeOpacity={0.8}
              disabled={!selectedReason && !customReason.trim()}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>

            {/* Assigned To - Figma 1121-1052: divider, label, avatar + name + Reassign row on white */}
            {assignedTo && (
              <>
                <View style={styles.assignedToDivider} />
                <Text style={styles.assignedToTitle}>Assigned to</Text>
                <View style={styles.assignedToRow}>
                  {assignedTo.avatar ? (
                    <Image
                      source={assignedTo.avatar}
                      style={styles.assignedToAvatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.assignedToInitials, { backgroundColor: assignedTo.avatarColor || '#5a759d' }]}>
                      <Text style={styles.assignedToInitialsText}>
                        {assignedTo.initials || (assignedTo.name ? assignedTo.name.charAt(0).toUpperCase() : '?')}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.assignedToName} numberOfLines={1}>
                    {assignedTo.name}
                  </Text>
                  <TouchableOpacity
                    style={styles.reassignButton}
                    onPress={() => onReassignPress?.()}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reassignButtonText}>Reassign</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  modalOverlay: {
    position: 'absolute',
    top: 232 * scaleX,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 * scaleX },
  title: {
    marginTop: 21 * scaleX,
    marginLeft: 24 * scaleX,
    fontSize: 20 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#607aa1',
  },
  question: {
    marginTop: 7 * scaleX,
    marginLeft: 24 * scaleX,
    marginRight: 24 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: '#000000',
  },
  divider: {
    marginTop: 17 * scaleX,
    marginHorizontal: 12 * scaleX,
    height: 1,
    backgroundColor: RETURN_LATER_MODAL.divider.backgroundColor,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20 * scaleX,
    marginLeft: 34 * scaleX,
    marginRight: 24 * scaleX,
  },
  checkbox: {
    width: 28 * scaleX,
    height: 28 * scaleX,
    borderWidth: 2,
    borderColor: '#5a759d',
    borderRadius: 4 * scaleX,
    marginRight: 16 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 18 * scaleX,
    height: 18 * scaleX,
    tintColor: '#5a759d',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 15 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '400',
    color: '#000000',
  },
  customLabel: {
    marginTop: 32 * scaleX,
    marginLeft: 24 * scaleX,
    fontSize: 16 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: '#000000',
  },
  customInput: {
    marginTop: 12 * scaleX,
    marginHorizontal: 32 * scaleX,
    height: 152 * scaleX,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 7 * scaleX,
    paddingHorizontal: 16 * scaleX,
    paddingVertical: 12 * scaleX,
    fontSize: 15 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: '#000000',
  },
  confirmButton: {
    marginTop: 40 * scaleX,
    marginHorizontal: 35 * scaleX,
    height: 70 * scaleX,
    backgroundColor: '#5a759d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 18 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '400',
    color: '#FFFFFF',
  },
  assignedToDivider: {
    marginTop: 40 * scaleX,
    marginHorizontal: 32 * scaleX,
    height: 1,
    backgroundColor: RETURN_LATER_MODAL.divider.backgroundColor,
  },
  assignedToTitle: {
    marginTop: 20 * scaleX,
    marginLeft: 32 * scaleX,
    marginBottom: 16 * scaleX,
    fontSize: 15 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#000000',
  },
  assignedToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 32 * scaleX,
    marginBottom: 40 * scaleX,
    gap: 16 * scaleX,
  },
  assignedToAvatar: {
    width: ASSIGNED_TO.profilePicture.width * scaleX,
    height: ASSIGNED_TO.profilePicture.height * scaleX,
    borderRadius: (ASSIGNED_TO.profilePicture.width / 2) * scaleX,
  },
  assignedToInitials: {
    width: ASSIGNED_TO.profilePicture.width * scaleX,
    height: ASSIGNED_TO.profilePicture.height * scaleX,
    borderRadius: (ASSIGNED_TO.profilePicture.width / 2) * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignedToInitialsText: {
    fontSize: 20 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#ffffff',
  },
  assignedToName: {
    flex: 1,
    fontSize: ASSIGNED_TO.staffName.fontSize * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '600',
    color: ASSIGNED_TO.staffName.color,
  },
  reassignButton: {
    width: ASSIGNED_TO.reassignButton.width * scaleX,
    height: ASSIGNED_TO.reassignButton.height * scaleX,
    borderRadius: ASSIGNED_TO.reassignButton.borderRadius * scaleX,
    backgroundColor: ASSIGNED_TO.reassignButton.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reassignButtonText: {
    fontSize: ASSIGNED_TO.reassignButton.fontSize * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '400',
    color: ASSIGNED_TO.reassignButton.color,
  },
});
