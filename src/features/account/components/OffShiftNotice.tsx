import React from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { typography } from '@/theme';
import type { OffShift } from '../hooks/useShiftLock';

function describeStart(at: Date, now: Date): string {
  const time = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((dayStart(at) - dayStart(now)) / 86_400_000);
  if (days === 0) return `today at ${time}`;
  if (days === 1) return `tomorrow at ${time}`;
  return `${at.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })} at ${time}`;
}

/**
 * Shown to a room attendant in place of the room list when the shift on now is
 * not theirs: which shift this is, and when their next one starts.
 */
export default function OffShiftNotice({ info }: { info: OffShift }) {
  const { width } = useWindowDimensions();
  const s = (n: number) => (n * width) / 440;
  const now = new Date();

  return (
    <View
      style={{ flex: 1, alignItems: 'center', paddingTop: s(64), paddingHorizontal: s(32) }}
      accessible
      accessibilityRole="summary"
    >
      <View
        style={{
          width: s(88),
          height: s(88),
          borderRadius: s(44),
          backgroundColor: '#e4eefe',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: s(20),
        }}
      >
        <Ionicons name={info.shift === 'PM' ? 'moon-outline' : 'sunny-outline'} size={s(40)} color="#5a759d" />
      </View>
      <Text
        style={{
          fontFamily: typography.fontFamily.primary,
          fontWeight: '700',
          fontSize: s(20),
          color: '#334866',
          textAlign: 'center',
        }}
      >
        You have no {info.shift} shift
      </Text>
      <Text
        style={{
          fontFamily: typography.fontFamily.primary,
          fontSize: s(15),
          lineHeight: s(22),
          color: '#607aa1',
          textAlign: 'center',
          marginTop: s(10),
        }}
      >
        {info.next
          ? `Your next shift is ${info.next.shift}, ${describeStart(info.next.startsAt, now)}. Your rooms will appear here then.`
          : 'You have no upcoming shift yet. Check with your supervisor.'}
      </Text>
    </View>
  );
}
