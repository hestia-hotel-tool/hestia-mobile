import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { useNow } from '@/hooks/useNow';
import { typography } from '@/theme';
import { formatClock24, formatDueIn, formatDueTime } from '@/utils/formatting';
import { STATUS_CONFIGS, type RoomActivityState } from '../../types/allRooms.types';

export type ServiceExceptionActions = {
  /** Checked the door again: the sign is still up. */
  onDndStill?: () => void;
  /** The sign is gone: the room goes back to Dirty, ready to clean. */
  onDndCleared?: () => void;
  /** The guest who refused now wants service: back to Dirty. */
  onServiceResumed?: () => void;
  /** The guest no longer needs a later time: back to Dirty. */
  onReturnLaterCleared?: () => void;
  /** Which action is saving, to show its spinner. */
  busy?: 'dndStill' | 'dndCleared' | 'serviceResumed' | 'returnLaterCleared' | null;
};

type Props = ServiceExceptionActions & { activity: RoomActivityState };

const INK = '#1e1e1e';
const MUTED = '#6b7a90';

/**
 * What is stopping service on this room and the next step, at the top of the
 * Overview — Do Not Disturb, Refused Service or Return Later.
 *
 * The flow each one follows (the rules are the database's, migration
 * 20260929000400):
 * - DND: each look at the door is either "Still DND" (counted, next check
 *   scheduled, a reminder when it is due) or "Sign removed" (ready to clean).
 *   Supervisors hear when it is found, when it is gone, and if it lasts past
 *   the welfare-check time.
 * - Refused: "Guest wants service now" puts it back to be cleaned; otherwise it
 *   ends with the service day.
 * - Return later: the time the guest asked for; "No longer needed" clears it.
 *   Starting to clean (the status menu) clears any of the three.
 */
export function ServiceExceptionPanel({
  activity,
  onDndStill,
  onDndCleared,
  onServiceResumed,
  onReturnLaterCleared,
  busy = null,
}: Props) {
  const now = useNow();

  if (activity.kind === 'dnd') {
    const due = activity.nextCheckAt != null && activity.nextCheckAt <= now;
    return (
      <Panel
        icon="action-dnd"
        color={STATUS_CONFIGS.DoNotDisturb.color}
        title="Do Not Disturb"
        lines={[
          `${activity.since != null ? `Found at ${formatClock24(new Date(activity.since))}` : 'Sign on the door'} · ${activity.checks} ${
            activity.checks === 1 ? 'check' : 'checks'
          }`,
          activity.nextCheckAt == null
            ? 'Check the door again later.'
            : due
              ? 'The next check is due now.'
              : `Next check ${formatDueTime(activity.nextCheckAt, new Date(now))} (${formatDueIn(activity.nextCheckAt, now)}).`,
        ]}
        alert={due}
        note="Supervisors are told when the sign is found, when it is gone, and if it is still up at the welfare-check time."
        actions={[
          { label: 'Still DND', onPress: onDndStill, busy: busy === 'dndStill', tone: 'secondary' },
          { label: 'Sign removed', onPress: onDndCleared, busy: busy === 'dndCleared', tone: 'primary' },
        ]}
      />
    );
  }

  if (activity.kind === 'refuseService') {
    return (
      <Panel
        icon="action-refuse-service"
        color={STATUS_CONFIGS.RefusedService.color}
        title="Service refused"
        lines={[
          activity.reason ?? 'The guest refused service.',
          activity.at != null ? `Recorded at ${formatClock24(new Date(activity.at))}. Ends with the service day.` : 'Ends with the service day.',
        ]}
        actions={[
          { label: 'Guest wants service now', onPress: onServiceResumed, busy: busy === 'serviceResumed', tone: 'primary' },
        ]}
      />
    );
  }

  if (activity.kind === 'returnLater' && activity.dueAt != null) {
    const passed = activity.dueAt <= now;
    return (
      <Panel
        icon="action-return-later"
        color="#8b6bb0"
        title="Return later"
        lines={[
          `Guest asked for ${formatDueTime(activity.dueAt, new Date(now))} (${formatDueIn(activity.dueAt, now)}).`,
          ...(activity.reason ? [activity.reason] : []),
        ]}
        alert={passed}
        note={passed ? 'The time has come: go back and start cleaning from the status menu.' : undefined}
        actions={[
          { label: 'No longer needed', onPress: onReturnLaterCleared, busy: busy === 'returnLaterCleared', tone: 'secondary' },
        ]}
      />
    );
  }

  return null;
}

type Action = { label: string; onPress?: () => void; busy?: boolean; tone: 'primary' | 'secondary' };

function Panel({
  icon,
  color,
  title,
  lines,
  note,
  alert,
  actions,
}: {
  icon: IconName;
  color: string;
  title: string;
  lines: string[];
  note?: string;
  alert?: boolean;
  actions: Action[];
}) {
  const shown = actions.filter((a) => a.onPress);
  return (
    <View style={[styles.card, { borderLeftColor: color }]} accessibilityRole="summary">
      <View style={styles.head}>
        <View style={[styles.iconDisc, { backgroundColor: `${color}22` }]}>
          <Icon name={icon} size={20} color={color} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      {lines.map((l, i) => (
        <Text key={i} style={[styles.line, alert && i === lines.length - 1 && styles.alert]}>
          {l}
        </Text>
      ))}
      {note ? <Text style={styles.note}>{note}</Text> : null}
      {shown.length > 0 ? (
        <View style={styles.actions}>
          {shown.map((a) => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              disabled={a.busy}
              style={({ pressed }) => [
                styles.button,
                a.tone === 'primary' ? { backgroundColor: color, borderColor: color } : styles.buttonSecondary,
                (pressed || a.busy) && { opacity: 0.75 },
              ]}
              accessibilityRole="button"
            >
              {a.busy ? (
                <ActivityIndicator color={a.tone === 'primary' ? '#ffffff' : color} />
              ) : (
                <Text style={[styles.buttonText, { color: a.tone === 'primary' ? '#ffffff' : INK }]}>{a.label}</Text>
              )}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 5,
    backgroundColor: '#f9fafc',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90,117,157,0.2)',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  iconDisc: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 17, color: INK },
  line: { marginTop: 2, fontFamily: typography.fontFamily.primary, fontSize: 15, lineHeight: 21, color: INK },
  alert: { color: '#e5484d', fontWeight: '700' },
  note: { marginTop: 8, fontFamily: typography.fontFamily.primary, fontSize: 12, lineHeight: 17, color: MUTED },
  actions: { marginTop: 12, flexDirection: 'row', gap: 10 },
  button: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: { backgroundColor: '#ffffff', borderColor: 'rgba(90,117,157,0.35)' },
  buttonText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 15, textAlign: 'center' },
});

export default ServiceExceptionPanel;
