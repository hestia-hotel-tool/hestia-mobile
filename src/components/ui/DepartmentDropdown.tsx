import React, { useState } from 'react';
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { View, Text, Pressable } from '@/tw';
import { Icon } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';
import { departmentIconName, departmentGlyphHeight } from '@/lib/departments';

const s = (n: number) => n * scaleX;

/** "In Room Dining" -> "IRD", "IT" -> "IT" — for a department with no registry glyph. */
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

/**
 * Disc colours. `blue`: Staff (3240:561) — the chosen one filled #5a759d, the
 * list pale blue. `red`: Create Ticket (589:514, 4649:277) — always the pale
 * #ffebeb disc with the red mark, as the ticket departments are drawn.
 */
export type DepartmentDropdownTone = 'blue' | 'red';
const TONE: Record<DepartmentDropdownTone, { chosen: { bg: string; ink: string }; option: { bg: string; ink: string } }> = {
  blue: { chosen: { bg: '#5a759d', ink: '#ffffff' }, option: { bg: '#e4eefe', ink: '#5a759d' } },
  red: { chosen: { bg: '#ffebeb', ink: '#f92424' }, option: { bg: '#ffebeb', ink: '#f92424' } },
};

/** The department's mark on its disc: the registry glyph, or its initials. */
function DepartmentDisc({ name, size, colors }: { name: string; size: number; colors: { bg: string; ink: string } }) {
  const iconName = departmentIconName(name);
  return (
    <View
      className="items-center justify-center overflow-hidden"
      style={{ width: s(size), height: s(size), borderRadius: s(size / 2), backgroundColor: colors.bg }}
    >
      {iconName ? (
        <Icon name={iconName} size={departmentGlyphHeight(iconName) * scaleX * (size / 55.482)} color={colors.ink} />
      ) : (
        <Text style={{ fontSize: s(size * 0.32), fontFamily: typography.fontFamily.primary, fontWeight: '700', color: colors.ink }}>
          {departmentInitials(name)}
        </Text>
      )}
    </View>
  );
}

export interface DepartmentDropdownProps {
  departments: readonly { id: string; name: string }[];
  activeId: string | null;
  onSelect: (id: string) => void;
  tone?: DepartmentDropdownTone;
  /** The wrapper's placement (margins); the box itself is the frame's 83 tall. */
  style?: StyleProp<ViewStyle>;
  /** Box height: 83 on Staff, 70 on Create Ticket. */
  height?: number;
}

/**
 * A department picker — Staff (Figma 3240:561, 4761:1970) and Create Ticket
 * (589:514, 4649:239): a 387-wide box, #e1e1e1, radius 8, with the chosen
 * department's disc (55.5), its name in Inter Light 14 and the wide chevron.
 * Open, the other departments list under it, pushing what follows down.
 */
export function DepartmentDropdown({
  departments,
  activeId,
  onSelect,
  tone = 'blue',
  style,
  height = 83,
}: DepartmentDropdownProps) {
  const colors = TONE[tone];
  const [open, setOpen] = useState(false);
  const active = departments.find((d) => d.id === activeId) ?? null;
  const others = departments.filter((d) => d.id !== activeId);

  return (
    <View style={style}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        disabled={departments.length === 0}
        accessibilityRole="button"
        accessibilityLabel={`Department: ${active?.name ?? 'none'}`}
        accessibilityState={{ expanded: open }}
        className="flex-row items-center bg-surface-primary"
        style={[styles.box, { height: s(height) }]}
      >
        {active ? <DepartmentDisc name={active.name} size={55.482} colors={colors.chosen} /> : <View style={{ width: s(55.482) }} />}
        <Text style={styles.name} numberOfLines={1}>
          {active?.name ?? 'No departments'}
        </Text>
        <Icon
          name="action-chevron-down-wide"
          width={s(21)}
          height={s(9.88)}
          color="#5a759d"
          style={open ? { transform: [{ rotate: '180deg' }] } : undefined}
        />
      </Pressable>

      {open && others.length > 0 ? (
        <View style={styles.list}>
          {others.map((department, index) => (
            <Pressable
              key={department.id}
              onPress={() => {
                setOpen(false);
                onSelect(department.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={department.name}
              className="flex-row items-center"
              style={[styles.option, index > 0 && styles.optionRule]}
            >
              <DepartmentDisc name={department.name} size={40} colors={colors.option} />
              <Text style={styles.optionName} numberOfLines={1}>
                {department.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const androidText = Platform.select({ android: { includeFontPadding: false } as const, default: {} as const });

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: s(8),
    paddingLeft: s(8.5),
    paddingRight: s(30),
  },
  /* 4761:1976 — Inter Light 14, 10 after the disc. */
  name: {
    flex: 1,
    marginLeft: s(10),
    fontSize: s(14),
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '300',
    color: '#000000',
    ...androidText,
  },
  list: {
    marginTop: s(6),
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: s(8),
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  option: {
    height: s(60),
    paddingLeft: s(16),
    paddingRight: s(16),
  },
  optionRule: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e1e1e1',
  },
  optionName: {
    flex: 1,
    marginLeft: s(17.5),
    fontSize: s(14),
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '300',
    color: '#000000',
    ...androidText,
  },
});

export default DepartmentDropdown;
