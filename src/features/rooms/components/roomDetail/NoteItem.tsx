import React, { useCallback } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, Pressable } from 'react-native';
// expo-image: cached in memory and on disk, unlike react-native's Image.
import { Image } from 'expo-image';
import { scaleX, NOTES_SECTION } from '../../constants/roomDetailStyles';
import type { Note } from '../../types/roomDetail.types';
import { ItemMoreButton, openDeleteMenu } from './ItemDeleteMenu';

interface NoteItemProps {
  note: Note;
  onHeightMeasured?: (height: number) => void;
  /** Set when this person may delete the note: its author, or rooms.notes.manage. */
  onDelete?: (note: Note) => void;
}

export default function NoteItem({ note, onHeightMeasured, onDelete }: NoteItemProps) {
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      onHeightMeasured?.(e.nativeEvent.layout.height);
    },
    [onHeightMeasured]
  );

  const avatarValue = note.staff.avatar;
  const hasAvatar =
    (typeof avatarValue === 'string' && avatarValue.trim().length > 0) ||
    (avatarValue != null && typeof avatarValue !== 'string');

  const initials = (note.staff.name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

  const menu = onDelete ? () => openDeleteMenu({ what: 'note', preview: note.text, onDelete: () => onDelete(note) }) : undefined;

  return (
    <Pressable style={styles.wrap} onLayout={onLayout} onLongPress={menu} delayLongPress={350} disabled={!menu}>
      <View style={styles.textRow}>
        <Text style={[styles.noteText, styles.textFlex]}>{note.text}</Text>
        {menu ? <ItemMoreButton onPress={menu} label="Note options" /> : null}
      </View>
      <View style={styles.footerRow}>
        {hasAvatar ? (
          <Image
            source={
              typeof avatarValue === 'string'
                ? { uri: avatarValue }
                : (avatarValue as any)
            }
            style={styles.profilePicture}
            contentFit="cover" cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.initialsCircle}>
            <Text style={styles.initialsText} numberOfLines={1}>
              {initials}
            </Text>
          </View>
        )}
        <Text style={styles.staffName}>{note.staff.name}</Text>
      </View>
    </Pressable>
  );
}

// Match Figma (node 1772:104): note text 13, author 11, avatar 25.
const NOTE_FONT_PX = 13;
const AUTHOR_FONT_PX = 11;
const PROFILE_SIZE_PX = 25;
const PROFILE_MARGIN_RIGHT_PX = 8;

const styles = StyleSheet.create({
  textRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 * scaleX },
  textFlex: { flex: 1 },
  wrap: {
    width: '100%',
    marginBottom: 20 * scaleX,
  },
  noteText: {
    fontFamily: NOTES_SECTION.note.text.fontFamily,
    fontSize: NOTE_FONT_PX * scaleX,
    fontStyle: NOTES_SECTION.note.text.fontStyle,
    fontWeight: NOTES_SECTION.note.text.fontWeight as '300',
    color: NOTES_SECTION.note.text.color,
    lineHeight: 20 * scaleX,
    marginBottom: 10 * scaleX,
    paddingHorizontal: 4 * scaleX,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePicture: {
    width: PROFILE_SIZE_PX * scaleX,
    height: PROFILE_SIZE_PX * scaleX,
    borderRadius: (PROFILE_SIZE_PX / 2) * scaleX,
    marginRight: PROFILE_MARGIN_RIGHT_PX * scaleX,
  },
  initialsCircle: {
    width: PROFILE_SIZE_PX * scaleX,
    height: PROFILE_SIZE_PX * scaleX,
    borderRadius: (PROFILE_SIZE_PX / 2) * scaleX,
    marginRight: PROFILE_MARGIN_RIGHT_PX * scaleX,
    backgroundColor: '#E4EEFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 10 * scaleX,
    fontWeight: '700',
    color: '#334866',
    includeFontPadding: false,
  },
  staffName: {
    fontFamily: NOTES_SECTION.note.staffName.fontFamily,
    fontSize: AUTHOR_FONT_PX * scaleX,
    fontStyle: NOTES_SECTION.note.staffName.fontStyle,
    fontWeight: '400',
    color: NOTES_SECTION.note.staffName.color,
  },
});
