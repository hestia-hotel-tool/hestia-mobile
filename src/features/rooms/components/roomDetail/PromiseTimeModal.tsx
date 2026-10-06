import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeModal as Modal } from '@/components/ui/SafeModal';
import { useNow } from '@/hooks/useNow';
import { RETURN_LATER_MODAL } from '../../constants/returnLaterModalStyles';
import { dateWheelDates, dateWheelIndex } from '../../utils/dateWheel';

const MIN_MINUTES_FROM_NOW = 5;
/** The minute wheel moves in 5s: 12 rows to scroll instead of 60. */
const MINUTE_STEP = 5;
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const PERIODS = ['AM', 'PM'] as const;
/** One tap sets the whole picker: the usual promises are "in half an hour", "in an hour". */
const QUICK_PICKS = [
  { label: '+15 min', minutes: 15 },
  { label: '+30 min', minutes: 30 },
  { label: '+1 hour', minutes: 60 },
  { label: '+2 hours', minutes: 120 },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scaleX = SCREEN_WIDTH / 430;
const ITEM_HEIGHT = RETURN_LATER_MODAL.timePicker.itemHeight * scaleX;
const WHEEL_HEIGHT = RETURN_LATER_MODAL.timePicker.height * scaleX;
const WHEEL_PAD = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

type Period = 'AM' | 'PM';
type Picked = { date: Date; hour: number; minute: number; period: Period };

function toTimestamp({ date, hour, minute, period }: Picked): number {
  const d = new Date(date);
  const hour24 = period === 'PM' ? (hour === 12 ? 12 : hour + 12) : hour === 12 ? 0 : hour;
  d.setHours(hour24, minute, 0, 0);
  return d.getTime();
}

function fromTimestamp(ms: number): Picked {
  const t = new Date(ms);
  const hour24 = t.getHours();
  return {
    date: new Date(t.getFullYear(), t.getMonth(), t.getDate()),
    hour: hour24 % 12 === 0 ? 12 : hour24 % 12,
    minute: t.getMinutes(),
    period: hour24 >= 12 ? 'PM' : 'AM',
  };
}

/** `ms` rounded up onto the minute wheel. */
function ceilToStep(ms: number): number {
  const step = MINUTE_STEP * 60_000;
  return Math.ceil(ms / step) * step;
}

/** The earliest time the wheels can show that is at least 5 minutes away. */
function earliestAllowed(now = Date.now()): number {
  return ceilToStep(now + MIN_MINUTES_FROM_NOW * 60_000);
}

function dayLabel(date: Date): string {
  const offset = dateWheelIndex(date);
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function readIndex(e: NativeSyntheticEvent<NativeScrollEvent>, count: number): number {
  return Math.min(Math.max(Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT), 0), count - 1);
}

interface PromiseTimeModalProps {
  /**
   * Where the room header ends, in screen px: the sheet hangs flush from it.
   * The header's height changes with what it shows, so it is measured, not
   * the design's fixed 232.
   */
  top?: number;
  visible: boolean;
  onClose: () => void;
  onConfirm: (promiseTime: string, period: Period, formattedDateTime?: string, promiseAtTimestamp?: number) => void;
  roomNumber?: string;
}

/**
 * When the room will be ready for the guest (Figma 1121-825).
 *
 * The wheels used to be hard to use: 60 minute rows, and every wheel snapped
 * back on its own rules when it settled on a time it judged past, so turning
 * the hour could throw the minute and AM/PM somewhere else. Now:
 * - quick picks set the whole time in one tap;
 * - minutes move in 5s;
 * - a wheel settling on a time under 5 minutes away moves the picker to the
 *   earliest allowed time, one rule for every wheel;
 * - the chosen time is spelled out above Confirm.
 */
export default function PromiseTimeModal({ top, visible, onClose, onConfirm }: PromiseTimeModalProps) {
  const [picked, setPicked] = useState<Picked>(() => fromTimestamp(earliestAllowed()));
  const [timeError, setTimeError] = useState<string | null>(null);

  // Wheel events can land after a re-render they did not see; read the latest.
  const pickedRef = useRef(picked);
  const dateRef = useRef<ScrollView>(null);
  const hourRef = useRef<ScrollView>(null);
  const minuteRef = useRef<ScrollView>(null);
  const periodRef = useRef<ScrollView>(null);

  // The sheet drops down from under the header, the way the status menu opens.
  const [drop] = useState(() => new Animated.Value(0));

  const sheetTop = top ?? 232 * scaleX;
  const now = useNow();

  useEffect(() => {
    if (!visible) return;
    drop.setValue(0);
    Animated.timing(drop, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, drop]);

  const scrollWheelsTo = (p: Picked, animated: boolean, from?: Picked) => {
    const moved = (a: number, b?: number) => b == null || a !== b;
    const y = (x: Picked) => ({
      date: dateWheelIndex(x.date),
      hour: x.hour - 1,
      minute: Math.floor(x.minute / MINUTE_STEP),
      period: x.period === 'AM' ? 0 : 1,
    });
    const to = y(p);
    const was = from ? y(from) : undefined;
    // Only the wheels whose value changed: a programmatic scroll ends with a
    // momentum event of its own, which must not come back in as a new pick.
    if (moved(to.date, was?.date)) dateRef.current?.scrollTo({ y: to.date * ITEM_HEIGHT, animated });
    if (moved(to.hour, was?.hour)) hourRef.current?.scrollTo({ y: to.hour * ITEM_HEIGHT, animated });
    if (moved(to.minute, was?.minute)) minuteRef.current?.scrollTo({ y: to.minute * ITEM_HEIGHT, animated });
    if (moved(to.period, was?.period)) periodRef.current?.scrollTo({ y: to.period * ITEM_HEIGHT, animated });
  };


  const apply = (next: Picked, settledOn?: Picked) => {
    const prev = pickedRef.current;
    setTimeError(null);
    pickedRef.current = next;
    setPicked(next);
    scrollWheelsTo(next, true, settledOn ?? prev);
  };

  /** Every wheel change goes through here, so one rule keeps the time valid. */
  const choose = (patch: Partial<Picked>) => {
    const prev = pickedRef.current;
    const next = { ...prev, ...patch };
    if (toTimestamp(next) === toTimestamp(prev)) return;
    // The wheel that moved already shows its value, so it counts as settled.
    apply(toTimestamp(next) < earliestAllowed() ? fromTimestamp(earliestAllowed()) : next, next);
  };

  /** Each opening starts from the earliest allowed time, wheels lined up on it. */
  const handleShow = () => {
    const start = fromTimestamp(earliestAllowed());
    pickedRef.current = start;
    setPicked(start);
    setTimeError(null);
    scrollWheelsTo(start, false);
  };

  const chooseIn = (minutes: number) => apply(fromTimestamp(ceilToStep(Date.now() + minutes * 60_000)));

  const pickedAt = toTimestamp(picked);
  const earliestAt = earliestAllowed(now);
  const isTooSoon = (p: Partial<Picked>) => toTimestamp({ ...picked, ...p }) < earliestAt;

  const timeString = `${picked.hour.toString().padStart(2, '0')}:${picked.minute.toString().padStart(2, '0')} ${picked.period}`;
  const readyBy = `${dayLabel(picked.date)} at ${picked.hour}:${picked.minute.toString().padStart(2, '0')} ${picked.period}`;

  const handleConfirm = () => {
    if (pickedAt < Date.now() + MIN_MINUTES_FROM_NOW * 60_000) {
      setTimeError(`Promise time must be at least ${MIN_MINUTES_FROM_NOW} minutes from now.`);
      return;
    }
    const formattedDateTime = `${picked.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${timeString}`;
    onConfirm(timeString, picked.period, formattedDateTime, pickedAt);
  };

  const translateY = drop.interpolate({ inputRange: [0, 1], outputRange: [-(SCREEN_HEIGHT - sheetTop), 0] });

  return (
    <Modal transparent visible={visible} onShow={handleShow} animationType="none" onRequestClose={onClose}>
      <View style={styles.container}>
        {/*
          The sheet is a native modal over the whole screen, header included,
          so the header's back arrow cannot be reached under it. Tapping the
          header area closes the sheet (as Android's back button does).
        */}
        <Pressable
          style={[styles.dismissArea, { height: sheetTop }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View style={[styles.sheetClip, { top: sheetTop }]}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>Promise time</Text>
              <Text style={styles.subtitle}>Add time for when the room will be ready</Text>

              <View style={styles.divider} />

              <View style={styles.quickPicks}>
                {QUICK_PICKS.map((q) => (
                  <TouchableOpacity key={q.label} style={styles.quickPick} onPress={() => chooseIn(q.minutes)} activeOpacity={0.7}>
                    <Text style={styles.quickPickText}>{q.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.wheels}>
                <View pointerEvents="none" style={styles.selectionBand} />
                <Wheel
                  scrollRef={dateRef}
                  items={dateWheelDates()}
                  isSelected={(d) => d.toDateString() === picked.date.toDateString()}
                  label={dayLabel}
                  onPick={(d) => choose({ date: d })}
                  disabled={(d) => isTooSoon({ date: d, hour: 11, minute: 55, period: 'PM' })} flex={1.7} kind="date"
                />
                <Wheel
                  scrollRef={hourRef}
                  items={HOURS}
                  isSelected={(h) => h === picked.hour}
                  label={(h) => String(h)}
                  onPick={(h) => choose({ hour: h })}
                  disabled={(h) => isTooSoon({ hour: h, minute: 55 })}
                />
                <Wheel
                  scrollRef={minuteRef}
                  items={MINUTES}
                  isSelected={(m) => m === picked.minute}
                  label={(m) => m.toString().padStart(2, '0')}
                  onPick={(m) => choose({ minute: m })}
                  disabled={(m) => isTooSoon({ minute: m })}
                />
                <Wheel
                  scrollRef={periodRef}
                  items={PERIODS}
                  isSelected={(p) => p === picked.period}
                  label={(p) => p}
                  onPick={(p) => choose({ period: p })}
                  disabled={(p) => isTooSoon({ period: p, hour: 11, minute: 55 })}
                />
              </View>

              <Text style={styles.readyBy}>
                Ready by <Text style={styles.readyByTime}>{readyBy}</Text>
              </Text>

              {timeError ? (
                <Text style={styles.timeError} accessibilityRole="alert">
                  {timeError}
                </Text>
              ) : null}

              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} activeOpacity={0.8}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

type WheelProps<T> = {
  scrollRef: React.RefObject<ScrollView | null>;
  items: readonly T[];
  isSelected: (item: T) => boolean;
  label: (item: T) => string;
  onPick: (item: T) => void;
  disabled: (item: T) => boolean;
  flex?: number;
  kind?: 'date' | 'number';
};

function Wheel<T>({ scrollRef, items, isSelected, label, onPick, disabled, flex = 1, kind = 'number' }: WheelProps<T>) {
  return (
    <View style={[styles.wheelColumn, { flex }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: WHEEL_PAD }}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => onPick(items[readIndex(e, items.length)])}
        onScrollEndDrag={(e) => {
          // A slow drag that stops without momentum never fires the event above.
          if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) onPick(items[readIndex(e, items.length)]);
        }}
      >
        {items.map((item) => {
          const selected = isSelected(item);
          return (
            <TouchableOpacity key={label(item)} style={styles.wheelItem} onPress={() => onPick(item)}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[
                  kind === 'date' ? styles.dateText : styles.numberText,
                  selected && (kind === 'date' ? styles.dateTextSelected : styles.numberTextSelected),
                  !selected && disabled(item) && styles.disabledText,
                ]}
              >
                {label(item)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const T = RETURN_LATER_MODAL.timePicker;

const styles = StyleSheet.create({
  dismissArea: { position: 'absolute', top: 0, left: 0, right: 0 },
  container: { flex: 1, backgroundColor: 'transparent' },
  /** Clips the sheet at the header's edge while it drops. */
  sheetClip: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  sheet: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 80 * scaleX },
  title: {
    marginTop: 21 * scaleX,
    marginLeft: 24 * scaleX,
    fontSize: 20 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#607aa1',
  },
  /** Figma 1121-825: 15pt, under the title, above the rule. */
  subtitle: {
    marginTop: 6 * scaleX,
    marginHorizontal: 24 * scaleX,
    fontSize: 15 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: '#000000',
  },
  divider: {
    marginTop: 17 * scaleX,
    marginHorizontal: 12 * scaleX,
    height: 1,
    backgroundColor: RETURN_LATER_MODAL.divider.backgroundColor,
  },
  quickPicks: {
    marginTop: 22 * scaleX,
    marginHorizontal: 24 * scaleX,
    flexDirection: 'row',
    gap: 10 * scaleX,
  },
  quickPick: {
    flex: 1,
    height: 39 * scaleX,
    borderRadius: 41 * scaleX,
    borderWidth: 1,
    borderColor: '#5a759d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPickText: { fontSize: 14 * scaleX, fontFamily: 'Helvetica', fontWeight: '400', color: '#334866' },
  wheels: {
    marginTop: 20 * scaleX,
    marginHorizontal: 24 * scaleX,
    height: WHEEL_HEIGHT,
    flexDirection: 'row',
  },
  /** The row the wheels settle on. */
  selectionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: WHEEL_PAD,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: RETURN_LATER_MODAL.divider.backgroundColor,
    backgroundColor: 'rgba(90, 117, 157, 0.06)',
  },
  wheelColumn: { height: '100%' },
  wheelItem: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 * scaleX },
  dateText: { fontSize: 13 * scaleX, fontFamily: 'Helvetica', fontWeight: '400', color: T.unselectedColor },
  dateTextSelected: { fontSize: 16 * scaleX, fontWeight: '700', color: T.selectedColor },
  numberText: {
    fontSize: T.unselectedFontSize * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: T.unselectedFontWeight,
    color: T.unselectedColor,
  },
  numberTextSelected: { fontSize: 22 * scaleX, fontWeight: T.selectedFontWeight, color: T.selectedColor },
  disabledText: { opacity: 0.35 },
  readyBy: {
    marginTop: 20 * scaleX,
    textAlign: 'center',
    fontSize: 15 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: '#1e1e1e',
  },
  readyByTime: { fontWeight: '700', color: '#334866' },
  timeError: { marginTop: 12 * scaleX, textAlign: 'center', fontSize: 14 * scaleX, color: '#f92424' },
  confirmButton: {
    marginTop: 24 * scaleX,
    marginHorizontal: 35 * scaleX,
    height: 70 * scaleX,
    backgroundColor: '#5a759d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: { fontSize: 18 * scaleX, fontFamily: 'Helvetica', fontWeight: '400', color: '#FFFFFF' },
});
