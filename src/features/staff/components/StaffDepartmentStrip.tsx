import React from 'react';
import { ScrollView } from 'react-native';

import { View, Text, Pressable } from '@/tw';
import { Icon } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';
import { departmentIconName, departmentGlyphHeight, type DepartmentRow } from '@/lib/departments';
import { STAFF_LIST_LAYOUT as L } from './staffList/staffListLayout';

/**
 * "Executive and Administration" -> "EA", "IT" -> "IT".
 *
 * Skips the joining words so "Food & Beverage / Kitchen" gives FBK rather than
 * something with an ampersand in it.
 */
function departmentInitials(name: string): string {
  const skip = new Set(['and', 'of', 'the', '&', '/']);
  const words = name
    .split(/[\s/&]+/)
    .map((w) => w.trim())
    .filter((w) => w && !skip.has(w.toLowerCase()));
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 3).map((w) => w[0].toUpperCase()).join('');
}

interface StaffDepartmentStripProps {
  departments: DepartmentRow[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

/**
 * The horizontally scrolling department chips — Figma 3883:6720.
 *
 * The strip is 718 wide against a 440 frame, so it is a scroller by design, and
 * chips are sized by their labels rather than a fixed pitch (the frame's
 * spacing runs 116/131/120/133/140 — label widths, not a grid).
 *
 * **One unselected fill, `#e4eefe`.** The frame draws Concierge and Reception
 * on `#ffebeb`, but those two chips are instances of the *Tickets* department
 * component (node 589-514, whose palette `DEPARTMENT_CHIP` still holds as
 * `#f92424`/`#ffebeb`) pasted into this frame. Two chips out of six differing
 * is a stale paste, not a rule — and normalising is what lets a department the
 * frame never drew get a correct colour automatically.
 */
export default function StaffDepartmentStrip({
  departments,
  activeId,
  onSelect,
}: StaffDepartmentStripProps) {
  const s = (n: number) => n * scaleX;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      /*
       * `flexGrow: 0`, or the strip eats the whole screen.
       *
       * React Native gives `ScrollView` a base style of `flexGrow: 1`. This one
       * is a horizontal scroller inside a vertical content container that also
       * has `flexGrow: 1` (so the empty state can centre), so whenever the
       * roster was short the strip absorbed every spare pixel *vertically* and
       * opened a few hundred points of white space between the chips and the
       * list. It should be exactly as tall as one chip.
       */
      style={{ flexGrow: 0 }}
      contentContainerStyle={{
        paddingHorizontal: s(L.gutter),
        gap: s(L.departments.gap),
        marginTop: s(L.departments.marginTop),
        // Top-align, or a chip whose label wraps to two lines stretches its
        // neighbours and pushes their discs down.
        alignItems: 'flex-start',
      }}
    >
      {departments.map((department) => {
        const isActive = department.id === activeId;
        const iconName = departmentIconName(department.name);

        return (
          <Pressable
            key={department.id}
            onPress={() => onSelect(department.id)}
            className="items-center"
            style={{
              gap: s(L.departments.discToLabel),
              maxWidth: s(L.departments.maxChipWidth),
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={department.name}
          >
            <View
              className={`items-center justify-center overflow-hidden ${
                isActive ? 'bg-ink-accent' : 'bg-surface-header'
              }`}
              style={{
                width: s(L.departments.disc),
                height: s(L.departments.disc),
                borderRadius: s(L.departments.disc / 2),
              }}
            >
              {/*
                `departmentIconName` returns null rather than a wrong glyph —
                "Executive and Administration" has none, and the frame's answer
                to that is a bare disc rather than a borrowed mark.
              */}
              {iconName ? (
                <Icon
                  name={iconName}
                  size={departmentGlyphHeight(iconName) * scaleX}
                  color={isActive ? '#ffffff' : '#5a759d'}
                />
              ) : (
                /*
                  Initials, not an empty circle.
                  
                  `departmentIconName` returns null rather than a wrong glyph,
                  which is the right call — but the frame never drew a
                  department without one, so nothing decided what to put there.
                  "Executive and Administration" has no mark and rendered a bare
                  disc that reads as a failed image. Its initials read as a
                  choice, and any department added later gets the same
                  treatment for free.
                */
                <Text
                  className="font-hestia-primary font-bold"
                  style={{
                    fontSize: s(L.departments.fallbackInitialsFontSize),
                    fontFamily: typography.fontFamily.primary,
                    color: isActive ? '#ffffff' : '#5a759d',
                  }}
                >
                  {departmentInitials(department.name)}
                </Text>
              )}
            </View>
            <Text
              className="text-center font-hestia-primary text-ink-primary"
              numberOfLines={L.departments.labelLines}
              style={{
                fontSize: s(L.departments.labelFontSize),
                fontFamily: typography.fontFamily.primary,
                fontWeight: isActive ? '700' : '300',
              }}
            >
              {department.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
