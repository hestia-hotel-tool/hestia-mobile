import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, typography } from '@/theme';
import { NotesInfo } from '../../types/allRooms.types';
import { scaleX, NOTES_SECTION } from '../../constants/allRoomsStyles';

interface NotesSectionProps {
  notes: NotesInfo;
  isArrivalDeparture?: boolean;
  isPriority?: boolean; // When true, show priority icon with badge next to notes
  /** Card height in px. When set, notes container is positioned from card bottom so margin from bottom stays constant when name wraps. */
  cardHeight?: number;
}

export default function NotesSection({ notes, isArrivalDeparture = false, isPriority = false, cardHeight }: NotesSectionProps) {
  // Only show container when there is something to show (note, rush, or priority) - per Figma
  const hasContent = isPriority || notes.count > 0 || !!notes.hasRushed;
  if (!hasContent) return null;

  const position = isArrivalDeparture 
    ? NOTES_SECTION.positions.arrivalDeparture 
    : NOTES_SECTION.positions.withNotes;
  
  // When cardHeight is provided, pin notes container to card bottom so margin from bottom stays constant when name wraps
  const bottomMargin = isArrivalDeparture 
    ? NOTES_SECTION.bottomMarginFromCard.arrivalDeparture 
    : NOTES_SECTION.bottomMarginFromCard.withNotes;
  const notesHeightScaled = NOTES_SECTION.height * scaleX;
  const bottomMarginScaled = bottomMargin * scaleX;
  const topFromBottom = cardHeight != null && cardHeight > 0
    ? cardHeight - notesHeightScaled - bottomMarginScaled
    : position.top * scaleX;

  const iconPos = isArrivalDeparture 
    ? NOTES_SECTION.icon.positions.arrivalDeparture 
    : NOTES_SECTION.icon.positions.withNotes;
  const badgePos = isArrivalDeparture 
    ? NOTES_SECTION.badge.positions.arrivalDeparture 
    : NOTES_SECTION.badge.positions.withNotes;
  const textPos = isArrivalDeparture 
    ? NOTES_SECTION.text.positions.arrivalDeparture 
    : NOTES_SECTION.text.positions.withNotes;

  const rushedIconPos = isArrivalDeparture
    ? NOTES_SECTION.rushedIcon.positions.arrivalDeparture
    : NOTES_SECTION.rushedIcon.positions.withNotes;

  // Notes icon position:
  // - priority: keep Figma "notes right of priority icon"
  // - rushed+notes: push notes icon right to create visible gap
  // - notes only: keep notes icon in left slot
  const rushToNotesGap = 4; // px gap between rush and notes icons
  const hasRushIcon = isPriority || !!notes.hasRushed;
  const notesIconLeft = hasRushIcon
    ? (rushedIconPos.left + NOTES_SECTION.rushedIcon.width + rushToNotesGap)
    : rushedIconPos.left;
  const notesIconTop = iconPos.top;

  // Badge should always follow whichever notes icon position is active.
  const notesBadgeLeft = notesIconLeft + NOTES_SECTION.icon.width - NOTES_SECTION.badge.width / 2 + 8;
  const notesBadgeTop = badgePos.top;

  const containerBackground = isArrivalDeparture 
    ? NOTES_SECTION.background 
    : NOTES_SECTION.backgroundWithNotes;

  return (
    <View style={[
      styles.container, 
      { 
        left: position.left * scaleX, 
        top: topFromBottom,
        backgroundColor: containerBackground,
      }
    ]}>
      {/* Priority Icon (leftmost) - shown when room is priority */}
      {isPriority && (
        <>
          <Image
            source={require('../../../../../assets/icons/priority-icon.png')}
            style={[styles.priorityIcon, { left: rushedIconPos.left * scaleX, top: rushedIconPos.top * scaleX }]}
            resizeMode="contain"
          />
        </>
      )}
      
      {/* Rushed Icon (leftmost, when not priority but has rushed) */}
      {!isPriority && notes.hasRushed && (
        <Image
          source={require('../../../../../assets/icons/priority-icon.png')}
          style={[styles.rushedIcon, { left: rushedIconPos.left * scaleX, top: rushedIconPos.top * scaleX }]}
          resizeMode="contain"
        />
      )}
      
      {/* Notes Icon - leftmost when not priority, otherwise right of priority icon */}
      {notes.count > 0 && (
        <>
          <Image
            source={require('../../../../../assets/icons/notes-icon.png')}
            style={[styles.notesIcon, { left: notesIconLeft * scaleX, top: notesIconTop * scaleX }]}
            resizeMode="contain"
          />

          {/* Notes Count Badge - on notes icon */}
          <View style={[styles.badgeContainer, { left: notesBadgeLeft * scaleX, top: notesBadgeTop * scaleX }]}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notes.count}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NOTES_SECTION.background,
    borderRadius: NOTES_SECTION.borderRadius * scaleX,
    paddingTop: (NOTES_SECTION.paddingTop ?? NOTES_SECTION.paddingVertical) * scaleX,
    paddingBottom: NOTES_SECTION.paddingVertical * scaleX,
    paddingHorizontal: NOTES_SECTION.paddingHorizontal * scaleX,
    height: NOTES_SECTION.height * scaleX,
    width: NOTES_SECTION.width * scaleX,
    overflow: 'hidden',
  },
  notesIcon: {
    position: 'absolute',
    width: NOTES_SECTION.icon.width * scaleX,
    height: NOTES_SECTION.icon.height * scaleX,
  },
  priorityIcon: {
    position: 'absolute',
    width: NOTES_SECTION.rushedIcon.width * scaleX,
    height: NOTES_SECTION.rushedIcon.height * scaleX,
  },
  rushedIcon: {
    position: 'absolute',
    width: NOTES_SECTION.icon.width * scaleX, // Same size as notes icon
    height: NOTES_SECTION.icon.height * scaleX, // Same size as notes icon
  },
  badgeContainer: {
    position: 'absolute',
  },
  badge: {
    width: NOTES_SECTION.badge.width * scaleX,
    height: NOTES_SECTION.badge.height * scaleX,
    borderRadius: NOTES_SECTION.badge.borderRadius * scaleX,
    backgroundColor: NOTES_SECTION.badge.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: NOTES_SECTION.badge.fontSize * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: typography.fontWeights.light as any,
    color: NOTES_SECTION.badge.color,
    lineHeight: NOTES_SECTION.badge.lineHeight * scaleX,
  },
  notesText: {
    position: 'absolute',
    fontSize: NOTES_SECTION.text.fontSize * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as any,
    color: NOTES_SECTION.text.color,
    lineHeight: NOTES_SECTION.text.lineHeight * scaleX,
    maxWidth: (NOTES_SECTION.width - NOTES_SECTION.paddingHorizontal * 2 - NOTES_SECTION.text.positions.withNotes.left) * scaleX,
  },
});

