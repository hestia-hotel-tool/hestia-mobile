import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography } from '@/theme';
import { Icon, type IconName } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';

/**
 * What the situation is, which is not the same as which tab is open.
 *
 * `EmptyTicketsState` and `EmptyLostAndFoundState` key on their tab, because
 * for them the tab *is* the situation. Here it is not: "this department has
 * nobody" and "your search matched nothing" can both happen on the Shifts tab
 * and need different exits — the first is a fact about the hotel, the second is
 * something the user can undo.
 */
export type StaffEmptyReason =
  | 'noDepartmentStaff'
  | 'noStaff'
  | 'noSearchMatch'
  | 'noDepartments'
  | 'noAssignedRooms';

const MESSAGES: Record<StaffEmptyReason, { title: string; subtitle: string; icon: IconName }> = {
  noDepartmentStaff: {
    title: 'Nobody in this department',
    subtitle: 'No staff are assigned to it yet. Pick another department above.',
    icon: 'nav-staff',
  },
  noStaff: {
    title: 'No Staff Yet',
    subtitle: 'Nobody has been added to this hotel.',
    icon: 'nav-staff',
  },
  noSearchMatch: {
    title: 'No Matches',
    subtitle: 'No one here matches that search. Try a different name.',
    icon: 'nav-staff',
  },
  noDepartments: {
    title: 'No Departments',
    subtitle: 'This hotel has no departments set up, so there is nobody to group.',
    icon: 'nav-staff',
  },
  /*
   * The one case that is about rooms, not people, so it is the one case that
   * does not take the staff mark — see the note on the icon below.
   */
  noAssignedRooms: {
    title: 'No rooms assigned',
    subtitle: 'This person is not holding any rooms for this shift yet.',
    // `guest-stayover-bed`, because there is no `nav-rooms`: the Rooms tab's
    // bed comes from the tab bar's own asset, and this is the registry's bed.
    // It is in `TINTABLE_ICONS`, so `color` is legal.
    icon: 'guest-stayover-bed',
  },
};

export default function EmptyStaffState({ reason }: { reason: StaffEmptyReason }) {
  const message = MESSAGES[reason];

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {/*
          `nav-staff` — the mark the app already gives this feature, the same
          substitution the other two empty states make. It *is* in
          `TINTABLE_ICONS`, unlike `nav-lost-found`, so `color` is legal here.

          Per reason, because one of them is not about staff: "no rooms
          assigned" is drawn on the Staff Rooms screen, where a staff mark over
          the words "No rooms assigned" reads as the wrong illustration.
        */}
        <Icon name={message.icon} size={40 * scaleX} color="#5a759d" />
      </View>
      <Text style={styles.title}>{message.title}</Text>
      <Text style={styles.subtitle}>{message.subtitle}</Text>
    </View>
  );
}

/*
 * Deliberately identical to `EmptyTicketsState` and `EmptyLostAndFoundState`.
 * Three copies now exist, and their shared comment invites extraction — but
 * this one already diverges in its key (a reason, not a tab), so pulling all
 * three into one component is its own change rather than a side effect here.
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40 * scaleX,
    paddingVertical: 60 * scaleX,
  },
  iconContainer: {
    width: 80 * scaleX,
    height: 80 * scaleX,
    borderRadius: 40 * scaleX,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24 * scaleX,
  },
  title: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
    marginBottom: 8 * scaleX,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#666',
    textAlign: 'center',
    lineHeight: 22 * scaleX,
  },
});
