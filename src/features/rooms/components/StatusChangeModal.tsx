import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { RoomStatus, StatusChangeOption, STATUS_OPTIONS, RoomCardData } from '../types/allRooms.types';
import { scaleX } from '../constants/allRoomsStyles';
import { colors, typography } from '@/theme';
import { Icon } from '@/components/Icon';
import StatusOptionItem from './StatusOptionItem';
import FlagToggle from './FlagToggle';
import StatusPopover, { type PopoverAnchor } from './StatusPopover';
import RoomChecklistPanel, { type ChecklistItem } from './RoomChecklistPanel';

export {
  STATUS_MODAL_WIDTH,
  STATUS_MODAL_LEFT,
  STATUS_MODAL_SPACING,
} from './StatusPopover';

/** Option ids that map to a single room status; hide the one that matches currentStatus */
const STATUS_OPTION_IDS: StatusChangeOption[] = ['Dirty', 'InProgress', 'Cleaned', 'Inspected'];

/**
 * How tall the status sheet actually renders, in design px.
 *
 * This is a *placement* estimate, not a size — the card is content-sized. It
 * decides whether the popover opens below the pill or flips above it, and
 * AllRoomsScreen imports it to work out how far to scroll. Both go wrong if it
 * lies, so it is measured from the running app rather than taken from the file:
 * 321pt on a 402pt-wide device is 351 design px.
 *
 * The frame draws 430 (path y=83.57 to y=513.57 — the 443.473 this used to be
 * was the `Union` bbox, which includes the tail). Ours is shorter because the
 * internal rhythm is tighter than the design's: the frame spaces its rows ~29px
 * apart against our 16, and pads 33.5/34.5 top and bottom against our 24.
 * Adopting those would land back on ~430, but it also makes the sheet 79px
 * taller, which on this screen leaves too little room for the card it points
 * at.
 */
export const STATUS_MODAL_HEIGHT = 351;

/**
 * Roughly how tall the clean checklist stands — Figma 2584:1276 draws 678.968
 * for four items; the clean list has two.
 *
 * Only used to choose between opening below the button and flipping above it.
 * The card is clamped to the room actually available and scrolls inside it, so
 * this being a little out costs nothing.
 */
const CLEAN_CHECKLIST_HEIGHT = 520;

/**
 * A room cannot be marked clean on the attendant's word alone — these have to
 * be confirmed first. Figma 2584:1276 shows the inspection list; the cleaning
 * list is the shorter one the product already defined.
 */
const CLEAN_CHECKLIST_ITEMS: readonly ChecklistItem[] = [
  {
    id: 'curtains',
    iconName: 'checklist-curtains',
    label: 'Curtains/blinds properly arranged',
  },
  {
    id: 'minibar',
    iconName: 'checklist-minibar',
    label: 'Items in the mini bar checked and replaced',
  },
];

interface StatusChangeModalProps {
  visible: boolean;
  onClose: () => void;
  onStatusSelect: (status: StatusChangeOption) => void;
  /** When provided and user selects Inspected, this is called instead of onStatusSelect. Use to show Inspection Checklist slide. */
  onInspectedSelect?: () => void;
  currentStatus: RoomStatus;
  room?: RoomCardData; // Room data
  buttonPosition?: PopoverAnchor; // Status button position on screen
  showTriangle?: boolean; // Whether to show the triangle pointer (default: true)
  headerHeight?: number; // Header height in design pixels (default: 232, use 217 for AllRoomsScreen)
  /**
   * Window y in real px where the blur starts — pass the tapped card's measured
   * bottom to keep that card sharp, per Figma 406-1783. Forwarded untouched.
   */
  blurTop?: number | null;
  /** When provided, shows the Flag room row and calls this when the user toggles it */
  onFlagToggle?: (flagged: boolean) => void;
  /** Optional hooks for the checklist's photo and note rows. */
  onAddPhoto?: () => void;
  onAddNotes?: () => void;
}

/** Which face of the popover is showing. */
type PopoverFace = 'status' | 'cleanChecklist';

