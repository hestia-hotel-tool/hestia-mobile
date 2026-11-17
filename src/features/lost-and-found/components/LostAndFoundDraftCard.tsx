import React from 'react';
import { Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { scaleX } from '@/utils/responsive';
import { ItemPhoto } from './itemCard/ItemPhoto';
import type { LostAndFoundDraft } from '../store/lostAndFoundDrafts';

export interface LostAndFoundDraftCardProps {
  draft: LostAndFoundDraft;
  onPress: () => void;
  onDiscard: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

function edited(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return `Edited ${pad(d.getHours())}:${pad(d.getMinutes())}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/**
 * One unfinished registration on Lost & Found → Drafts. Figma draws only the
 * "Drafts (1)" chip, so this follows the item card (4735:374): the photo,
 * the name with a "Draft" tag, where it was found and the room; then
 * Discard / Continue under the rule instead of the status pill.
 */
export default function LostAndFoundDraftCard({ draft, onPress, onDiscard }: LostAndFoundDraftCardProps) {
  const photo = draft.pictures[0];
  const where =
    draft.selectedLocation === 'room'
      ? draft.selectedRoom
        ? draft.selectedRoom.primaryGuest?.fullName || `Room ${draft.selectedRoom.number}`
        : 'Room not chosen'
      : draft.selectedPublicArea ?? 'Area not chosen';
  const room = draft.selectedLocation === 'room' ? draft.selectedRoom?.number : undefined;

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Draft: ${draft.title || 'Untitled item'}. Continue registering`}
    >
      <View style={styles.top}>
        <View style={styles.photo}>
          <ItemPhoto source={photo ? { uri: photo } : undefined} />
        </View>
        <View style={styles.details}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, !draft.title.trim() && styles.nameEmpty]} numberOfLines={1}>
              {draft.title.trim() || 'Untitled item'}
            </Text>
            <View style={styles.tag}>
              <Text style={styles.tagText}>Draft</Text>
            </View>
          </View>
          <Text style={styles.when}>{edited(draft.updatedAt)}</Text>
          <View style={styles.foundRow}>
            <View style={styles.foundText}>
              <Text style={styles.label}>{draft.selectedLocation === 'room' ? 'Guest and Room Number' : 'Found In'}</Text>
              <Text style={styles.foundName} numberOfLines={1}>
                {where}
              </Text>
            </View>
            {room ? <Text style={styles.roomNumber}>{room}</Text> : null}
          </View>
        </View>
      </View>
      <View style={styles.rule} />
      <View style={styles.actions}>
        <TouchableOpacity onPress={onDiscard} hitSlop={8} accessibilityRole="button" accessibilityLabel="Discard draft">
          <Text style={styles.discard}>Discard</Text>
        </TouchableOpacity>
        <Text style={styles.continue}>Continue</Text>
      </View>
    </Pressable>
  );
}

const androidText = Platform.select({ android: { includeFontPadding: false } as const, default: {} as const });

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f9fafc',
    borderWidth: 1,
    borderColor: '#e3e3e3',
    borderRadius: 9 * scaleX,
    overflow: 'hidden',
  },
  top: {
    flexDirection: 'row',
    paddingTop: 15 * scaleX,
    paddingLeft: 13 * scaleX,
    paddingRight: 9 * scaleX,
    paddingBottom: 17 * scaleX,
  },
  photo: {
    width: 114 * scaleX,
    height: 109 * scaleX,
    borderRadius: 10 * scaleX,
    overflow: 'hidden',
  },
  details: {
    flex: 1,
    marginLeft: 14 * scaleX,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 * scaleX,
  },
  name: {
    flexShrink: 1,
    fontSize: 21 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#000000',
    ...androidText,
  },
  nameEmpty: {
    color: '#9aa7bd',
  },
  tag: {
    paddingHorizontal: 8 * scaleX,
    paddingVertical: 3 * scaleX,
    borderRadius: 9 * scaleX,
    backgroundColor: '#eef2f7',
  },
  tagText: {
    fontSize: 11 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#5a759d',
    ...androidText,
  },
  when: {
    marginTop: 4 * scaleX,
    fontSize: 12 * scaleX,
    fontFamily: 'Helvetica',
    color: '#1e1e1e',
    opacity: 0.39,
    ...androidText,
  },
  foundRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  foundText: {
    flex: 1,
  },
  label: {
    fontSize: 11 * scaleX,
    fontFamily: 'Inter',
    fontWeight: '300',
    color: '#000000',
    ...androidText,
  },
  foundName: {
    marginTop: 6 * scaleX,
    fontSize: 16 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#000000',
    ...androidText,
  },
  roomNumber: {
    marginLeft: 8 * scaleX,
    fontSize: 33 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#334866',
    ...androidText,
  },
  rule: {
    height: 1,
    backgroundColor: '#e3e3e3',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15 * scaleX,
    paddingVertical: 16 * scaleX,
  },
  discard: {
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    color: '#f92424',
    ...androidText,
  },
  continue: {
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#5a759d',
    ...androidText,
  },
});
