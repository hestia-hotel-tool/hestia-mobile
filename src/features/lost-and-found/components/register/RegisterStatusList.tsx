import React, { type ReactNode, type Ref } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { scaleX } from '../../constants/lostAndFoundStyles';
import { LOST_AND_FOUND_STATUS_MARK } from '../LostAndFoundStatusDisc';
import type { StatusOption } from '../StatusDropdown';
import { StaffAvatar } from '../StaffAvatar';

const s = (n: number) => n * scaleX;

/** Figma 4649:2427 — glyph heights in the 67 x 45.5 pills. */
const OPTIONS: { key: StatusOption; label: string; glyph: number }[] = [
  { key: 'stored', label: 'Stored', glyph: 19 },
  { key: 'shipped', label: 'Shipped', glyph: 17 },
  { key: 'discarded', label: 'Discarded', glyph: 18 },
];

const HINTS: Record<StatusOption, string> = {
  stored: 'HSK Office, Front Office, Warehouse',
  shipped: 'Sent to guest Address',
  discarded: 'Thrown away or Destroyed',
};

export type RegisterStatusListProps = {
  status: StatusOption;
  onChange: (status: StatusOption) => void;
  /** Stored's line: the hotel's storage places. */
  storedHint?: string;
  storedLocationLabel: string;
  storedLocationRef?: Ref<View>;
  onPressStoredLocation: () => void;
  storedBy: { name: string; avatar?: unknown; department?: string };
  /** Line staff store as themselves: no chevron, no picker. */
  storedByLocked: boolean;
  onPressStoredBy: () => void;
  /** The staff picker, shown under the box while Stored by is being changed. */
  storedByPicker?: ReactNode;
};

/**
 * Register step 2's Status — Figma 4649:2427: each status as its pill, name
 * and meaning, a tick on the chosen one. Stored opens a box under it with the
 * Stored Location and who stored it.
 */
export function RegisterStatusList({
  status,
  onChange,
  storedHint,
  storedLocationLabel,
  storedLocationRef,
  onPressStoredLocation,
  storedBy,
  storedByLocked,
  onPressStoredBy,
  storedByPicker,
}: RegisterStatusListProps) {
  return (
    <View>
      {OPTIONS.map((option, index) => {
        const mark = LOST_AND_FOUND_STATUS_MARK[option.key];
        const chosen = status === option.key;
        const afterStoredBox = index > 0 && status === 'stored' && OPTIONS[index - 1].key === 'stored';
        return (
          <React.Fragment key={option.key}>
            <TouchableOpacity
              style={[styles.option, index > 0 && (afterStoredBox ? styles.optionAfterBox : styles.optionNext)]}
              onPress={() => onChange(option.key)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: chosen }}
              accessibilityLabel={`${option.label}. ${HINTS[option.key]}`}
            >
              <View style={[styles.pill, { backgroundColor: mark.tone }]}>
                <Icon name={mark.icon} size={s(option.glyph)} color="#ffffff" />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionHint} numberOfLines={1}>
                  {option.key === 'stored' && storedHint ? storedHint : HINTS[option.key]}
                </Text>
              </View>
              {chosen ? <Icon name="action-check-bold" size={s(14)} color="#5a759d" style={styles.tick} /> : null}
            </TouchableOpacity>

            {option.key === 'stored' && chosen ? (
              <>
                {/* 4649:2732 — 387 x 174, #afa9ad, radius 8; a faint rule between the halves. */}
                <View style={styles.box}>
                  <TouchableOpacity
                    ref={storedLocationRef}
                    style={styles.boxSection}
                    onPress={onPressStoredLocation}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Stored location: ${storedLocationLabel}`}
                  >
                    <Text style={styles.boxLabel}>Stored Location</Text>
                    <View style={styles.boxValueRow}>
                      <Text style={styles.locationValue} numberOfLines={1}>
                        {storedLocationLabel}
                      </Text>
                      <Chevron />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.boxRule} />
                  <TouchableOpacity
                    style={[styles.boxSection, styles.boxSectionLower]}
                    onPress={onPressStoredBy}
                    disabled={storedByLocked}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Stored by: ${storedBy.name}`}
                  >
                    <Text style={styles.boxLabel}>Stored by</Text>
                    <View style={[styles.boxValueRow, styles.personRow]}>
                      <StaffAvatar name={storedBy.name} avatar={storedBy.avatar} size={s(32)} />
                      <View style={styles.personText}>
                        <Text style={styles.personName} numberOfLines={1}>
                          {storedBy.name}
                        </Text>
                        {storedBy.department ? (
                          <Text style={styles.personDepartment} numberOfLines={1}>
                            {storedBy.department}
                          </Text>
                        ) : null}
                      </View>
                      {storedByLocked ? null : <Chevron />}
                    </View>
                  </TouchableOpacity>
                </View>
                {storedByPicker}
              </>
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

/** 4649:2733 — the 7 x 14 chevron turned to point down. */
function Chevron() {
  return (
    <View style={styles.chevron}>
      <View style={{ transform: [{ rotate: '-90deg' }] }}>
        <Icon name="action-chevron" size={s(14)} color="#5a759d" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: s(5),
  },
  /* Pills 78 apart (32.5 between). */
  optionNext: { marginTop: s(32.5) },
  /* The box ends at y=1148; Shipped's pill starts at y=1169. */
  optionAfterBox: { marginTop: s(21) },
  pill: {
    width: s(67),
    height: s(45.5),
    borderRadius: s(22.75),
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Name at x=107, 18 after the pill. */
  optionText: {
    flex: 1,
    marginLeft: s(18),
  },
  /* 4649:2694 — Inter Medium 14. */
  optionLabel: {
    fontSize: s(14),
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '500',
    color: '#000000',
  },
  /* 4664:744 — Helvetica Light 11, 5 under the name, x=109. */
  optionHint: {
    marginTop: s(5),
    marginLeft: s(2),
    fontSize: s(11),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
  },
  /* 4649:2722 — the tick ends at x=375. */
  tick: {
    marginRight: s(33),
  },
  /* x=22, 15 under the Stored pill. */
  box: {
    width: s(387),
    marginTop: s(15),
    marginLeft: s(5),
    borderWidth: 1,
    borderColor: '#afa9ad',
    borderRadius: s(8),
  },
  boxSection: {
    paddingTop: s(13),
    paddingBottom: s(14),
    paddingLeft: s(13),
    paddingRight: s(28),
  },
  boxSectionLower: {
    paddingBottom: s(18),
  },
  /* 4649:2745 — 1 in from each side, #5a759d 9%. */
  boxRule: {
    height: 1,
    backgroundColor: 'rgba(90, 117, 157, 0.09)',
  },
  /* 4649:2730 / 2735 — Inter Light 14. */
  boxLabel: {
    fontSize: s(14),
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '300',
    color: '#000000',
  },
  boxValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: s(8),
  },
  personRow: {
    marginTop: s(12),
    marginLeft: s(1),
  },
  /* 4649:2731 — Regular 16, #5a759d. */
  locationValue: {
    flex: 1,
    fontSize: s(16),
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
  personText: {
    flex: 1,
    marginLeft: s(14),
  },
  personName: {
    fontSize: s(16),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  personDepartment: {
    fontSize: s(14),
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '300',
    color: '#000000',
  },
  chevron: {
    width: s(14),
    height: s(7),
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RegisterStatusList;
