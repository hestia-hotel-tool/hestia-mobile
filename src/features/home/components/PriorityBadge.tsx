import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { typography } from '@/theme';
import { normalizedScaleX } from '@/utils/responsive';

interface PriorityBadgeProps {
  count: number;
  onPress?: () => void;
}

export default function PriorityBadge({ count, onPress }: PriorityBadgeProps) {
  const isPressable = count >= 1 && !!onPress;
  const Wrapper = isPressable ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Image
          source={require('../../../../assets/icons/prioirty-icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
      </View>
      {count > 0 && (
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        </View>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: 58 * normalizedScaleX,
    height: 47 * normalizedScaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 58 * normalizedScaleX,
    height: 47 * normalizedScaleX,
  },
  badgeContainer: {
    position: 'absolute',
    top: -2 * normalizedScaleX,
    right: -5 * normalizedScaleX,
  },
  badge: {
    backgroundColor: '#f92424',
    borderRadius: 12 * normalizedScaleX,
    width: 24 * normalizedScaleX,
    height: 24 * normalizedScaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 15 * normalizedScaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as any,
    color: '#ffffff',
  },
});

