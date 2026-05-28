import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { typography } from '@shared/theme';
import { CHECKLIST_SECTION, scaleX } from '../../constants/checklistStyles';

interface ChecklistFooterProps {
  registeredBy: {
    id: string;
    name: string;
    avatar?: any;
  };
  registeredAt: {
    time: string; // e.g., "12:00"
    date: string; // e.g., "12 December 2025"
  };
  onSubmit: () => void;
  onCancel: () => void;
  hasChanges: boolean;
}

export default function ChecklistFooter({
  registeredBy,
  registeredAt,
  onSubmit,
  onCancel,
  hasChanges,
}: ChecklistFooterProps) {
  return (
    <View style={styles.container}>
      {/* Registration Information */}
      <View style={styles.registrationInfo}>
        <View style={styles.registrationLeft}>
          <Image
            source={registeredBy.avatar || require('../../../../../assets/icons/profile-avatar.png')}
            style={styles.profilePicture}
            resizeMode="cover"
          />
          <View style={styles.registrationText}>
            <Text style={styles.registeredByLabel}>Registered by</Text>
            <Text style={styles.registeredByName}>{registeredBy.name}</Text>
          </View>
        </View>
        <View style={styles.registrationRight}>
          <Text style={styles.time}>{registeredAt.time}</Text>
          <Text style={styles.date}>{registeredAt.date}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.submitButton, !hasChanges && styles.submitButtonDisabled]}
          onPress={onSubmit}
          activeOpacity={0.8}
          disabled={!hasChanges}
        >
          <Text style={[styles.submitButtonText, !hasChanges && styles.submitButtonTextDisabled]}>
            Submit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20 * scaleX,
    paddingTop: 32 * scaleX,
    paddingBottom: 40 * scaleX,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 24 * scaleX,
  },
  registrationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24 * scaleX,
  },
  registrationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePicture: {
    width: 40 * scaleX,
    height: 40 * scaleX,
    borderRadius: 20 * scaleX,
    marginRight: 12 * scaleX,
  },
  registrationText: {
    justifyContent: 'center',
  },
  registeredByLabel: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'light' as any,
    color: '#666666',
    marginBottom: 2 * scaleX,
  },
  registeredByName: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'bold' as any,
    color: '#000000',
  },
  registrationRight: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'regular' as any,
    color: '#000000',
    marginBottom: 2 * scaleX,
  },
  date: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'light' as any,
    color: '#666666',
  },
  actionsContainer: {
    alignItems: 'center',
  },
  submitButton: {
    width: '100%',
    height: 50 * scaleX,
    backgroundColor: '#5a759d',
    borderRadius: 8 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16 * scaleX,
  },
  submitButtonDisabled: {
    backgroundColor: '#e0e0e0',
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'bold' as any,
    color: '#ffffff',
  },
  submitButtonTextDisabled: {
    color: '#999999',
  },
  cancelButton: {
    paddingVertical: 8 * scaleX,
    paddingHorizontal: 16 * scaleX,
  },
  cancelButtonText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'regular' as any,
    color: '#5a759d',
  },
});
