import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View, Text } from 'react-native';
import { RoomStatus, StatusChangeOption, STATUS_OPTIONS, RoomCardData } from '../types/allRooms.types';
import { scaleX } from '../constants/allRoomsStyles';
import { colors, typography } from '@/theme';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { fetchStaffFromSupabase } from '@features/staff/services/staff';
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

/** Which options a reader may pick — see `statusOptionsFor`. */
export type StatusOptionRights = {
  /** Mark / unmark priority — `rooms.rush.toggle`. Room attendants do not. */
  canSetPriority?: boolean;
  /** Mark Inspected — leadership and supervisors, never the attendant who cleaned it. */
  canInspect?: boolean;
};

/** The options this reader sees for a room currently in `currentStatus`. */
export function statusOptionsFor(currentStatus: RoomStatus, rights: StatusOptionRights = {}) {
  const { canSetPriority = true, canInspect = true } = rights;
  return STATUS_OPTIONS.filter((option) => {
    if (option.id === 'Priority' && !canSetPriority) return false;
    if (option.id === 'Inspected' && !canInspect) return false;
    // A status option matching where the room already is would be a no-op.
    if (STATUS_OPTION_IDS.includes(option.id) && option.id === currentStatus) return false;
    return true;
  });
}

/**
 * Design px the status face will take for a given option count — the same
 * breakdown as STATUS_MODAL_HEIGHT (351 = 2 rows of 7 options + the flag row):
 * 48 padding, 40 title, ~92 per row of four, 25 rule + 55 flag row.
 *
 * Drives how far the list scrolls up before the sheet opens below the pill, so
 * an attendant's shorter menu does not lift the card further than it needs.
 */
export function statusSheetHeight(optionCount: number, hasFlagRow: boolean): number {
  const rows = Math.max(1, Math.ceil(optionCount / 4));
  return 48 + 40 + rows * 92 + (hasFlagRow ? 80 : 0);
}

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
  /**
   * Flag or unflag the room. Flagging carries the reason typed under the switch
   * (Figma 406-1783, "Reason/note"); unflagging passes null to clear it.
   */
  onFlagToggle?: (flagged: boolean, reason: string | null, mentionIds: string[]) => void | Promise<void>;
  /** Optional hooks for the checklist's photo and note rows. */
  onAddPhoto?: () => void;
  onAddNotes?: () => void;
  /** Hide options this reader may not use (room attendants: no Priority, no Inspected). */
  canSetPriority?: boolean;
  canInspect?: boolean;
}

