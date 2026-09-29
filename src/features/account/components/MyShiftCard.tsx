import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useToast } from '@/contexts/ToastContext';
import { typography } from '@/theme';
import { formatClock24, formatMinutesSpan } from '@/utils/formatting';
import { parseShiftTime } from '@features/staff/utils/shiftState';
import {
  breakMinutesLeft,
  endBreak,
  fetchMyBreaksToday,
  listBreakRules,
  startBreak,
  type BreakRule,
  type StaffBreak,
} from '../services/breaks';
import { shiftNow } from '../utils/shiftClock';
import { SETTINGS_COLORS as C } from './SettingsList';

const GREEN = '#39b36b';
const AMBER = '#d98a00';

type Props = {
  shift: { id: string; name: string; start: string; end: string };
  now: number;
};

/** Is `now` inside a break's window (or the break has none)? */
function inWindow(rule: BreakRule, now: Date): boolean {
  const s = parseShiftTime(rule.windowStart);
  const e = parseShiftTime(rule.windowEnd);
  if (s == null || e == null) return true;
  const t = now.getHours() * 60 + now.getMinutes();
  return e > s ? t >= s && t < e : t >= s || t < e;
}

/**
 * My Shift on Settings: today's hours and where now falls against them, then
 * the shift's breaks.
 *
 * - On break: what break, a countdown ("18 min left", then "5 min over" in
 *   amber) and End Break.
 * - Otherwise each break the shift allows, with Start while its window is
 *   open, "From 11:00" before it, or when it was taken today. A shift with
 *   no breaks set offers a short 15-minute break.
 */
