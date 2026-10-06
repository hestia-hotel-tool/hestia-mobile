import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MAX_PHOTOS, pickPhotos } from '@/components/media/photoPicker';
import { KeyboardDoneBar, KEYBOARD_DONE_BAR_ID } from '@/components/ui/KeyboardDoneBar';
import { CLEANING_NOTE_MAX, type CleaningReport } from '../services/cleaningReports';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '@/theme';
import { Icon, type IconName } from '@/components/Icon';
import { scaleX } from '../constants/allRoomsStyles';
import { STATUS_MODAL_WIDTH } from './StatusPopover';

/**
 * Figma 1772-255 (the Clean Checklist, node 2702:2572), measured from the
 * card's top-left; the popover pads its content 24.
 *
 * - Title at x22, 34 below the card's body top; no rule under it.
 * - Rows 71 apart: a 42 #f4f4f4 disc at x19, the label at x79 (18 after the
 *   disc), a 28 square checkbox ending 49 from the card's right edge.
 * - A full-width rule 36 below the last disc, "Optional" 18 under it, then the
 *   Add Photo / Add Notes rows 62 apart, and the slider 51 below them.
 */
const ICON_CIRCLE = 42;
const ICON_GAP = 18;
const CHECKBOX = 28;
/** Right inset of the optional rows' count and the note box (the checkboxes' edge). */
const CHECKBOX_INSET = 25;
/** The disc starts at x19, 5 left of the popover's padding. */
const ROW_OUTDENT = 5;
/** The popover's content padding (StatusPopover), which the rule runs through. */
const CARD_PADDING = 24;

/**
 * Where the two checklists differ — Clean (Figma 1772-255) and Inspection
 * (Figma 2702-1025). The rest (insets, the Optional block, the slider) is
 * shared.
 */
const LAYOUTS = {
  clean: {
    /** No rule under the title; the first disc 51 below it. */
    titleRule: false,
    titleToRows: 51,
    titleToRule: 0,
    ruleToRows: 0,
    /** Rows 71 apart: the 42 disc and 29. */
    rowGap: 29,
    lastRowToRule: 36,
    /** 49 from the card's edge, less the popover's 24. */
    checkboxInset: 25,
    slideLabelLeft: 107,
  },
  inspection: {
    /** 2702:1139: a rule 17 under the title, the first disc 24 below it. */
    titleRule: true,
    titleToRows: 0,
    titleToRule: 17,
    ruleToRows: 24,
    /** 2702:1160–1163: discs 63 to 71 apart; 67 splits them. */
    rowGap: 25,
    lastRowToRule: 23,
    /** 47 from the card's edge. */
    checkboxInset: 23,
    slideLabelLeft: 94,
  },
} as const;

export type ChecklistVariant = keyof typeof LAYOUTS;

/** Track 286x68 at radius 56 — node 2584:1781. */
const TRACK_WIDTH = 286;
const TRACK_HEIGHT = 68;
const THUMB = 60;
/** 2702:2600 sits 7 in from the track's ends (and 4 from its top and bottom). */
const THUMB_INSET = 7;
/** Pulled this far along the track, the gesture counts as a commit. */
const COMPLETE_THRESHOLD = 0.85;

export type ChecklistItem = {
  id: string;
  iconName: IconName;
  label: string;
};

export type RoomChecklistPanelProps = {
  /** e.g. "Clean Checklist" — node 2584:1761. */
  title: string;
  /** Colours the title. The design gives each status its own. */
  accentColor: string;
  items: readonly ChecklistItem[];
  /**
   * Every box ticked and the slider pulled to the end, with what was
   * confirmed: the ticks, and the optional photos and note taken here.
   */
  onComplete: (report: CleaningReport) => void;
  /** The mark on the slider's thumb: the status being confirmed (Figma 4378:329). */
  thumbIcon?: IconName;
  /** Which frame's spacing to follow. */
  variant?: ChecklistVariant;
  /**
   * The inspection can fail: a "Send back to Dirty" link under the slider.
   * Not in the frame, kept so a failed room needs no detour through the menu.
   */
  onReject?: () => void;
};