/** Which face of the popover is showing. */
type PopoverFace = 'status' | 'cleanChecklist' | 'flag';

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
  canSetPriority = true,
  canInspect = true,
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
  const isFlagEditor = view === 'flag' && !!onFlagToggle;
  const options = statusOptionsFor(currentStatus, { canSetPriority, canInspect });
  const hasFlagRow = !!onFlagToggle;
  /** Rough design-px height of the flag editor, for the lift. */
  const FLAG_EDITOR_HEIGHT = 300;

  return (
    <StatusPopover
      visible={visible}
      onClose={handleClose}
      buttonPosition={buttonPosition}
      headerHeight={headerHeight}
      blurTop={blurTop}
      showTriangle={showTriangle}
      contentHeight={
        isChecklist
          ? CLEAN_CHECKLIST_HEIGHT
          : isFlagEditor
            ? FLAG_EDITOR_HEIGHT
            : statusSheetHeight(options.length, hasFlagRow)
      }
      clampHeight={isChecklist}
      // Always under the status pill, never flipped above it.
      placement="below"
    >
      {(dismiss) => {
        // Saved first, closed after: a failed save keeps the menu open (the
        // screen reports the error) instead of vanishing as if it worked.
        const submitFlag: FlagSubmit = async (flagged, reason, mentionIds) => {
          await onFlagToggle?.(flagged, reason, mentionIds);
          dismiss();
        };
        if (isFlagEditor) {
          return (
            <FlagEditor
              flagged={room.flagged}
              savedReason={room.flagReason ?? ''}
              onBack={() => setView('status')}
              onSubmit={submitFlag}
            />
          );
        }
        return isChecklist ? (
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
              {options.map((option) => (
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

            {/* Flag room row - matches Figma (red flag on a pale circle, red label, toggle).
                Only for readers who may flag (rooms.flag.toggle) — a disabled
                switch they can never use is noise, not information. */}
            {hasFlagRow ? (
              <>
                <View style={styles.divider} />
                <FlagRow
                  flagged={room.flagged}
                  savedReason={room.flagReason ?? ''}
                  onOpenEditor={() => setView('flag')}
                  onSubmit={submitFlag}
                />
              </>
            ) : null}
          </>
        );
      }}
    </StatusPopover>
  );
}

const REASON_MAX = 280;
/** How many staff the @ list offers at once. */
const MENTION_LIMIT = 5;

type Mentionable = { id: string; name: string; subtitle?: string; avatar?: string };

/** The `@query` being typed at the end of the text, or null. Names may contain spaces. */
function activeMention(text: string): { start: number; query: string } | null {
  const at = text.lastIndexOf('@');
  if (at < 0) return null;
  // The @ must start a word, and the query may not run across a line break.
  if (at > 0 && !/\s/.test(text[at - 1])) return null;
  const query = text.slice(at + 1);
  if (query.includes('\n') || query.length > 30) return null;
  return { start: at, query };
}

/** Ids of staff whose "@Full Name" is still in the text. */
function mentionedIds(text: string, staff: readonly Mentionable[]): string[] {
  const lower = text.toLowerCase();
  return staff.filter((m) => lower.includes(`@${m.name.toLowerCase()}`)).map((m) => m.id);
}

/** Saves a flag change and waits; the caller closes the menu on success. */
type FlagSubmit = (flagged: boolean, reason: string | null, mentionIds: string[]) => Promise<void>;

/**
 * The Flag Room row on the status list — Figma 406-1783.
 *
 * Switching it on opens the flag editor (its own face of this menu, like the
 * clean checklist) so the reason box is always fully in view rather than
 * pushed below the fold of a height-capped card. On a flagged room the saved
 * reason shows under the label and tapping the row opens the editor to change
 * it; switching off unflags straight away.
 */
function FlagRow({
  flagged,
  savedReason,
  onOpenEditor,
  onSubmit,
}: {
  flagged: boolean;
  savedReason: string;
  onOpenEditor: () => void;
  onSubmit: FlagSubmit;
}) {
  const [saving, setSaving] = useState(false);

  const toggle = async (next: boolean) => {
    if (next) {
      onOpenEditor();
      return;
    }
    if (!flagged || saving) return;
    setSaving(true);
    try {
      await onSubmit(false, null, []);
    } catch {
      setSaving(false);
    }
  };

  return (
    <Pressable
      style={styles.flagRoomContainer}
      onPress={flagged ? onOpenEditor : undefined}
      disabled={!flagged || saving}
      accessibilityRole={flagged ? 'button' : undefined}
      accessibilityLabel={flagged ? 'Edit flag reason' : undefined}
    >
      <View style={styles.flagIconCircle}>
        <Icon name="action-flag-outline" size={24 * scaleX} color={colors.status.dirty} />
      </View>
      <View style={styles.flagRoomLabel}>
        <Text style={styles.flagRoomText}>Flag Room</Text>
        {flagged && savedReason ? (
          <Text style={styles.flagRoomReason} numberOfLines={1}>
            {savedReason}
          </Text>
        ) : null}
      </View>
      {saving ? (
        <ActivityIndicator color={colors.status.dirty} style={styles.flagRowSpinner} />
      ) : (
        <FlagToggle value={flagged} onValueChange={(next) => void toggle(next)} scaleX={scaleX} />
      )}
    </Pressable>
  );
}

/**
 * The flag editor — Flag Room > Reason/note, Figma 406-1783.
 *
 * The reason box takes focus at once. A send button appears inside it only
 * when there is something to save (a reason, or a change to the saved one);
 * tapping it shows a spinner, saves the flag, the reason and anyone @tagged,
 * and closes the menu once the database confirms. Typing "@" lists staff to
 * tag above the box (so the keyboard cannot hide them); they are notified on
 * save. The chevron goes back to the status list without saving; the switch
 * does the same for a new flag, or unflags a room that already was.
 */
function FlagEditor({
  flagged,
  savedReason,
  onBack,
  onSubmit,
}: {
  flagged: boolean;
  savedReason: string;
  onBack: () => void;
  onSubmit: FlagSubmit;
}) {
  const [reason, setReason] = useState(savedReason);
  const [staff, setStaff] = useState<Mentionable[]>([]);
  const [saving, setSaving] = useState(false);
  const trimmed = reason.trim();
  const canSend = trimmed.length > 0 && (!flagged || trimmed !== savedReason.trim());

  // Staff to tag, loaded once when the editor opens.
  useEffect(() => {
    let cancelled = false;
    fetchStaffFromSupabase()
      .then((list) => {
        if (cancelled) return;
        setStaff(
          list
            .map((m) => ({
              id: m.id,
              name: m.name,
              subtitle: m.role ?? m.department,
              avatar: typeof m.avatar === 'string' ? m.avatar : undefined,
            }))
            .sort((x, y) => x.name.localeCompare(y.name))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const mention = activeMention(reason);
  const suggestions =
    mention && !saving
      ? staff
          .filter((m) => m.name.toLowerCase().includes(mention.query.toLowerCase()))
          .slice(0, MENTION_LIMIT)
      : [];

  const pickMention = (person: Mentionable) => {
    if (!mention) return;
    setReason(`${reason.slice(0, mention.start)}@${person.name} `);
  };

  /** Save and wait; on failure stop the spinner and keep the text as typed. */
  const submit = async (nextFlagged: boolean, nextReason: string | null, ids: string[]) => {
    if (saving) return;
    setSaving(true);
    try {
      await onSubmit(nextFlagged, nextReason, ids);
    } catch {
      setSaving(false);
    }
  };

  const toggle = (next: boolean) => {
    if (next) return;
    if (flagged) void submit(false, null, []); // unflag
    else onBack(); // abandon a new flag
  };

  return (
    <View>
      <View style={styles.editorHeader}>
        <Pressable
          onPress={onBack}
          disabled={saving}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back to status options"
        >
          <Icon name="action-chevron" size={20 * scaleX} color={colors.primary.main} />
        </Pressable>
        <View style={styles.editorTitleRow}>
          <View style={styles.flagIconCircleSmall}>
            <Icon name="action-flag-outline" size={18 * scaleX} color={colors.status.dirty} />
          </View>
          <Text style={styles.editorTitle}>Flag Room</Text>
        </View>
        <FlagToggle value onValueChange={toggle} disabled={saving} scaleX={scaleX} />
      </View>

      <Text style={styles.reasonLabel}>Reason/note</Text>

      {/* Above the box, so the list stays in view over the keyboard. */}
      {suggestions.length > 0 ? (
        <View style={styles.mentionList}>
          {suggestions.map((person, index) => (
            <Pressable
              key={person.id}
              onPress={() => pickMention(person)}
              style={({ pressed }) => [
                styles.mentionRow,
                index > 0 && styles.mentionRowRule,
                pressed && styles.mentionRowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Tag ${person.name}`}
            >
              <Avatar uri={person.avatar} name={person.name} size={28 * scaleX} />
              <View style={styles.mentionText}>
                <Text style={styles.mentionName} numberOfLines={1}>
                  {person.name}
                </Text>
                {person.subtitle ? (
                  <Text style={styles.mentionSubtitle} numberOfLines={1}>
                    {person.subtitle}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.reasonBox}>
        <TextInput
          value={reason}
          onChangeText={setReason}
          editable={!saving}
          placeholder="Why is this room flagged? Type @ to tag staff"
          placeholderTextColor="rgba(0,0,0,0.36)"
          multiline
          maxLength={REASON_MAX}
          textAlignVertical="top"
          autoFocus
          style={[styles.reasonInput, (canSend || saving) && styles.reasonInputWithSend]}
          accessibilityLabel="Reason for flagging the room"
        />
        {canSend || saving ? (
          <Pressable
            onPress={() => void submit(true, trimmed, mentionedIds(trimmed, staff))}
            disabled={saving}
            hitSlop={8}
            style={({ pressed }) => [styles.sendButton, pressed && styles.sendButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel={flagged ? 'Save flag note' : 'Flag room'}
            accessibilityState={{ busy: saving }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="arrow-up" size={18 * scaleX} color="#ffffff" />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Figma 406-1783: "Reason/note" Helvetica bold 15 at x46, the box 358x63 at
  // x45 with a 7% black hairline, its text light 13.
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20 * scaleX,
  },
  editorTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 14 * scaleX,
  },
  flagIconCircleSmall: {
    width: 36 * scaleX,
    height: 36 * scaleX,
    borderRadius: 18 * scaleX,
    backgroundColor: colors.badge.priority,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10 * scaleX,
  },
  editorTitle: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: colors.status.dirty,
  },
  flagRoomLabel: {
    flex: 1,
    minWidth: 0,
    marginRight: 8 * scaleX,
  },
  flagRoomReason: {
    marginTop: 2 * scaleX,
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#1e1e1e',
  },
  flagRowSpinner: {
    width: 78 * scaleX,
  },
  reasonLabel: {
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12 * scaleX,
  },
  reasonBox: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.07)',
  },
  reasonInput: {
    minHeight: 63 * scaleX,
    maxHeight: 120 * scaleX,
    paddingHorizontal: 11 * scaleX,
    paddingTop: 12 * scaleX,
    paddingBottom: 12 * scaleX,
    fontSize: 13 * scaleX,
    lineHeight: 17 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
  },
  /** Keeps text clear of the send button in the bottom-right corner. */
  reasonInputWithSend: {
    paddingRight: 48 * scaleX,
  },
  sendButton: {
    position: 'absolute',
    right: 8 * scaleX,
    bottom: 8 * scaleX,
    width: 32 * scaleX,
    height: 32 * scaleX,
    borderRadius: 16 * scaleX,
    backgroundColor: colors.status.dirty,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
  mentionList: {
    marginBottom: 6 * scaleX,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 9 * scaleX,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  mentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12 * scaleX,
    paddingVertical: 8 * scaleX,
  },
  mentionRowRule: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.11)',
  },
  mentionRowPressed: {
    backgroundColor: 'rgba(90, 117, 157, 0.07)',
  },
  mentionText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10 * scaleX,
  },
  mentionName: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '600',
    color: '#1e1e1e',
  },
  mentionSubtitle: {
    marginTop: 1 * scaleX,
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#6b7a90',
  },
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
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.secondary,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.status.dirty,
    textAlign: 'left',
  },
});
