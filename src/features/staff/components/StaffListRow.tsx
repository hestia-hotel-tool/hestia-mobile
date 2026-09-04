import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { typography } from '@/theme';
import { scaleX as defaultScaleX, STAFF_SHIFT_CALENDAR } from '../constants/staffStyles';
import StaffShiftMonthCalendar from './StaffShiftMonthCalendar';

/** Chevron: scaled-up from 21×11; stroke #BCB4B4 */
const CHEVRON_STROKE = '#BCB4B4';
const CHEVRON_W = 32;
const CHEVRON_H = 17;

function StaffListChevron({ direction, scaleX: sx }: { direction: 'down' | 'up'; scaleX: number }) {
  const w = CHEVRON_W * sx;
  const h = CHEVRON_H * sx;
  const strokeW = 1.25 * sx;
  // Between “too open” (full width) and “too close” (narrow) — ~20px span at top/bottom
  const d =
    direction === 'down' ? 'M6.5 4 L16 11.5 L25.5 4' : 'M6.5 13 L16 5.5 L25.5 13';
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${CHEVRON_W} ${CHEVRON_H}`}>
      <Path
        d={d}
        fill="none"
        stroke={CHEVRON_STROKE}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type StaffListRowProps = {
  staffId: string;
  name: string;
  departmentLabel: string;
  avatar?: any;
  initials?: string;
  isOnline?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onEditPress?: () => void;
  scaleX?: number;
};

function getInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] || '?').toUpperCase();
}

function getInitialColor(name: string): string {
  const palette = ['#ff4dd8', '#5a759d', '#607aa1', '#f0be1b'];
  const index = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

export default function StaffListRow({
  staffId,
  name,
  departmentLabel,
  avatar,
  initials,
  isOnline = false,
  expanded = false,
  onToggleExpand,
  onEditPress,
  scaleX: scaleProp,
}: StaffListRowProps) {
  const sx = scaleProp ?? defaultScaleX;
  const initial = useMemo(() => initials || getInitial(name), [initials, name]);
  const initialColor = useMemo(() => getInitialColor(name), [name]);

  const avatarSource =
    typeof avatar === 'string'
      ? avatar.trim()
        ? { uri: avatar.trim() }
        : null
      : avatar || null;

  const card = STAFF_SHIFT_CALENDAR.card;
  const edit = STAFF_SHIFT_CALENDAR.editPill;

  const scaled = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 34 * sx,
          paddingVertical: 16 * sx,
        },
        left: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
          marginRight: 12 * sx,
        },
        avatarWrap: {
          width: 32 * sx,
          height: 32 * sx,
          marginRight: 14 * sx,
        },
        avatar: {
          width: 32 * sx,
          height: 32 * sx,
          borderRadius: 16 * sx,
        },
        initialsCircle: {
          width: 32 * sx,
          height: 32 * sx,
          borderRadius: 16 * sx,
          justifyContent: 'center',
          alignItems: 'center',
        },
        initialsText: {
          fontSize: 16 * sx,
          fontFamily: typography.fontFamily.bold,
          fontWeight: typography.fontWeights.bold as any,
          color: '#ffffff',
        },
        onlineDot: {
          position: 'absolute',
          right: -2 * sx,
          bottom: -2 * sx,
          width: 13 * sx,
          height: 13 * sx,
          borderRadius: 13 * sx,
          backgroundColor: '#28c76f',
          borderWidth: 2 * sx,
          borderColor: '#ffffff',
        },
        textBlock: {
          flex: 1,
          minWidth: 0,
        },
        name: {
          fontSize: 16 * sx,
          fontFamily: typography.fontFamily.bold,
          fontWeight: typography.fontWeights.bold as any,
          color: '#1e1e1e',
        },
        department: {
          marginTop: 2 * sx,
          fontSize: 14 * sx,
          fontFamily: typography.fontFamily.light,
          fontWeight: typography.fontWeights.light as any,
          color: '#000000',
        },
      }),
    [sx]
  );

  if (expanded && onToggleExpand) {
    return (
      <View style={{ paddingHorizontal: card.marginHorizontal * sx, alignSelf: 'stretch' }}>
        <View
          style={[
            styles.card,
            {
              borderRadius: card.borderRadius * sx,
              borderWidth: card.borderWidth * sx,
              paddingHorizontal: card.paddingHorizontal * sx,
              paddingTop: card.paddingTop * sx,
              paddingBottom: card.paddingBottom * sx,
              maxWidth: card.maxWidth * sx,
              alignSelf: 'center',
              width: '100%',
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <TouchableOpacity style={styles.cardHeaderLeft} onPress={onToggleExpand} activeOpacity={0.7}>
              <View style={scaled.avatarWrap}>
                {avatarSource ? (
                  <Image source={avatarSource} style={scaled.avatar} resizeMode="cover" />
                ) : (
                  <View style={[scaled.initialsCircle, { backgroundColor: initialColor }]}>
                    <Text style={scaled.initialsText}>{initial}</Text>
                  </View>
                )}
                {isOnline ? <View style={scaled.onlineDot} /> : null}
              </View>
              <View style={scaled.textBlock}>
                <Text style={scaled.name} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={scaled.department} numberOfLines={1}>
                  {departmentLabel}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.editPill,
                {
                  paddingHorizontal: edit.paddingHorizontal * sx,
                  paddingVertical: edit.paddingVertical * sx,
                  borderRadius: edit.borderRadius * sx,
                },
              ]}
              onPress={onEditPress}
              activeOpacity={0.7}
            >
              <Text style={[styles.editPillText, { fontSize: edit.fontSize * sx }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onToggleExpand} hitSlop={12} style={styles.chevronBtn}>
              <StaffListChevron direction="up" scaleX={sx} />
            </TouchableOpacity>
          </View>
          <StaffShiftMonthCalendar staffId={staffId} scaleX={sx} />
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={scaled.row}
      activeOpacity={onToggleExpand ? 0.7 : 1}
      onPress={onToggleExpand}
      disabled={!onToggleExpand}
    >
      <View style={scaled.left}>
        <View style={scaled.avatarWrap}>
          {avatarSource ? (
            <Image source={avatarSource} style={scaled.avatar} resizeMode="cover" />
          ) : (
            <View style={[scaled.initialsCircle, { backgroundColor: initialColor }]}>
              <Text style={scaled.initialsText}>{initial}</Text>
            </View>
          )}
          {isOnline ? <View style={scaled.onlineDot} /> : null}
        </View>

        <View style={scaled.textBlock}>
          <Text style={scaled.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={scaled.department} numberOfLines={1}>
            {departmentLabel}
          </Text>
        </View>
      </View>

      <StaffListChevron direction="down" scaleX={sx} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: STAFF_SHIFT_CALENDAR.card.backgroundColor,
    borderColor: STAFF_SHIFT_CALENDAR.card.borderColor,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  editPill: {
    backgroundColor: STAFF_SHIFT_CALENDAR.editPill.backgroundColor,
    marginRight: 4,
  },
  editPillText: {
    fontFamily: typography.fontFamily.regular,
    fontWeight: typography.fontWeights.regular as any,
    color: STAFF_SHIFT_CALENDAR.editPill.color,
  },
  chevronBtn: {
    paddingLeft: 4,
    justifyContent: 'center',
  },
});
