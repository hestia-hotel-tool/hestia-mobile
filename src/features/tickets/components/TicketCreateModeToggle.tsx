import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import CreateTicketButton from './CreateTicketButton';

export type TicketCreateMode = 'manual' | 'ai';

const s = (n: number) => n * scaleX;

/**
 * The AI pill at the frame's size: Create Ticket's pill is 152 x 60, this one
 * 94 x 37 (4844:105) — the same drawing at 0.618, which also lands its label
 * at 10 and its AI badge at 18 x 19, 61 / 27 in, as the frame places them.
 */
const AI_PILL_SCALE = 94 / 152;

/**
 * "Manually | Create with AI" — Figma 589:514 (4844:68–4844:119).
 *
 * A #f9f9f9 track (212 x 59, fully rounded). The chosen side sits on a white
 * stadium: "Manually" (Inter SemiBold 14, 87 x 44) or the gradient-outlined
 * "Create with AI" pill.
 */
export function TicketCreateModeToggle({
  mode,
  onChange,
  style,
}: {
  mode: TicketCreateMode;
  onChange: (mode: TicketCreateMode) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.track, style]} accessibilityRole="radiogroup">
      <TouchableOpacity
        style={[styles.manual, mode === 'manual' && styles.chosen]}
        onPress={() => onChange('manual')}
        activeOpacity={0.7}
        accessibilityRole="radio"
        accessibilityState={{ selected: mode === 'manual' }}
      >
        <Text style={styles.manualText}>Manually</Text>
      </TouchableOpacity>

      <View style={[styles.aiSlot, mode === 'ai' && styles.chosen]}>
        <CreateTicketButton
          label="Create with"
          scaleX={scaleX * AI_PILL_SCALE}
          onPress={() => onChange('ai')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* 4844:68 — #f9f9f9, 212 x 59 at x=15. */
  track: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    width: s(212),
    height: s(59),
    borderRadius: s(48),
    backgroundColor: '#f9f9f9',
    paddingLeft: s(9),
  },
  /* 4844:71 — white, 87 x 44.2, 5.8 down. */
  manual: {
    width: s(87),
    height: s(44.2),
    marginTop: s(5.8),
    borderRadius: s(48),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chosen: {
    backgroundColor: '#ffffff',
  },
  /* 4844:119 — Inter SemiBold 14. */
  manualText: {
    fontSize: s(14),
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '600',
    color: '#000000',
  },
  /* 4844:105 — the pill at x=124 (13 after "Manually"), 11 down. */
  aiSlot: {
    marginLeft: s(13),
    marginTop: s(11),
    height: s(37),
    borderRadius: s(48),
  },
});

export default TicketCreateModeToggle;
