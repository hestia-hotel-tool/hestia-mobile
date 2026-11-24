import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Icon } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import { Avatar } from '@/components/ui/Avatar';

export type FloorRow = {
  /** "2", "1", "-2"… */
  label: string;
  /** "20 Rooms", or what is on a level without rooms ("Kitchen, HSK Office"). */
  caption: string;
  /** Room floors can be opened in Rooms; levels without rooms cannot. */
  onViewRooms?: () => void;
  /** Absent for people who cannot assign (technicians): no Assign Floor pill. */
  onAssign?: () => void;
  /**
   * Who has the floor's rooms (client, 2026-11-24: "when you assign a floor,
   * let their name and picture be on it"): the technician, and how many
   * others hold rooms on it too. Shown in place of "Assign Floor"; a lead
   * taps it to reassign.
   */
  assignee?: { name: string; avatar?: string; others: number };
};

/**
 * Engineering Home → Floors — Figma 3843:52 (4686:524).
 *
 * One card, a row per floor split by fine rules: the floor in a blue square
 * with its room count under it, then "View Rooms" and "Assign Floor" as white
 * pills on the right. Levels with no rooms (the basements) get Assign only.
 */
export default function FloorsOverviewCard({ floors }: { floors: FloorRow[] }) {
  return (
    <View style={styles.card}>
      {floors.map((floor, i) => (
        <View key={floor.label} style={[styles.row, i > 0 && styles.rowRule]}>
          <View style={styles.floorCol}>
            <View style={styles.badge}>
              <Text style={styles.badgeText} numberOfLines={1} adjustsFontSizeToFit>
                {floor.label}
              </Text>
            </View>
            <Text style={styles.caption} numberOfLines={1}>
              {floor.caption}
            </Text>
          </View>
          <View style={styles.actions}>
            {floor.onViewRooms ? (
              <TouchableOpacity
                style={styles.pill}
                onPress={floor.onViewRooms}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`View rooms on floor ${floor.label}`}
              >
                <Text style={styles.pillText}>View Rooms</Text>
              </TouchableOpacity>
            ) : null}
            {floor.assignee ? (
              <AssigneePill floor={floor} />
            ) : floor.onAssign ? (
            <TouchableOpacity
              style={[styles.pill, styles.assignPill]}
              onPress={floor.onAssign}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Assign floor ${floor.label}`}
            >
              <Icon name="action-assign-rooms" size={17 * scaleX} color="#5a759d" />
              <Text style={styles.pillText}>Assign Floor</Text>
            </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

/** The floor's technician: photo and first name ("2 technicians" when it is shared). */
function AssigneePill({ floor }: { floor: FloorRow }) {
  const a = floor.assignee!;
  const label = a.others > 0 ? `${a.others + 1} technicians` : a.name.trim().split(/\s+/)[0] ?? a.name;
  const body = (
    <>
      <Avatar uri={a.avatar} name={a.name} size={28 * scaleX} />
      <Text style={styles.pillText} numberOfLines={1}>
        {label}
      </Text>
    </>
  );
  if (!floor.onAssign) {
    return (
      <View style={[styles.pill, styles.assignPill]} accessibilityLabel={`Floor ${floor.label}: ${a.name}`}>
        {body}
      </View>
    );
  }
  return (
    <TouchableOpacity
      style={[styles.pill, styles.assignPill]}
      onPress={floor.onAssign}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Floor ${floor.label} is ${a.name}'s. Reassign`}
    >
      {body}
    </TouchableOpacity>
  );
}

const androidText = Platform.select({ android: { includeFontPadding: false } as const, default: {} as const });

const styles = StyleSheet.create({
  /* 4686:525 — #f9fafc, 1px rgba(90,117,157,0.23), radius 12, 422 wide at x=12. */
  card: {
    marginHorizontal: 12 * scaleX,
    backgroundColor: '#f9fafc',
    borderWidth: 1,
    borderColor: 'rgba(90, 117, 157, 0.23)',
    borderRadius: 12 * scaleX,
    overflow: 'hidden',
  },
  /* Rows ~100 tall: the square 16 down and 15 in; the pills 22 from the right. */
  row: {
    minHeight: 96 * scaleX,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 16 * scaleX,
    paddingBottom: 10 * scaleX,
    paddingLeft: 15 * scaleX,
    paddingRight: 22 * scaleX,
  },
  rowRule: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(90, 117, 157, 0.35)',
  },
  floorCol: {
    width: 100 * scaleX,
  },
  /* 4686:671 — 44.8 square, radius 7, rgba(90,117,157,0.25) on a #5a759d hairline. */
  badge: {
    width: 44.8 * scaleX,
    height: 44.8 * scaleX,
    borderRadius: 7 * scaleX,
    borderWidth: 1,
    borderColor: '#5a759d',
    backgroundColor: 'rgba(90, 117, 157, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4 * scaleX,
  },
  badgeText: {
    fontSize: 26 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#5a759d',
    ...androidText,
  },
  caption: {
    marginTop: 8 * scaleX,
    fontSize: 11 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: '#7c7878',
    ...androidText,
  },
  actions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8.4 * scaleX,
    marginTop: 7 * scaleX,
  },
  /* 4686:593 — white, 135.6 x 45.5, fully round; Helvetica 15 #334866. */
  pill: {
    width: 135.6 * scaleX,
    height: 45.5 * scaleX,
    borderRadius: 45 * scaleX,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignPill: {
    justifyContent: 'flex-start',
    paddingLeft: 16 * scaleX,
    gap: 8 * scaleX,
  },
  pillText: {
    fontSize: 15 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '400',
    color: '#334866',
    ...androidText,
  },
});
