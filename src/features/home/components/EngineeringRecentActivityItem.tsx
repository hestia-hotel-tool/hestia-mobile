import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography } from '@/theme';
import { useDesignScale } from '@/ui';

export default function EngineeringRecentActivityItem({
  roomLabel,
  message,
  timeLabel,
  state = 'neutral',
}: {
  roomLabel: string;
  message: string;
  timeLabel: string;
  state?: 'solved' | 'unsolved' | 'neutral';
}) {
  const { scaleX } = useDesignScale();
  const styles = useMemo(() => buildStyles(scaleX), [scaleX]);
  const dotColor = state === 'solved' ? '#41d541' : state === 'unsolved' ? '#c6c5c5' : '#c6c5c5';

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { borderColor: dotColor, backgroundColor: state === 'solved' ? '#41d541' : '#ffffff' }]} />
      <View style={styles.textCol}>
        <Text style={styles.roomLabel}>{roomLabel}</Text>
        <Text style={styles.message} numberOfLines={1}>
          {message}
        </Text>
      </View>
      <Text style={styles.time}>{timeLabel}</Text>
    </View>
  );
}

function buildStyles(scaleX: number) {
  return StyleSheet.create({
    container: {
      width: 394 * scaleX,
      height: 57 * scaleX,
      borderRadius: 86 * scaleX,
      backgroundColor: 'rgba(205,211,221,0.28)',
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12 * scaleX,
      marginBottom: 12 * scaleX,
    },
    dot: {
      width: 34 * scaleX,
      height: 34 * scaleX,
      borderRadius: 17 * scaleX,
      borderWidth: 9 * scaleX,
      marginRight: 12 * scaleX,
    },
    textCol: {
      flex: 1,
      minWidth: 0,
    },
    roomLabel: {
      fontSize: 13 * scaleX,
      fontFamily: typography.fontFamily.bold,
      fontWeight: typography.fontWeights.bold as any,
      color: '#5a759d',
      marginBottom: 2 * scaleX,
    },
    message: {
      fontSize: 13 * scaleX,
      fontFamily: typography.fontFamily.regular,
      fontWeight: typography.fontWeights.regular as any,
      color: '#1e1e1e',
    },
    time: {
      fontSize: 13 * scaleX,
      fontFamily: typography.fontFamily.bold,
      fontWeight: typography.fontWeights.bold as any,
      color: '#5a759d',
      marginLeft: 8 * scaleX,
    },
  });
}

