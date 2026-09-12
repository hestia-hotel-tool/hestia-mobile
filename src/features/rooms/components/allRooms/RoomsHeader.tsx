import React from 'react';
import { View, Text } from '@/tw';
import { SearchAndFilterBar } from '@/components';
import { HomeHeader } from '@features/home';
import type { ShiftType } from '@/types/shift.types';
import { RoomsProgressPill } from './RoomsProgressPill';

export type RoomsHeaderProps = {
  name?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
  shift: ShiftType;
  onShiftChange: (shift: ShiftType) => void;
  searchQuery: string;
  onSearch: (text: string) => void;
  onFilterPress?: () => void;
  /**
   * Finished / total assigned, shown beside the title. Room attendants only —
   * omit it and no pill is drawn.
   */
  progress?: { finished: number; total: number };
  /**
   * Drop the "Rooms" title while an anchored overlay is open.
   *
   * Unmounted, not just made invisible: hiding it with `opacity` left its row
   * holding a band of empty white, which is not what the frame shows. The list
   * reflows upward as a result, so `AllRoomsScreen` sets this *before* it
   * measures the pill the popover points at — see `pendingStatusRoom`.
   */
  titleHidden?: boolean;
};

/**
 * The Rooms tab header — Figma 3883:5570 (HSK Executive) and 3838:1117
 * (Supervisor), which are the same screen bar the profile text.
 *
 * Who you are, then what you are searching, then the section title. Notably
 * *not* what the old `AllRoomsHeader` drew: there is no back arrow (this is a
 * tab, not a pushed screen) and no "All Rooms" heading. The title is the word
 * "Rooms", and it sits below the search field rather than up in the band.
 *
 * The profile band is `HomeHeader` unchanged — nodes 3883:5749 + 3883:5758 are
 * pixel-for-pixel the dashboard's own header, down to the 51px avatar, the
 * 17px light name and the 121px AM/PM toggle. Rebuilding it here would have
 * meant maintaining the same band twice.
 *
 * Everything is in the flex flow. The header it replaces was
 * `position: absolute` with a fixed `height: 217`, which the list paid for with
 * a matching `paddingTop` — a number repeated in four places and wrong on any
 * device whose safe area differs from the designer's.
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
  progress,
  titleHidden = false,
}: RoomsHeaderProps) {
  return (
    <View>
      <HomeHeader
        name={name}
        role={role}
        avatarUrl={avatarUrl}
        shift={shift}
        onShiftChange={onShiftChange}
      />

      {/* The design leaves 41px under the band before the field, and again
          before the title — `4xl` is the 40px token, the nearest one. */}
      {/* Without the title the search field would butt straight into the list,
          so its row donates the bottom gap — the frame leaves ~32px under the
          field either way (406-1783: field ends y=220, content starts y=253). */}
      <View className={`px-xl pt-4xl ${titleHidden ? 'pb-3xl' : ''}`}>
        <SearchAndFilterBar
          size="large"
          value={searchQuery}
          onChangeText={onSearch}
          onFilterPress={onFilterPress}
          placeholderLead="Search"
          placeholderRest="Rooms, Guests,Floors etc"
        />

        {!titleHidden && (
          // Half the frame's spacing: it leaves 41px above the title and 32
          // below, which is a lot of air on a 402pt screen. `xl`/`lg` are the
          // 20 and 16 tokens.
          <View className="flex-row items-center gap-md pb-lg pt-xl">
            {/* Node 3883:5764 sits at x=34 while the field starts at 20. */}
            <Text className="pl-[14px] font-hestia-primary text-hestia-4xl font-bold text-ink-primary">
              Rooms
            </Text>
            {progress && <RoomsProgressPill finished={progress.finished} total={progress.total} />}
          </View>
        )}
      </View>
    </View>
  );
}

export default RoomsHeader;
