import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { typography } from '@shared/theme';
import { scaleX, HISTORY_SECTION } from '../../constants/roomDetailStyles';

interface DownloadReportButtonProps {
  onPress: () => void;
  isLoading?: boolean;
}

export default function DownloadReportButton({ onPress, isLoading = false }: DownloadReportButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, isLoading && styles.buttonDisabled]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isLoading}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={HISTORY_SECTION.downloadButtonText.color} />
      ) : (
        <>
          <Image
            source={require('../../../../../assets/icons/download-report.png')}
            style={styles.icon}
            resizeMode="contain"
          />
          <Text style={styles.text}>Download Report</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: HISTORY_SECTION.downloadButton.width,
    height: HISTORY_SECTION.downloadButton.height,
    borderRadius: HISTORY_SECTION.downloadButton.borderRadius,
    backgroundColor: HISTORY_SECTION.downloadButton.backgroundColor,
    marginBottom: HISTORY_SECTION.downloadButton.marginBottom,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16 * scaleX,
    alignSelf: 'flex-start', // Left align the button
  },
  icon: {
    width: 16 * scaleX,
    height: 16 * scaleX,
    marginRight: 8 * scaleX,
  },
  text: {
    fontSize: HISTORY_SECTION.downloadButtonText.fontSize,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: HISTORY_SECTION.downloadButtonText.color,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
