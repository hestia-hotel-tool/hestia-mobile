import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { typography } from '@/theme';
import { scaleX, NOTES_SECTION } from '../../constants/roomDetailStyles';
import NoteItem from './NoteItem';
import type { Note } from '../../types/roomDetail.types';

interface NotesSectionProps {
  notes: Note[];
  onAddPress?: () => void;
}

export default function NotesSection({ notes, onAddPress }: NotesSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleCluster}>
          <View style={styles.iconBadgeWrap}>
            <Image
              source={require('../../../../../assets/icons/notes-icon.png')}
              style={styles.icon}
              resizeMode="contain"
            />
            {notes.length > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notes.length}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.title}>Notes</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddPress}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {notes.map((note) => (
        <NoteItem key={note.id} note={note} />
      ))}
    </View>
  );
}

const BADGE_SIZE = NOTES_SECTION.badge.width * scaleX;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 44 * scaleX,
    paddingHorizontal: 20 * scaleX,
    paddingBottom: 24 * scaleX,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16 * scaleX,
  },
  titleCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadgeWrap: {
    position: 'relative',
    marginRight: 10 * scaleX,
  },
  icon: {
    width: NOTES_SECTION.icon.width * scaleX,
    height: NOTES_SECTION.icon.height * scaleX,
  },
  badge: {
    position: 'absolute',
    top: -4 * scaleX,
    right: -8 * scaleX,
    minWidth: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: (BADGE_SIZE / 2),
    backgroundColor: NOTES_SECTION.badge.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4 * scaleX,
  },
  badgeText: {
    fontSize: NOTES_SECTION.badge.fontSize * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: typography.fontWeights.light as '300',
    color: NOTES_SECTION.badge.color,
    textAlign: 'center',
    includeFontPadding: false,
  },
  title: {
    fontSize: NOTES_SECTION.title.fontSize * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as '700',
    color: NOTES_SECTION.title.color,
  },
  addButton: {
    width: NOTES_SECTION.addButton.width * scaleX,
    height: NOTES_SECTION.addButton.height * scaleX,
    borderRadius: NOTES_SECTION.addButton.borderRadius * scaleX,
    borderWidth: NOTES_SECTION.addButton.borderWidth,
    borderColor: NOTES_SECTION.addButton.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: NOTES_SECTION.addButton.fontSize * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: typography.fontWeights.light as '300',
    color: NOTES_SECTION.addButton.color,
  },
});
