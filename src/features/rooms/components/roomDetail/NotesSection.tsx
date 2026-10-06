import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { scaleX } from '../../constants/roomDetailStyles';
import NoteItem from './NoteItem';
import type { Note } from '../../types/roomDetail.types';

interface NotesSectionProps {
  notes: Note[];
  onAddPress?: () => void;
}

/**
 * The room's notes, inside the "Assigned to" card under its rule — Figma
 * 1772-104 (nodes 4319:924–935).
 *
 * A 32 #ebe7e7 disc with the pencil and the pink count on its edge, "Notes"
 * in Helvetica bold 18, then each note (light 13) with its author. The frame
 * draws no Add control; one is kept, as a small pill like Reassign's, so a
 * note can still be written here.
 */
export default function NotesSection({ notes, onAddPress }: NotesSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleCluster}>
          <View style={styles.disc}>
            <Icon name="action-add-note" size={16 * scaleX} color="#5a759d" />
            {notes.length > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notes.length}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.title}>Notes</Text>
        </View>
        {onAddPress ? (
          <Pressable
            onPress={onAddPress}
            hitSlop={10}
            style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Add a note"
          >
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        ) : null}
      </View>

      {notes.length === 0 ? <Text style={styles.empty}>No notes on this room yet.</Text> : null}
      {notes.map((note) => (
        <NoteItem key={note.id} note={note} />
      ))}
    </View>
  );
}

const DISC = 32;
const BADGE = 20.5;

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  /** 4319:926 sits 13 under the card's rule; the first note 16 under the header. */
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
  disc: {
    width: DISC * scaleX,
    height: DISC * scaleX,
    borderRadius: (DISC / 2) * scaleX,
    backgroundColor: '#ebe7e7',
    alignItems: 'center',
    justifyContent: 'center',
    // "Notes" starts 58 after the disc's left edge (x36 → x94).
    marginRight: 26 * scaleX,
  },
  /** 4319:931 — 20.5, #ff46a3, over the disc's top-right (x63, 4 below its top). */
  badge: {
    position: 'absolute',
    top: 4 * scaleX,
    left: 27 * scaleX,
    minWidth: BADGE * scaleX,
    height: BADGE * scaleX,
    borderRadius: (BADGE / 2) * scaleX,
    paddingHorizontal: 5 * scaleX,
    backgroundColor: '#ff46a3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 15 * scaleX,
    lineHeight: 17 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#ffffff',
    includeFontPadding: false,
  },
  /** 4319:924 — Helvetica bold 18. */
  title: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  /** Reassign's pill (1772:155), smaller: #f1f6fc, #5a759d. */
  addButton: {
    height: 34 * scaleX,
    paddingHorizontal: 18 * scaleX,
    borderRadius: 17 * scaleX,
    backgroundColor: '#f1f6fc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
  empty: {
    marginBottom: 8 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#6b7a90',
  },
});