/**
 * A room checklist, drawn inside the status popover — Figma node 2584:1276.
 *
 * Title, a rule, one row per item (icon, label, checkbox), then the optional
 * photo and note rows and the slide-to-commit control. The slider stays inert
 * until every box is ticked: that is the whole point of the screen — the status
 * cannot change until the work is confirmed.
 */
export default function RoomChecklistPanel({
  title,
  accentColor,
  items,
  onComplete,
  thumbIcon = 'status-clean',
  variant = 'clean',
  onReject,
}: RoomChecklistPanelProps) {
  const L = LAYOUTS[variant];
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  /*
   * Photos and the note live here, in the panel, until the slide: leaving it
   * for another screen would close the popover and lose the ticks.
   */
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState('');
  /** The note is written in its own face of the card, at its top, clear of the keyboard. */
  const [editingNote, setEditingNote] = useState(false);

  // The slider's gesture handler outlives renders; it reads the latest report here.
  const reportRef = useRef<CleaningReport>({ checklist: [], note: null, photoUris: [] });
  useEffect(() => {
    reportRef.current = {
      checklist: items.map((item) => ({ id: item.id, label: item.label, checked: !!checked[item.id] })),
      note: note.trim() || null,
      photoUris: photos,
    };
  }, [items, checked, note, photos]);

  const addPhotos = async (source: 'camera' | 'library') => {
    const result = await pickPhotos(source, MAX_PHOTOS - photos.length);
    if ('error' in result) {
      Alert.alert('Photo not added', result.error);
      return;
    }
    if (result.uris.length) setPhotos((prev) => [...prev, ...result.uris].slice(0, MAX_PHOTOS));
  };

  const choosePhotoSource = () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Photo not added', `You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }
    Alert.alert('Add photo', undefined, [
      { text: 'Take photo', onPress: () => void addPhotos('camera') },
      { text: 'Choose from library', onPress: () => void addPhotos('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const thumbPosition = useRef(new Animated.Value(0)).current;
  const isCompletingRef = useRef(false);

  const allChecked = items.every((item) => checked[item.id]);
  const trackTravel = (TRACK_WIDTH - THUMB - THUMB_INSET * 2) * scaleX;

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => allChecked,
        onMoveShouldSetPanResponder: () => allChecked,
        onPanResponderMove: (_, gesture) => {
          if (!allChecked) return;
          thumbPosition.setValue(Math.max(0, Math.min(gesture.dx, trackTravel)));
        },
        onPanResponderRelease: (_, gesture) => {
          if (!allChecked) return;
          const x = Math.max(0, Math.min(gesture.dx, trackTravel));
          if (x >= trackTravel * COMPLETE_THRESHOLD) {
            if (isCompletingRef.current) return;
            isCompletingRef.current = true;
            Animated.timing(thumbPosition, {
              toValue: trackTravel,
              duration: 150,
              useNativeDriver: true,
            }).start(() => onComplete(reportRef.current));
          } else {
            Animated.spring(thumbPosition, {
              toValue: 0,
              useNativeDriver: true,
              tension: 80,
              friction: 10,
            }).start();
          }
        },
      }),
    [allChecked, trackTravel, thumbPosition, onComplete]
  );

  if (editingNote) {
    return (
      <View style={styles.root}>
        <View style={styles.noteHeader}>
          <Pressable
            onPress={() => setEditingNote(false)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back to the checklist"
          >
            <Icon name="action-chevron" size={20 * scaleX} color={accentColor} />
          </Pressable>
          <Text style={[styles.noteTitle, { color: accentColor }]}>Add Notes</Text>
        </View>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Anything the supervisor should know about this room"
          placeholderTextColor="#9aa4b2"
          multiline
          autoFocus
          maxLength={CLEANING_NOTE_MAX}
          style={styles.noteInput}
          inputAccessoryViewID={KEYBOARD_DONE_BAR_ID}
          accessibilityLabel="Note"
        />
        <KeyboardDoneBar />
        <Text style={styles.noteCount}>
          {note.length}/{CLEANING_NOTE_MAX}
        </Text>
        <Pressable
          onPress={() => setEditingNote(false)}
          style={({ pressed }) => [styles.noteDone, { backgroundColor: accentColor }, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          <Text style={styles.noteDoneText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={[styles.title, { color: accentColor, marginBottom: (L.titleRule ? L.titleToRule : L.titleToRows) * scaleX }]}>
        {title}
      </Text>
      {L.titleRule ? <View style={[styles.rule, { marginTop: 0, marginBottom: L.ruleToRows * scaleX }]} /> : null}

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => {
          const isChecked = !!checked[item.id];
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.row, { marginBottom: L.rowGap * scaleX, paddingRight: L.checkboxInset * scaleX }]}
              onPress={() => toggle(item.id)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isChecked }}
              accessibilityLabel={item.label}
            >
              <View style={styles.iconCircle}>
                <Icon name={item.iconName} size={20 * scaleX} color={colors.primary.main} />
              </View>
              <Text style={styles.rowLabel}>{item.label}</Text>
              {/* 2702:2589 / 2702:2590: a square in the accent, 2 wide, and
                  once ticked a 12x10 check in it, 3 wide. */}
              <View style={[styles.checkbox, { borderColor: accentColor }]}>
                {isChecked ? <Icon name="action-check-bold" size={13 * scaleX} color={accentColor} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={[styles.rule, { marginTop: (L.lastRowToRule - L.rowGap) * scaleX }]} />
        <Text style={styles.optionalCaption}>Optional</Text>

        <TouchableOpacity
          style={styles.optionalRow}
          onPress={choosePhotoSource}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityHint="Take a photo or choose one from your library"
        >
          <View style={styles.optionalIcon}>
            <Icon name="action-add-photo" size={29 * scaleX} />
          </View>
          <Text style={styles.optionalLabel}>Add Photo</Text>
          {photos.length > 0 && <CountBadge count={photos.length} />}
        </TouchableOpacity>

        {photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbStrip}
            contentContainerStyle={styles.thumbStripContent}
          >
            {photos.map((uri, index) => (
              <View key={uri} style={styles.thumbWrap}>
                <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                <Pressable
                  onPress={() => setPhotos((prev) => prev.filter((u) => u !== uri))}
                  hitSlop={8}
                  style={styles.thumbRemove}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${index + 1}`}
                >
                  <Ionicons name="close" size={11 * scaleX} color="#ffffff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity
          style={styles.optionalRow}
          onPress={() => setEditingNote(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={note.trim() ? `Note: ${note.trim()}. Edit` : 'Add Notes'}
        >
          <View style={styles.optionalIcon}>
            <Icon name="action-add-note" size={21.6 * scaleX} color={colors.primary.main} />
          </View>
          <View style={styles.optionalText}>
            <Text style={styles.optionalLabel}>Add Notes</Text>
            {!!note.trim() && (
              <Text style={styles.notePreview} numberOfLines={1}>
                {note.trim()}
              </Text>
            )}
          </View>
          {!!note.trim() && <CountBadge count={1} />}
        </TouchableOpacity>

      </ScrollView>

      {/* Slide to complete — node 2701:336 */}
      <View style={styles.slideSection}>
        <LinearGradient
          // Node 2584:1781 — a near-flat wash from #f6f6f6 to #ebebeb.
          colors={['#f6f6f6', '#ebebeb']}
          locations={[0.559, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.track, !allChecked && styles.trackDisabled]}
        >
          <Text style={[styles.slideLabel, { left: L.slideLabelLeft * scaleX }]}>Slide to complete</Text>
          <Animated.View
            style={[styles.thumb, { backgroundColor: accentColor, transform: [{ translateX: thumbPosition }] }]}
            accessibilityRole="adjustable"
            accessibilityLabel="Slide to complete"
            accessibilityState={{ disabled: !allChecked }}
            {...panResponder.panHandlers}
          >
            {/* 4378:329: the status's own mark, white on its colour. */}
            <Icon name={thumbIcon} size={31 * scaleX} color="#ffffff" />
          </Animated.View>
        </LinearGradient>
        {onReject ? (
          <Pressable
            onPress={onReject}
            hitSlop={10}
            style={({ pressed }) => [styles.rejectLink, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityHint="Fails the inspection: the room goes back to Dirty and the attendant is told"
          >
            <Text style={styles.rejectText}>Send back to Dirty</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Node 2584:1265 — the pink count on an optional row: photos added, or a note written. */
function CountBadge({ count }: { count: number }) {
  return (
    <View style={styles.noteBadge}>
      <Text style={styles.noteBadgeText}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    flexShrink: 1,
  },
  /** 2702:2579 — Helvetica bold 20, in the status colour. */
  title: {
    marginTop: 10 * scaleX,
    marginLeft: -2 * scaleX,
    marginBottom: 51 * scaleX,
    fontSize: 20 * scaleX,
    lineHeight: 23 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
  },
  /** 2702:2581 — the full card width, #5a759d at 0.2. */
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(90, 117, 157, 0.5)',
    marginBottom: 18 * scaleX,
    marginHorizontal: -CARD_PADDING * scaleX,
  },
  /*
   * Runs the card's full width, with the padding inside it: a ScrollView
   * clips what it holds, and the discs sit 5 past the padding (x19) and the
   * rule runs edge to edge.
   */
  scrollArea: {
    flexGrow: 0,
    flexShrink: 1,
    marginHorizontal: -CARD_PADDING * scaleX,
  },
  scrollContent: {
    paddingHorizontal: CARD_PADDING * scaleX,
    paddingBottom: 4 * scaleX,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -ROW_OUTDENT * scaleX,
  },
  iconCircle: {
    width: ICON_CIRCLE * scaleX,
    height: ICON_CIRCLE * scaleX,
    borderRadius: (ICON_CIRCLE / 2) * scaleX,
    backgroundColor: '#f4f4f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ICON_GAP * scaleX,
  },
  /** 2702:2596 — Helvetica 15, black. */
  rowLabel: {
    flex: 1,
    fontSize: 15 * scaleX,
    lineHeight: 17.2 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#000000',
  },
  checkbox: {
    width: CHECKBOX * scaleX,
    height: CHECKBOX * scaleX,
    // Square: the design gives it no corner radius.
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12 * scaleX,
  },
  /** 2702:2598 — Helvetica 10, #575353. */
  optionalCaption: {
    fontSize: 10 * scaleX,
    lineHeight: 11.5 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#575353',
    marginLeft: 2 * scaleX,
    marginBottom: 11 * scaleX,
  },
  /** 42 tall and 62 apart (2702:2622 → 2702:2630). */
  optionalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ICON_CIRCLE * scaleX,
    marginLeft: -ROW_OUTDENT * scaleX,
    marginBottom: 20 * scaleX,
    // The thumbnail and the note count land on the checkboxes' right edge.
    paddingRight: CHECKBOX_INSET * scaleX,
  },
  optionalIcon: {
    width: ICON_CIRCLE * scaleX,
    height: ICON_CIRCLE * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ICON_GAP * scaleX,
  },
  /** 2702:2622 — Helvetica bold 18, #1e1e1e. */
  optionalLabel: {
    flex: 1,
    fontSize: 18 * scaleX,
    lineHeight: 20.7 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#1e1e1e',
  },
  rejectLink: {
    marginTop: 14 * scaleX,
    paddingVertical: 4 * scaleX,
  },
  rejectText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#f92424',
  },
  thumbStrip: {
    marginTop: -12 * scaleX,
    marginBottom: 16 * scaleX,
    marginLeft: (ICON_CIRCLE + ICON_GAP - ROW_OUTDENT) * scaleX,
  },
  thumbStripContent: {
    gap: 8 * scaleX,
    paddingTop: 6 * scaleX,
    paddingRight: 6 * scaleX,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumbRemove: {
    position: 'absolute',
    top: -6 * scaleX,
    right: -6 * scaleX,
    width: 18 * scaleX,
    height: 18 * scaleX,
    borderRadius: 9 * scaleX,
    backgroundColor: 'rgba(30, 30, 30, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionalText: {
    flex: 1,
  },
  notePreview: {
    marginTop: 2 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#6b7a90',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12 * scaleX,
    marginTop: 6 * scaleX,
    marginBottom: 16 * scaleX,
  },
  noteTitle: {
    fontSize: 20 * scaleX,
    lineHeight: 23 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
  },
  noteCount: {
    marginTop: 6 * scaleX,
    textAlign: 'right',
    fontSize: 11 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#9aa4b2',
  },
  noteDone: {
    marginTop: 14 * scaleX,
    height: 48 * scaleX,
    borderRadius: 24 * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteDoneText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#ffffff',
  },
  noteInput: {
    minHeight: 120 * scaleX,
    maxHeight: 200 * scaleX,
    padding: 10 * scaleX,
    borderRadius: 8 * scaleX,
    borderWidth: 1,
    borderColor: '#dfe6f0',
    backgroundColor: '#f9fafc',
    fontSize: 15 * scaleX,
    lineHeight: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#1e1e1e',
    textAlignVertical: 'top',
  },
  /** Node 2584:1271 — 59x40, rounded 6. */
  photoThumb: {
    width: 59 * scaleX,
    height: 40 * scaleX,
    borderRadius: 6 * scaleX,
    backgroundColor: colors.background.secondary,
  },
  /** Node 2584:1265 — a 20.455px pink disc with the count in white. */
  noteBadge: {
    width: 20.455 * scaleX,
    height: 20.455 * scaleX,
    borderRadius: (20.455 / 2) * scaleX,
    backgroundColor: colors.text.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBadgeText: {
    fontSize: 15 * scaleX,
    lineHeight: 17 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: colors.text.white,
    includeFontPadding: false,
  },
  /** The slider sits 51 under the Add Notes row; the card ends 32 under it. */
  slideSection: {
    alignItems: 'center',
    marginTop: (51 - 20) * scaleX,
    marginBottom: (32 - CARD_PADDING) * scaleX,
  },
  /** 2702:2599 — 286x68, radius 56, #f6f6f6 → #ebebeb, a 0.5 #e4e6e4 edge. */
  track: {
    width: Math.min(TRACK_WIDTH * scaleX, STATUS_MODAL_WIDTH * scaleX - 40 * scaleX),
    height: TRACK_HEIGHT * scaleX,
    borderRadius: (TRACK_HEIGHT / 2) * scaleX,
    borderWidth: 0.5,
    borderColor: '#e4e6e4',
    justifyContent: 'center',
    paddingHorizontal: THUMB_INSET * scaleX,
  },
  trackDisabled: {
    opacity: 0.6,
  },
  /** 2702:2631 — Helvetica 18, black, starting 94–107 into the track (per variant). */
  slideLabel: {
    position: 'absolute',
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#000000',
  },
  /** 2702:2600 — a 60 disc, 7 in from the track's left, in the status colour. */
  thumb: {
    width: THUMB * scaleX,
    height: THUMB * scaleX,
    borderRadius: (THUMB / 2) * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
