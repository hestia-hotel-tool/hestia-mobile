import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { typography } from '@/theme';
import { useDesignScale } from '@/ui';

type Props = {
  total: number;
  priority: number;
  unsolved: number;
  solved: number;
  outOfOrder: number;
  onPressPriority?: () => void;
  onPressUnsolved?: () => void;
  onPressSolved?: () => void;
  onPressOutOfOrder?: () => void;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export default function EngineeringTicketsOverviewCard({
  total,
  priority,
  unsolved,
  solved,
  outOfOrder,
  onPressPriority,
  onPressUnsolved,
  onPressSolved,
  onPressOutOfOrder,
}: Props) {
  const { scaleX } = useDesignScale();
  const styles = useMemo(() => buildStyles(scaleX), [scaleX]);

  const done = Math.max(0, solved + outOfOrder);
  const progress = total > 0 ? clamp01(done / total) : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{total} Tickets</Text>
      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statItem}
          onPress={onPressPriority}
          activeOpacity={onPressPriority ? 0.85 : 1}
          disabled={!onPressPriority}
        >
          <View style={styles.bubbleWrap}>
            <View style={[styles.bubbleFill, { backgroundColor: '#ffebeb' }]} />
            <Image
              source={require('../../../../assets/icons/priority-status.png')}
              style={styles.bubbleIconPriority}
              resizeMode="contain"
            />
            <View style={[styles.countBadge, styles.countBadgePriority]}>
              <Text style={[styles.countText, styles.countTextOnDark]}>{priority}</Text>
            </View>
          </View>
          <Text style={styles.statLabel}>Priority</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statItem}
          onPress={onPressUnsolved}
          activeOpacity={onPressUnsolved ? 0.85 : 1}
          disabled={!onPressUnsolved}
        >
          <View style={styles.bubbleWrap}>
            <View style={[styles.bubbleFill, { backgroundColor: '#f92424' }]} />
            <Image
              source={require('../../../../assets/icons/unsolved.png')}
              style={[styles.bubbleIconOnDark, styles.bubbleIconUnsolved]}
              resizeMode="contain"
            />
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{unsolved}</Text>
            </View>
          </View>
          <Text style={styles.statLabel}>Unsolved</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statItem}
          onPress={onPressSolved}
          activeOpacity={onPressSolved ? 0.85 : 1}
          disabled={!onPressSolved}
        >
          <View style={styles.bubbleWrap}>
            <View style={[styles.bubbleFill, { backgroundColor: '#41d541' }]} />
            <Image
              source={require('../../../../assets/icons/done.png')}
              style={[styles.bubbleIconOnDark, styles.bubbleIconSolved]}
              resizeMode="contain"
            />
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{solved}</Text>
            </View>
          </View>
          <Text style={styles.statLabel}>Solved</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statItem}
          onPress={onPressOutOfOrder}
          activeOpacity={onPressOutOfOrder ? 0.85 : 1}
          disabled={!onPressOutOfOrder}
        >
          <View style={styles.bubbleWrap}>
            <View style={[styles.bubbleRingFill, { backgroundColor: '#ffffff', borderColor: '#c6c5c5' }]} />
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{outOfOrder}</Text>
            </View>
          </View>
          <Text style={styles.statLabel}>Out of Order</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {done}/{total}
        </Text>
      </View>
    </View>
  );
}

function buildStyles(scaleX: number) {
  return StyleSheet.create({
    card: {
      width: 422 * scaleX,
      borderRadius: 12 * scaleX,
      backgroundColor: '#f9fafc',
      borderWidth: 1,
      borderColor: 'rgba(90,117,157,0.23)',
      alignSelf: 'center',
      padding: 18 * scaleX,
      shadowColor: 'rgba(100,131,176,0.18)',
      shadowOffset: { width: 0, height: 2 * scaleX },
      shadowOpacity: 1,
      shadowRadius: 10 * scaleX,
      elevation: 3,
    },
    title: {
      fontSize: 20 * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: typography.fontWeights.bold as any,
      color: '#1e1e1e',
    },
    divider: {
      height: 1,
      backgroundColor: '#e3e3e3',
      marginTop: 14 * scaleX,
      marginBottom: 14 * scaleX,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 4 * scaleX,
      marginBottom: 16 * scaleX,
    },
    statItem: {
      alignItems: 'center',
      width: 85 * scaleX,
    },
    bubbleWrap: {
      width: 51 * scaleX,
      height: 51 * scaleX,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'visible',
    },
    bubbleFill: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: 37 * scaleX,
    },
    bubbleRingFill: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: 37 * scaleX,
      borderWidth: 14 * scaleX,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'visible',
    },
    bubbleIconPriority: {
      position: 'absolute',
      width: 28 * scaleX,
      height: 28 * scaleX,
    },
    bubbleIconOnDark: {
      position: 'absolute',
      width: 28 * scaleX,
      height: 28 * scaleX,
      tintColor: '#ffffff',
    },
    bubbleIconUnsolved: {
      // Ensure the thumb-down glyph reads clearly at small sizes.
      transform: [{ translateY: 1 * scaleX }],
    },
    bubbleIconSolved: {
      transform: [{ translateY: 1 * scaleX }],
    },
    countText: {
      fontSize: 20 * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: typography.fontWeights.bold as any,
      color: '#000000',
    },
    countBadge: {
      position: 'absolute',
      width: 34 * scaleX,
      height: 34 * scaleX,
      borderRadius: 17 * scaleX,
      backgroundColor: '#ffffff',
      justifyContent: 'center',
      alignItems: 'center',
      // Figma: badge sits over the bottom-right of the circle (partially outside).
      right: -16 * scaleX,
      bottom: -6 * scaleX,
      zIndex: 10,
      // Android needs elevation for consistent stacking above siblings.
      elevation: 10,
    },
    countBadgePriority: {
      backgroundColor: '#f92424',
    },
    countTextOnDark: {
      color: '#ffffff',
    },
    statLabel: {
      marginTop: 8 * scaleX,
      fontSize: 14 * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: typography.fontWeights.light as any,
      color: '#000000',
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8 * scaleX,
    },
    progressTrack: {
      flex: 1,
      height: 12 * scaleX,
      borderRadius: 27 * scaleX,
      backgroundColor: '#cdd3dd',
      overflow: 'hidden',
      marginRight: 12 * scaleX,
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#5a759d',
      borderRadius: 27 * scaleX,
    },
    progressText: {
      fontSize: 16 * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: typography.fontWeights.bold as any,
      color: '#000000',
    },
  });
}

