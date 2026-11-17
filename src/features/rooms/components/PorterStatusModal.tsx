import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@/theme';
import type { IconName } from '@/components/Icon';
import { scaleX } from '../constants/allRoomsStyles';
import StatusOptionItem from './StatusOptionItem';
import StatusPopover, { type PopoverAnchor } from './StatusPopover';
import { statusSheetHeight } from './StatusChangeModal';
import { PORTER_STATUS_UI, porterActionsFor, type PorterAction, type PorterStatus } from '../utils/porter';
import type { RoomCardData } from '../types/allRooms.types';

/** Each porter step drawn as the attendant menu draws its statuses: a 51px circle and its glyph. */
const ACTION_VISUAL: Record<
  PorterAction,
  { label: string; iconName: IconName; glyphHeight: number; circleColor: string; glyphColor?: string }
> = {
  start: { label: 'In Progress', iconName: 'status-vacuum', glyphHeight: 25.4, circleColor: '#f0be1b', glyphColor: '#ffffff' },
  resume: { label: 'Resume', iconName: 'status-vacuum', glyphHeight: 25.4, circleColor: '#f0be1b', glyphColor: '#ffffff' },
  // Two-tone (its own greys), so no tint — the same as the attendant's Pause.
  pause: { label: 'Pause', iconName: 'action-pause-cleaning', glyphHeight: 30, circleColor: '#eef2f3' },
  check: { label: 'Checked', iconName: 'action-check-bold', glyphHeight: 24, circleColor: '#4a91fc', glyphColor: '#ffffff' },
  uncheck: { label: 'UnChecked', iconName: 'status-dirty', glyphHeight: 27.8, circleColor: '#f92424', glyphColor: '#ffffff' },
};

/**
 * The porter's "Change Status" menu — the attendant's menu (StatusChangeModal),
 * same popover, same blur, same grid of circles, anchored under the pill —
 * offering the porter round's next steps instead of cleaning statuses:
 * UnChecked → In Progress / Checked, In Progress → Checked / Pause,
 * Paused → Resume / Checked, Checked → UnChecked (undo).
 */
export default function PorterStatusModal({
  visible,
  onClose,
  room,
  status,
  onSelect,
  buttonPosition,
  headerHeight,
  blurTop,
}: {
  visible: boolean;
  onClose: () => void;
  room: RoomCardData | null;
  status: PorterStatus;
  onSelect: (room: RoomCardData, action: PorterAction) => void;
  buttonPosition?: PopoverAnchor;
  headerHeight?: number;
  blurTop?: number | null;
}) {
  if (!room) return null;
  const options = porterActionsFor(status);

  return (
    <StatusPopover
      visible={visible}
      onClose={onClose}
      buttonPosition={buttonPosition}
      headerHeight={headerHeight}
      blurTop={blurTop}
      contentHeight={statusSheetHeight(options.length, false) + 24}
      placement="below"
    >
      {(dismiss) => (
        <>
          <Text style={styles.headerText}>Change Status</Text>
          <Text style={styles.current}>
            Porter check · <Text style={{ color: PORTER_STATUS_UI[status].color }}>{PORTER_STATUS_UI[status].label}</Text>
          </Text>
          <View style={styles.optionsGrid}>
            {options.map(({ action }) => {
              const v = ACTION_VISUAL[action];
              return (
                <StatusOptionItem
                  key={action}
                  iconName={v.iconName}
                  glyphHeight={v.glyphHeight}
                  circleColor={v.circleColor}
                  glyphColor={v.glyphColor}
                  label={v.label}
                  onPress={() => dismiss(() => onSelect(room, action))}
                />
              );
            })}
          </View>
        </>
      )}
    </StatusPopover>
  );
}

const styles = StyleSheet.create({
  // StatusChangeModal's header, so the two menus read as one.
  headerText: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.primary.light,
    marginBottom: 6 * scaleX,
  },
  current: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.secondary,
    marginBottom: 16 * scaleX,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
});
