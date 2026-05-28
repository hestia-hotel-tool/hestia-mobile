import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { typography } from '@shared/theme';
import { useDesignScale } from '@shared/hooks/useDesignScale';

type Row = {
  label: string;
  count: number;
  icon: any;
  circleBg: string;
  iconTint?: string;
  /** When true, mirror the icon horizontally (e.g. same arrow for Arrivals vs Departures). */
  flipIconHorizontal?: boolean;
};

export default function HskPortierCategoryListCard({
  rows,
  onRowPress,
}: {
  rows: Row[];
  onRowPress?: (row: Row) => void;
}) {
  const { scaleX } = useDesignScale();
  const styles = useMemo(() => buildStyles(scaleX), [scaleX]);

  return (
    <View style={styles.card}>
      {rows.map((row, idx) => (
        <View key={row.label}>
          <TouchableOpacity
            style={styles.row}
            onPress={onRowPress ? () => onRowPress(row) : undefined}
            activeOpacity={onRowPress ? 0.85 : 1}
            disabled={!onRowPress}
          >
            <Text style={styles.label}>{row.label}</Text>
            <View style={styles.right}>
              <View style={[styles.circle, { backgroundColor: row.circleBg }]}>
                <Image
                  source={row.icon}
                  style={[
                    styles.icon,
                    row.iconTint ? { tintColor: row.iconTint } : null,
                    row.flipIconHorizontal ? { transform: [{ scaleX: -1 }] } : null,
                  ]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{row.count}</Text>
              </View>
            </View>
          </TouchableOpacity>
          {idx < rows.length - 1 ? <View style={styles.divider} /> : null}
        </View>
      ))}
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
      overflow: 'hidden',
      marginTop: 18 * scaleX,
    },
    row: {
      height: 70 * scaleX,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 22 * scaleX,
    },
    label: {
      fontSize: 20 * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: typography.fontWeights.bold as any,
      color: '#1e1e1e',
    },
    right: {
      width: 70 * scaleX,
      height: 52 * scaleX,
      alignItems: 'flex-end',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'visible',
    },
    circle: {
      width: 51.007 * scaleX,
      height: 51.007 * scaleX,
      borderRadius: 37 * scaleX,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      width: 24 * scaleX,
      height: 24 * scaleX,
    },
    badge: {
      position: 'absolute',
      right: -10 * scaleX,
      bottom: -6 * scaleX,
      width: 34 * scaleX,
      height: 34 * scaleX,
      borderRadius: 17 * scaleX,
      backgroundColor: '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      elevation: 10,
    },
    badgeText: {
      fontSize: 20 * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: typography.fontWeights.bold as any,
      color: '#000000',
      includeFontPadding: false,
    },
    divider: {
      height: 1,
      backgroundColor: '#e3e3e3',
      marginLeft: 0,
      marginRight: 0,
    },
  });
}

