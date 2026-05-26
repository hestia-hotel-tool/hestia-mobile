import React from 'react';
import { View, StyleSheet } from 'react-native';
import { scaleX, STAFF_CARD } from '../constants/staffStyles';

interface StaffCardProgressBarProps {
  completed: number;
  total: number;
  width?: number; // Total width of progress bar
}

export default function StaffCardProgressBar({
  completed,
  total,
  width = 343, // 401 - 42 (left) - 16 (right padding) = 343
}: StaffCardProgressBarProps) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const completedWidth = (width * percentage) / 100;
  const remainingWidth = width - completedWidth;

  return (
    <View style={[styles.container, { width: width * scaleX }]}>
      {/* Completed portion */}
      {completedWidth > 0 && (
        <View
          style={[
            styles.completedBar,
            {
              width: completedWidth * scaleX,
              borderTopLeftRadius: STAFF_CARD.progressBar.borderRadius * scaleX,
              borderBottomLeftRadius: STAFF_CARD.progressBar.borderRadius * scaleX,
              borderTopRightRadius: completedWidth === width ? STAFF_CARD.progressBar.borderRadius * scaleX : 0,
              borderBottomRightRadius: completedWidth === width ? STAFF_CARD.progressBar.borderRadius * scaleX : 0,
            },
          ]}
        />
      )}
      
      {/* Remaining portion */}
      {remainingWidth > 0 && (
        <View
          style={[
            styles.remainingBar,
            {
              width: remainingWidth * scaleX,
              marginLeft: completedWidth > 0 ? 0 : 0,
              borderTopRightRadius: STAFF_CARD.progressBar.borderRadius * scaleX,
              borderBottomRightRadius: STAFF_CARD.progressBar.borderRadius * scaleX,
              borderTopLeftRadius: completedWidth === 0 ? STAFF_CARD.progressBar.borderRadius * scaleX : 0,
              borderBottomLeftRadius: completedWidth === 0 ? STAFF_CARD.progressBar.borderRadius * scaleX : 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: STAFF_CARD.progressBar.height * scaleX,
    flexDirection: 'row',
  },
  completedBar: {
    height: STAFF_CARD.progressBar.height * scaleX,
    backgroundColor: STAFF_CARD.progressBar.completedColor,
  },
  remainingBar: {
    height: STAFF_CARD.progressBar.height * scaleX,
    backgroundColor: STAFF_CARD.progressBar.remainingColor,
  },
});


