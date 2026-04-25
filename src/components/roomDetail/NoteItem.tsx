import React, { useCallback } from 'react';
import { View, Text, Image, StyleSheet, LayoutChangeEvent } from 'react-native';
import { scaleX, NOTES_SECTION } from '../../constants/roomDetailStyles';
import type { Note } from '../../types/roomDetail.types';

interface NoteItemProps {
  note: Note;
  onHeightMeasured?: (height: number) => void;
}

export default function NoteItem({ note, onHeightMeasured }: NoteItemProps) {
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

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <Text style={styles.noteText}>{note.text}</Text>
      <View style={styles.footerRow}>
        {hasAvatar ? (
          <Image
            source={
              typeof avatarValue === 'string'
                ? { uri: avatarValue }
                : (avatarValue as any)
            }
            style={styles.profilePicture}
            resizeMode="cover"
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
    </View>
  );
}

// Match Figma (node 1772:104): note text 13, author 11, avatar 25.
const NOTE_FONT_PX = 13;
const AUTHOR_FONT_PX = 11;
const PROFILE_SIZE_PX = 25;
const PROFILE_MARGIN_RIGHT_PX = 8;

const styles = StyleSheet.create({
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