export function MyShiftCard({ shift, now }: Props) {
  const toast = useToast();
  const [rules, setRules] = useState<BreakRule[]>([]);
  const [today, setToday] = useState<StaffBreak[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [r, t] = await Promise.all([listBreakRules(shift.id), fetchMyBreaksToday()]);
      setRules(r);
      setToday(t);
    } catch {
      // The card still shows the shift; breaks come back on the next focus.
    }
  }, [shift.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const open = today.find((b) => !b.endedAt) ?? null;
  const status = shiftNow(shift.start, shift.end, new Date(now));
  const tone = open ? AMBER : status.state === 'on' ? GREEN : status.state === 'upcoming' ? C.title : C.muted;

  const begin = async (rule: BreakRule | null) => {
    setBusy(rule?.id ?? 'short');
    try {
      const b = await startBreak(rule?.id ?? null, rule ? undefined : 15);
      setToday((t) => [b, ...t]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show(`Enjoy your ${b.name.toLowerCase()} — back at ${formatClock24(new Date(Date.parse(b.startedAt) + b.plannedMinutes * 60_000))}.`, {
        type: 'success',
        title: 'On break',
      });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Break not started' });
    } finally {
      setBusy(null);
    }
  };

  const confirmStart = (rule: BreakRule | null) => {
    const label = rule ? `${rule.name} (${formatMinutesSpan(rule.minutes * 60_000)})` : 'a 15-minute break';
    Alert.alert(`Start ${label}?`, 'Your team will see you as on break until you end it.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Start break', onPress: () => void begin(rule) },
    ]);
  };

  const finish = async () => {
    setBusy('end');
    try {
      await endBreak();
      setToday((t) => t.map((b) => (b.endedAt ? b : { ...b, endedAt: new Date().toISOString() })));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show('Welcome back.', { type: 'success', title: 'Break ended' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Break not ended' });
    } finally {
      setBusy(null);
    }
  };

  const nowDate = new Date(now);
  const takenFor = (rule: BreakRule) => today.find((b) => b.ruleId === rule.id && b.endedAt);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: `${tone}1f` }]}>
          <Ionicons name={open ? 'cafe-outline' : 'time-outline'} size={22} color={tone} />
        </View>
        <View style={styles.topText}>
          <Text style={styles.kicker}>My shift · {shift.name}</Text>
          <Text style={styles.hours}>
            {shift.start} – {shift.end}
          </Text>
          <Text style={[styles.status, { color: open ? AMBER : tone }]}>
            {open ? 'On break' : status.label}
            {!open && status.detail ? <Text style={styles.statusDetail}>{`  ${status.detail}`}</Text> : null}
          </Text>
        </View>
      </View>

      {open ? (
        <OnBreak b={open} now={now} busy={busy === 'end'} onEnd={finish} />
      ) : status.state === 'on' ? (
        <View style={styles.breaks}>
          <Text style={styles.breaksTitle}>Breaks</Text>
          {rules.length === 0 ? (
            <BreakLine
              title="Short break"
              detail="15 min"
              action={{ label: 'Start', onPress: () => confirmStart(null), busy: busy === 'short' }}
            />
          ) : (
            rules.map((rule) => {
              const taken = takenFor(rule);
              const window = rule.windowStart && rule.windowEnd ? `${rule.windowStart}–${rule.windowEnd}` : 'any time';
              const detail = `${formatMinutesSpan(rule.minutes * 60_000)} · ${window}`;
              if (taken) {
                return (
                  <BreakLine
                    key={rule.id}
                    title={rule.name}
                    detail={`Taken ${formatClock24(new Date(taken.startedAt))}–${formatClock24(new Date(taken.endedAt!))}`}
                    done
                  />
                );
              }
              const openNow = inWindow(rule, nowDate);
              return (
                <BreakLine
                  key={rule.id}
                  title={rule.name}
                  detail={detail}
                  action={
                    openNow
                      ? { label: 'Start', onPress: () => confirmStart(rule), busy: busy === rule.id }
                      : { label: `From ${rule.windowStart}`, disabled: true }
                  }
                />
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}

function OnBreak({ b, now, busy, onEnd }: { b: StaffBreak; now: number; busy: boolean; onEnd: () => void }) {
  const left = breakMinutesLeft(b, now);
  const over = left < 0;
  const back = formatClock24(new Date(Date.parse(b.startedAt) + b.plannedMinutes * 60_000));
  return (
    <View style={styles.onBreak} accessibilityLiveRegion="polite">
      <View style={{ flex: 1 }}>
        <Text style={styles.onBreakName}>{b.name}</Text>
        <Text style={[styles.onBreakLeft, over && { color: C.danger }]}>
          {over ? `${formatMinutesSpan(-left * 60_000)} over` : left <= 0 ? 'Time’s up' : `${formatMinutesSpan(left * 60_000)} left`}
        </Text>
        <Text style={styles.onBreakBack}>
          Started {formatClock24(new Date(b.startedAt))} · back by {back}
        </Text>
      </View>
      <Pressable
        onPress={onEnd}
        disabled={busy}
        style={({ pressed }) => [styles.endButton, (pressed || busy) && { opacity: 0.8 }]}
        accessibilityRole="button"
      >
        {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.endButtonText}>End break</Text>}
      </Pressable>
    </View>
  );
}

function BreakLine({
  title,
  detail,
  action,
  done,
}: {
  title: string;
  detail: string;
  action?: { label: string; onPress?: () => void; busy?: boolean; disabled?: boolean };
  done?: boolean;
}) {
  return (
    <View style={styles.line}>
      <Ionicons name={done ? 'checkmark-circle' : 'cafe-outline'} size={18} color={done ? GREEN : C.title} />
      <View style={{ flex: 1 }}>
        <Text style={styles.lineTitle}>{title}</Text>
        <Text style={styles.lineDetail}>{detail}</Text>
      </View>
      {action ? (
        <Pressable
          onPress={action.onPress}
          disabled={action.disabled || action.busy}
          style={({ pressed }) => [styles.startButton, action.disabled && styles.startButtonDisabled, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel={`${action.label} ${title}`}
        >
          {action.busy ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={[styles.startButtonText, action.disabled && styles.startButtonTextDisabled]}>{action.label}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.divider,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  topText: { flex: 1, minWidth: 0 },
  kicker: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: C.muted,
  },
  hours: { marginTop: 2, fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 20, color: C.ink },
  status: { marginTop: 2, fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 13 },
  statusDetail: { fontWeight: '400', color: C.muted },
  breaks: { marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider, gap: 10 },
  breaksTitle: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: C.muted,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineTitle: { fontFamily: typography.fontFamily.primary, fontWeight: '600', fontSize: 15, color: C.ink },
  lineDetail: { marginTop: 1, fontFamily: typography.fontFamily.primary, fontSize: 13, color: C.muted },
  startButton: {
    minWidth: 72,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.title,
  },
  startButtonDisabled: { backgroundColor: '#eef2f8' },
  startButtonText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 14, color: '#ffffff' },
  startButtonTextDisabled: { color: C.muted, fontWeight: '600' },
  onBreak: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff6e5',
  },
  onBreakName: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 13, color: AMBER, textTransform: 'uppercase', letterSpacing: 0.5 },
  onBreakLeft: { marginTop: 2, fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 24, color: C.ink },
  onBreakBack: { marginTop: 2, fontFamily: typography.fontFamily.primary, fontSize: 13, color: C.muted },
  endButton: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AMBER,
  },
  endButtonText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 15, color: '#ffffff' },
});

export default MyShiftCard;