export default function StatusChangeModal({
  visible,
  onClose,
  onStatusSelect,
  onInspectedSelect,
  currentStatus,
  room,
  buttonPosition,
  showTriangle = true,
  headerHeight = 232,
  blurTop,
  onFlagToggle,
  onAddPhoto,
  onAddNotes,
}: StatusChangeModalProps) {
  /*
   * Choosing "Cleaned" turns this card into the clean checklist rather than
   * handing off to a second modal. The old flow closed this popover and opened
   * another one that redrew the same blur, tail and anchoring maths from its own
   * copy — so the card visibly blinked, and the two copies had already drifted
   * apart on tail shape, margin and spacing.
   */
  const [view, setView] = useState<PopoverFace>('status');

  /*
   * Always reopen on the status list, whatever the last visit ended on.
   *
   * Done on the way out rather than in an effect watching `visible`: every exit
   * the popover has — a status chosen, the slider pulled, the backdrop tapped,
   * the back button — runs through `onClose`, so this is the one place it needs
   * to happen, and it avoids a setState that would cascade a render on open.
   */
  const handleClose = () => {
    setView('status');
    onClose();
  };

  if (!room) return null;

  const isChecklist = view === 'cleanChecklist';

  return (
    <StatusPopover
      visible={visible}
      onClose={handleClose}
      buttonPosition={buttonPosition}
      headerHeight={headerHeight}
      blurTop={blurTop}
      showTriangle={showTriangle}
      contentHeight={isChecklist ? CLEAN_CHECKLIST_HEIGHT : STATUS_MODAL_HEIGHT}
      clampHeight={isChecklist}
    >
      {(dismiss) =>
        isChecklist ? (
          <RoomChecklistPanel
            title="Clean Checklist"
            accentColor={colors.status.cleaned}
            items={CLEAN_CHECKLIST_ITEMS}
            onComplete={() => dismiss(() => onStatusSelect('Cleaned'))}
            onAddPhoto={onAddPhoto}
            onAddNotes={onAddNotes}
          />
        ) : (
          <>
            <Text style={styles.headerText}>Change Status</Text>

            <View style={styles.optionsGrid}>
              {STATUS_OPTIONS.filter((option) => {
                if (!STATUS_OPTION_IDS.includes(option.id)) return true;
                return option.id !== currentStatus;
              }).map((option) => (
                <StatusOptionItem
                  key={option.id}
                  iconName={option.iconName}
                  glyphHeight={option.glyphHeight}
                  circleColor={option.circleColor}
                  glyphColor={option.glyphColor}
                  label={option.label}
                  onPress={() => {
                    // Cleaned swaps this card over to the checklist; the status
                    // only changes once the slider is pulled.
                    if (option.id === 'Cleaned') {
                      setView('cleanChecklist');
                      return;
                    }
                    if (option.id === 'Inspected' && onInspectedSelect) {
                      dismiss(onInspectedSelect);
                      return;
                    }
                    dismiss(() => onStatusSelect(option.id));
                  }}
                />
              ))}
            </View>

            <View style={styles.divider} />

            {/* Flag room row - matches Figma (red flag on a pale circle, red label, toggle) */}
            <View style={styles.flagRoomContainer}>
              <View style={styles.flagIconCircle}>
                <Icon name="action-flag-outline" size={24 * scaleX} color={colors.status.dirty} />
              </View>
              <Text style={styles.flagRoomText}>Flag Room</Text>
              <FlagToggle
                value={room.flagged}
                onValueChange={(next) => dismiss(() => onFlagToggle?.(next))}
                disabled={!onFlagToggle}
                scaleX={scaleX}
              />
            </View>
          </>
        )
      }
    </StatusPopover>
  );
}

const styles = StyleSheet.create({
  headerText: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.primary.light,
    marginBottom: 16 * scaleX,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(90, 117, 157, 0.35)', // Figma draws a 0.2px #5A759D rule
    marginTop: 8 * scaleX,
    marginBottom: 16 * scaleX,
    width: '100%',
  },
  flagRoomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4 * scaleX,
  },
  flagIconCircle: {
    width: 51.007 * scaleX,
    height: 51.007 * scaleX,
    borderRadius: (51.007 / 2) * scaleX,
    backgroundColor: colors.badge.priority,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12 * scaleX,
  },
  flagRoomText: {
    flex: 1,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.secondary,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.status.dirty,
    textAlign: 'left',
  },
});
