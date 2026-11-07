import React, { useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text } from '@/tw';
import { SearchAndFilterBar } from '@/components/ui/SearchAndFilterBar';
import { HomeHeader } from '@features/home/components/HomeHeader';
import { colors, typography } from '@/theme';
import type { ShiftType } from '@/types/shift.types';
import { pmSurface } from '@/theme/shiftSurface';
import { RoomsProgressPill } from './RoomsProgressPill';

export type RoomsHeaderProps = {
  name?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
  shift: ShiftType;
  /** Omit to lock the shift (room attendants) — see HomeHeader. */
  onShiftChange?: (shift: ShiftType) => void;
  searchQuery: string;
  onSearch: (text: string) => void;
  onFilterPress?: () => void;
  /** The filter sheet is open — the filter button shows pressed. */
  filterOpen?: boolean;
  /** Filters are applied — a dot on the filter button. */
  filtersApplied?: boolean;
  /** 1 open, 0 collapsed — from `useCollapsingHeader`. */
  progress: SharedValue<number>;
  /** Finished / total assigned. Room attendants only — omit it and no pill is drawn. */
  progressPill?: { finished: number; total: number };
  /** Beside the progress pill — e.g. laundry's "View only" chip. */
  accessory?: React.ReactNode;
  /** Under the pill row — e.g. laundry's linen workload (LinenSummary). */
  summary?: React.ReactNode;
  /** Pinned under the search field, e.g. the active filters. Never collapses. */
  footer?: React.ReactNode;
  /** The gap under the search field while open; 40 by default (Figma 4553:262). Smaller when the list opens with its own spacing. */
  listGap?: number;
};

/** Gaps around the search field, open and collapsed (Figma 4553:262: 40 above and below). */
const SEARCH_GAP_OPEN = 40;
const SEARCH_GAP_TIGHT = 12;
/** Under the field when the pill row follows it. */
const SEARCH_GAP_TO_META = 16;

/**
 * The Rooms tab header — Figma 4553:262.
 *
 * Who you are (the dashboard's own profile band), then the search field, then
 * any context the reader needs: an attendant's progress, laundry's "View
 * only" chip and linen summary. No "Rooms" title: the tab bar already says
 * where you are, and the new frame drops it.
 *
 * Collapses as the list scrolls (`useCollapsingHeader`): the band and the
 * context row fold away, the search field stays pinned under the status bar,
 * and a hairline with a soft shadow separates it from the cards passing
 * beneath. Scrolling up brings everything back.
 */
export function RoomsHeader({
  name,
  role,
  avatarUrl,
  shift,
  onShiftChange,
  searchQuery,
  onSearch,
  onFilterPress,
  filterOpen = false,
  filtersApplied = false,
  progress,
  progressPill,
  accessory,
  summary,
  footer,
  listGap = SEARCH_GAP_OPEN,
}: RoomsHeaderProps) {
  const insets = useSafeAreaInsets();
  const pm = pmSurface(shift);
  const page = pm?.background ?? colors.background.primary;
  const band = colors.background.dashboard;
  const hasMeta = !!progressPill || !!accessory || !!summary;

  // The status bar keeps the band's colour while it is open and turns to the
  // page's once the band has folded away beneath it.
  const statusBarStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [page, band]),
  }));

  const searchStyle = useAnimatedStyle(() => ({
    paddingTop: interpolate(progress.value, [0, 1], [SEARCH_GAP_TIGHT, SEARCH_GAP_OPEN]),
    paddingBottom: interpolate(
      progress.value,
      [0, 1],
      [Math.min(SEARCH_GAP_TIGHT, listGap), hasMeta ? Math.min(SEARCH_GAP_TO_META, listGap) : listGap]
    ),
  }));

  // Lifted over the list only once something can pass beneath it.
  const shadowStyle = useAnimatedStyle(() => {
    const lifted = 1 - progress.value;
    return {
      // interpolateColor, not a template string: near the end of the animation
      // the alpha gets small enough to print as "2.2e-7", which Reanimated
      // rejects as a colour and throws on.
      borderBottomColor: interpolateColor(progress.value, [0, 1], ['rgba(90, 117, 157, 0.18)', 'rgba(90, 117, 157, 0)']),
      shadowOpacity: 0.08 * lifted,
      elevation: Platform.OS === 'android' ? 4 * lifted : 0,
    };
  });

  return (
    <Animated.View style={[styles.root, { backgroundColor: page }, shadowStyle]}>
      <Animated.View style={[{ height: insets.top }, statusBarStyle]} />

      <Collapsible progress={progress} clipTop={insets.top}>
        <HomeHeader name={name} role={role} avatarUrl={avatarUrl} shift={shift} onShiftChange={onShiftChange} />
      </Collapsible>

      {/* Reanimated's View takes no className; the gutter is on the inner one. */}
      <Animated.View style={searchStyle}>
        <View className="px-xl">
          <SearchAndFilterBar
            size="large"
            value={searchQuery}
            onChangeText={onSearch}
            onFilterPress={onFilterPress}
            filterOpen={filterOpen}
            filtersApplied={filtersApplied}
            placeholderLead="Search"
            placeholderRest="Rooms, Guests,Floors etc"
          />
        </View>
      </Animated.View>

      {hasMeta ? (
        <Collapsible progress={progress}>
          <View className="gap-md px-xl pb-lg">
            {progressPill || accessory ? (
              <View className="flex-row items-center gap-md">
                {progressPill ? (
                  <>
                    <Text
                      style={{
                        fontFamily: typography.fontFamily.primary,
                        fontSize: 13,
                        fontWeight: '600',
                        color: pm?.textMuted ?? colors.text.accent,
                      }}
                    >
                      Rooms finished
                    </Text>
                    <RoomsProgressPill finished={progressPill.finished} total={progressPill.total} />
                  </>
                ) : null}
                {accessory}
              </View>
            ) : null}
            {summary}
          </View>
        </Collapsible>
      ) : null}

      {footer}
    </Animated.View>
  );
}

/**
 * Folds its child away as `progress` goes to 0: height and opacity, the
 * child laid out at its natural size inside and clipped.
 *
 * `clipTop` hides that much of the child's top for good — the status-bar
 * padding HomeHeader carries, which the header's own strip stands in for.
 */
function Collapsible({
  progress,
  clipTop = 0,
  children,
}: {
  progress: SharedValue<number>;
  clipTop?: number;
  children: React.ReactNode;
}) {
  const [height, setHeight] = useState(0);
  const style = useAnimatedStyle(() => ({
    // Natural height until measured, so the first frame is never empty.
    ...(height > 0 ? { height: height * progress.value } : null),
    opacity: interpolate(progress.value, [0, 0.6], [0, 1], 'clamp'),
  }));
  return (
    <Animated.View style={[styles.clip, style]}>
      <View
        style={clipTop ? { marginTop: -clipTop } : undefined}
        onLayout={(e) => setHeight(Math.max(0, e.nativeEvent.layout.height - clipTop))}
      >
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    // Above the list, so the shadow falls on the cards.
    zIndex: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: '#1e2a3a',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  clip: {
    overflow: 'hidden',
  },
});

export default RoomsHeader;
