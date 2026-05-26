import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography } from '../theme';
import { REASSIGN_MODAL, scaleX } from '@/constants/reassignModalStyles';

interface WorkloadProgressBarProps {
  current: number; // Current workload
  max?: number; // Max workload (default: 200)
  showNumber?: boolean; // Show number on right
  height?: number; // Bar height (default: 8px)
}

export default function WorkloadProgressBar({
  current,
  max = 200,
  showNumber = true,
  height = REASSIGN_MODAL.staffList.progressBar.height,
}: WorkloadProgressBarProps) {
  const percentage = Math.min((current / max) * 100, 100);
  const remainingPercentage = 100 - percentage;

  const barWidth = REASSIGN_MODAL.staffList.progressBar.width * scaleX;
  const assignedWidth = (barWidth * percentage) / 100;
  const remainingWidth = (barWidth * remainingPercentage) / 100;

  const heightScaled = height * scaleX;

  // Ensure minimum widths for visibility
  const minWidth = 0.5 * scaleX;
  const finalAssignedWidth = Math.max(assignedWidth, assignedWidth > 0 ? minWidth : 0);
  const finalRemainingWidth = Math.max(remainingWidth, remainingWidth > 0 ? minWidth : 0);

  return (
    <View style={styles.container} collapsable={false}>
      <View style={[styles.barContainer, { height: heightScaled }]} collapsable={false}>
        {/* Assigned workload (pink) - Always render, even if width is 0 */}
        <View
          style={[
            styles.assignedBar,
            {
              width: finalAssignedWidth,
              height: heightScaled,
              borderTopLeftRadius: REASSIGN_MODAL.staffList.progressBar.borderRadius * scaleX,
              borderBottomLeftRadius: REASSIGN_MODAL.staffList.progressBar.borderRadius * scaleX,
              borderTopRightRadius: percentage >= 100 ? REASSIGN_MODAL.staffList.progressBar.borderRadius * scaleX : 0,
              borderBottomRightRadius: percentage >= 100 ? REASSIGN_MODAL.staffList.progressBar.borderRadius * scaleX : 0,
            },
          ]}
          collapsable={false}
        />
        {/* Remaining capacity (gray) - Always render, even if width is 0 */}
        <View
          style={[
            styles.remainingBar,
            {
              width: finalRemainingWidth,
              height: heightScaled,
              borderTopRightRadius: REASSIGN_MODAL.staffList.progressBar.borderRadius * scaleX,
              borderBottomRightRadius: REASSIGN_MODAL.staffList.progressBar.borderRadius * scaleX,
              borderTopLeftRadius: percentage <= 0 ? REASSIGN_MODAL.staffList.progressBar.borderRadius * scaleX : 0,
              borderBottomLeftRadius: percentage <= 0 ? REASSIGN_MODAL.staffList.progressBar.borderRadius * scaleX : 0,
            },
          ]}
          collapsable={false}
        />
      </View>
      {/* Workload number - Always show */}
      {showNumber && (
        <Text style={styles.number}>{current}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 * scaleX,
  },
  barContainer: {
    flexDirection: 'row',
    width: REASSIGN_MODAL.staffList.progressBar.width * scaleX,
  },
  assignedBar: {
    backgroundColor: '#ff4dd8',
  },
  remainingBar: {
    backgroundColor: '#cdd3dd',
  },
  number: {
    fontSize: REASSIGN_MODAL.staffList.workloadNumber.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#000000',
  },
});

