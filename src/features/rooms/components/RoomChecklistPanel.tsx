import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '@/theme';
import { Icon, type IconName } from '@/components/Icon';
import { scaleX } from '../constants/allRoomsStyles';
import { STATUS_MODAL_WIDTH } from './StatusPopover';

/**
 * Figma node 2584:1276.
 *
 * Rows are hand-placed at irregular offsets (circles at y 532.97, 600.97,
 * 663.97, 734.97 — gaps of 68, 63, 71), which is export noise rather than a
 * rhythm worth copying; an even gap reads as intended and keeps working with
 * two items or six.
 */
const ICON_CIRCLE = 42;
const ICON_GAP = 18;
const CHECKBOX = 28;
/** The checkbox sits 49px in from the card's right edge, not flush with it. */
const CHECKBOX_INSET = 17;
const ROW_GAP = 24;

/** Track 286x68 at radius 56 — node 2584:1781. */
const TRACK_WIDTH = 286;
const TRACK_HEIGHT = 68;
const THUMB = 60;
const THUMB_INSET = 4;
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
  /** Every box ticked and the slider pulled to the end. */
  onComplete: () => void;
  onAddPhoto?: () => void;
  onAddNotes?: () => void;
  /**
   * Most recent photo attached to the room. Node 2584:1271 shows it as a
   * thumbnail on the Add Photo row, so the row reads as done rather than
   * still-to-do.
   */
  photoUri?: string;
  /** Notes on the room, shown as the pink count — node 2584:1265. */
  noteCount?: number;
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
  onAddPhoto,
  onAddNotes,
  photoUri,
  noteCount,
}: RoomChecklistPanelProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
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
            }).start(() => onComplete());
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

  return (
    <View style={styles.root}>
      <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
      <View style={styles.rule} />

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
              style={styles.row}
              onPress={() => toggle(item.id)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isChecked }}
              accessibilityLabel={item.label}
            >
              <View style={styles.iconCircle}>
                <Icon name={item.iconName} size={22 * scaleX} color={colors.primary.main} />
              </View>
              <Text style={styles.rowLabel}>{item.label}</Text>
              {isChecked ? (
                // Node 2582:1128 — ticking turns the whole box green, outline
                // and check together. It is the confirm colour, not the status
                // colour, so it stays green whichever checklist this is.
                <Icon
                  name="action-checkbox-checked"
                  size={CHECKBOX * scaleX}
                  color={colors.status.inspected}
                />
              ) : (
                <View style={styles.checkbox} />
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.rule} />
        <Text style={styles.optionalCaption}>Optional</Text>

        <TouchableOpacity
          style={styles.optionalRow}
          onPress={onAddPhoto}
          activeOpacity={0.7}
          accessibilityRole="button"
          disabled={!onAddPhoto}
        >
          <View style={styles.optionalIcon}>
            <Icon name="action-add-photo" size={29 * scaleX} />
          </View>
          <Text style={styles.optionalLabel}>Add Photo</Text>
          {!!photoUri && (
            <Image source={{ uri: photoUri }} style={styles.photoThumb} resizeMode="cover" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionalRow}
          onPress={onAddNotes}
          activeOpacity={0.7}
          accessibilityRole="button"
          disabled={!onAddNotes}
        >
          <View style={styles.optionalIcon}>
            <Icon name="action-add-note" size={22 * scaleX} color={colors.primary.main} />
          </View>
          <Text style={styles.optionalLabel}>Add Notes</Text>
          {!!noteCount && (
            <View style={styles.noteBadge}>
              <Text style={styles.noteBadgeText}>{noteCount}</Text>
            </View>
          )}
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
          <Text style={styles.slideLabel}>Slide to complete</Text>
          <Animated.View
            style={[styles.thumb, { transform: [{ translateX: thumbPosition }] }]}
            accessibilityRole="adjustable"
            accessibilityLabel="Slide to complete"
            accessibilityState={{ disabled: !allChecked }}
            {...panResponder.panHandlers}
          >
            <Icon name="action-thumbs-up" size={26 * scaleX} />
          </Animated.View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    flexShrink: 1,
  },
  title: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.medium,
    marginTop: 16 * scaleX,
    marginBottom: 16 * scaleX,
    // The design runs both rules the full width of the card, past its padding.
    marginHorizontal: -20 * scaleX,
  },
  scrollArea: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 4 * scaleX,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ROW_GAP * scaleX,
    paddingRight: CHECKBOX_INSET * scaleX,
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
  rowLabel: {
    flex: 1,
    fontSize: 15 * scaleX,
    lineHeight: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#000000',
  },
  checkbox: {
    width: CHECKBOX * scaleX,
    height: CHECKBOX * scaleX,
    // Square: the design gives it no corner radius.
    borderWidth: 2,
    borderColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8 * scaleX,
  },
  optionalCaption: {
    fontSize: 10 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#575353',
    marginBottom: 12 * scaleX,
  },
  optionalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16 * scaleX,
    // The thumbnail and the note count land on the same right edge as the
    // checkboxes above them — nodes 2584:1271 and 2584:1265 both end at x=377.
    paddingRight: CHECKBOX_INSET * scaleX,
  },
  optionalIcon: {
    width: ICON_CIRCLE * scaleX,
    height: ICON_CIRCLE * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ICON_GAP * scaleX,
  },
  optionalLabel: {
    flex: 1,
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.text.primary,
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
  slideSection: {
    alignItems: 'center',
    marginTop: 20 * scaleX,
    marginBottom: 4 * scaleX,
  },
  track: {
    width: Math.min(TRACK_WIDTH * scaleX, STATUS_MODAL_WIDTH * scaleX - 40 * scaleX),
    height: TRACK_HEIGHT * scaleX,
    borderRadius: (TRACK_HEIGHT / 2) * scaleX,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e4e6e4',
    justifyContent: 'center',
    paddingHorizontal: THUMB_INSET * scaleX,
  },
  trackDisabled: {
    opacity: 0.6,
  },
  slideLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#000000',
  },
  thumb: {
    width: THUMB * scaleX,
    height: THUMB * scaleX,
    borderRadius: (THUMB / 2) * scaleX,
    // Node 2584:1782 — the confirm colour, not the status colour.
    backgroundColor: colors.status.inspected,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
