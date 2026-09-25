import React, { useState } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { getInitialsFromFullName } from '@/utils/formatting';
import type { RoomPickerRoom } from '../../types/roomPicker.types';
import { ROOM_PICKER_LAYOUT as L } from './roomPickerLayout';

/** "2026-10-07" -> "07/10". Blank for anything unparseable. */
function formatDayMonth(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export interface RoomPickerCardProps {
  room: RoomPickerRoom;
  scaleX: number;
  /**
   * `option` is a row in the picker's list: a bordered card.
   * `selected` is the chosen room as it appears back on the form, which the
   * frame draws as a white panel lifted off the page by a shadow, with a tab
   * on its top edge.
   */
  variant: 'option' | 'selected';
  /**
   * Marks an `option` row as the one currently chosen. Drawn as a corner tick
   * rather than inline, so it cannot compress the measured row geometry.
   */
  checked?: boolean;
  onPress?: () => void;
}

/**
 * One room, with the guest currently in it.
 *
 * Node 1102:3287 (Register) / 3005:494 (Create Ticket) — the same design in
 * both places. See `roomPickerLayout.ts` for the measurements.
 */
export default function RoomPickerCard({
  room,
  scaleX,
  variant,
  checked = false,
  onPress,
}: RoomPickerCardProps) {
  const styles = buildRoomPickerCardStyles(scaleX);
  const [imageFailed, setImageFailed] = useState(false);

  const guest = room.primaryGuest;
  const guestName = guest?.fullName?.trim();
  const guestNameForLabel = guestName;
  const showPhoto = !!guest?.imageUrl && !imageFailed;
  const dates = `${formatDayMonth(room.checkIn)}-${formatDayMonth(room.checkOut)}`.replace(/^-|-$/, '');

  const card = (
    <TouchableOpacity
      style={[
        styles.card,
        variant === 'selected' ? styles.cardSelected : styles.cardOption,
        checked && styles.cardChecked,
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: checked }}
      accessibilityLabel={
        guestNameForLabel
          ? `Room ${room.number}, ${guestNameForLabel}`
          : `Room ${room.number}, no guest`
      }
    >
      {checked ? (
        <View style={styles.checkBadge}>
          <Icon name="action-check" size={10 * scaleX} color="#ffffff" />
        </View>
      ) : null}
      <View style={styles.content}>
        <View style={styles.roomNumberSection}>
          <Text style={styles.roomNumber}>Room {room.number}</Text>
        </View>

        {guestName ? (
          <>
            <View style={styles.divider} />
            <View style={styles.guestSection}>
              <View style={styles.thumbWrap}>
                {showPhoto ? (
                  <Image
                    source={{ uri: guest!.imageUrl }}
                    style={styles.thumb}
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbFallback]}>
                    <Text style={styles.thumbInitials}>{getInitialsFromFullName(guestName)}</Text>
                  </View>
                )}
                {guest?.vipCode ? (
                  <View style={styles.vipDisc}>
                    <Icon
                      name="guest-arrow"
                      size={L.guest.vip.arrow * scaleX}
                      color="#ffffff"
                      style={styles.vipArrow}
                    />
                  </View>
                ) : null}
              </View>

              <View style={styles.guestDetails}>
                <View style={styles.guestNameRow}>
                  <Text style={styles.guestName} numberOfLines={1}>
                    {guestName}
                  </Text>
                  {guest?.vipCode ? <Text style={styles.vipCode}>{guest.vipCode}</Text> : null}
                </View>
                <View style={styles.guestMetaRow}>
                  <Text style={styles.guestDates}>{dates}</Text>
                  {typeof room.guestCount === 'number' ? (
                    <>
                      <Icon
                        name="guest-occupancy"
                        width={L.guest.occupancy.width * scaleX}
                        height={L.guest.occupancy.height * scaleX}
                        color="#000000"
                        style={styles.occupancyIcon}
                      />
                      <Text style={styles.guestCount}>{room.guestCount}/2</Text>
                    </>
                  ) : null}
                </View>
              </View>
            </View>
          </>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  if (variant !== 'selected') return card;

  /*
   * The tab is painted *before* the card so the card covers its lower half,
   * leaving only the corner poking above the top edge.
   */
  return (
    <View style={styles.selectedWrap}>
      {card}
      <View style={styles.notch} />
    </View>
  );
}

function buildRoomPickerCardStyles(scaleX: number) {
  const androidText = Platform.select({
    android: { includeFontPadding: false } as const,
    default: {} as const,
  });

  /*
   * A square of side s turned 45 about its centre grows from s to s*sqrt(2),
   * so its apex rises s*(sqrt(2)-1)/2 above its unrotated box. Offsetting the
   * box by that much puts the apex on the wrapper's top edge, which — since
   * the wrapper pads the card down by `protrusion` — is exactly `protrusion`
   * above the card. The tab is then 2*protrusion wide where it meets the
   * card's edge.
   */
  const notchTop = (L.notch.side * (Math.SQRT2 - 1)) / 2;
  const notchLeft = L.notch.centerX - L.notch.side / 2;

  return StyleSheet.create({
    card: {
      alignSelf: 'stretch',
      backgroundColor: '#fff',
      borderRadius: L.card.radius * scaleX,
    },
    cardOption: {
      borderWidth: 1,
      borderColor: L.field.borderColor,
      marginBottom: L.list.rowGap * scaleX,
      // Android does not clip children to `borderRadius` without this. The
      // tick badge is inside the card, so nothing needs to escape it.
      overflow: 'hidden',
    },
    cardChecked: {
      borderColor: '#5a759d',
      backgroundColor: '#f7f9fd',
    },
    /** Corner tick on the chosen row. */
    checkBadge: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 26 * scaleX,
      height: 26 * scaleX,
      // Square on two corners so it tucks into the card's rounded top-right.
      borderBottomLeftRadius: L.card.radius * scaleX,
      borderTopRightRadius: L.card.radius * scaleX,
      backgroundColor: '#5a759d',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    cardSelected: {
      // Node 1102:3198 — white, with a 1px #e6e6e6 outline and a soft halo.
      borderWidth: 1,
      borderColor: L.card.borderColor,
      // A clipped view casts no shadow, and without one a white card on a
      // white page has no edge at all.
      overflow: 'visible',
      shadowColor: L.card.shadowColor,
      shadowOffset: { width: 0, height: L.card.shadowOffsetY },
      shadowOpacity: L.card.shadowOpacity,
      shadowRadius: L.card.shadowRadius,
      elevation: 3,
    },
    selectedWrap: {
      position: 'relative',
      // Room for the tab to poke above the card.
      paddingTop: L.notch.protrusion * scaleX,
    },
    notch: {
      position: 'absolute',
      top: notchTop * scaleX,
      left: notchLeft * scaleX,
      width: L.notch.side * scaleX,
      height: L.notch.side * scaleX,
      backgroundColor: '#fff',
      borderRadius: L.notch.radius * scaleX,
      // After the 45deg turn, top and left are the tab's two exposed edges.
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderColor: L.card.borderColor,
      transform: [{ rotate: '45deg' }],
      // Above the card, so its lower half hides the card's outline where the
      // tab joins it — the frame draws the two as one shape (a Union).
      zIndex: 2,
      elevation: 4,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: L.card.minHeight * scaleX,
    },
    roomNumberSection: {
      justifyContent: 'center',
      paddingLeft: L.roomNumber.paddingLeft * scaleX,
      // The divider sits at 165; the section owns everything up to it.
      width: L.divider.left * scaleX,
    },
    roomNumber: {
      fontSize: L.roomNumber.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      color: '#5a759d',
      ...androidText,
    },
    divider: {
      width: 1,
      height: L.divider.height * scaleX,
      backgroundColor: L.divider.color,
    },
    guestSection: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: L.guest.paddingLeft * scaleX,
    },
    thumbWrap: {
      position: 'relative',
      marginRight: L.guest.thumbToText * scaleX,
    },
    thumb: {
      width: L.guest.thumb.size * scaleX,
      height: L.guest.thumb.size * scaleX,
      borderRadius: L.guest.thumb.radius * scaleX,
    },
    /*
     * A filled disc rather than a pale tile: a guest with no portrait should
     * still read as a person at a glance, which is the same change
     * `ui/Avatar`'s initials fallback took.
     */
    thumbFallback: {
      backgroundColor: '#5a759d',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    thumbInitials: {
      fontSize: 12 * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: '700',
      color: '#ffffff',
      ...androidText,
    },
    vipDisc: {
      position: 'absolute',
      right: L.guest.vip.right * scaleX,
      bottom: L.guest.vip.bottom * scaleX,
      width: L.guest.vip.size * scaleX,
      height: L.guest.vip.size * scaleX,
      borderRadius: (L.guest.vip.size / 2) * scaleX,
      // Node 2961:186.
      backgroundColor: '#f92424',
      alignItems: 'center',
      justifyContent: 'center',
    },
    /** `guest-arrow` points left; the badge points right. */
    vipArrow: {
      transform: [{ scaleX: -1 }],
    },
    guestDetails: {
      flex: 1,
    },
    guestNameRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: L.guest.rowGap * scaleX,
    },
    guestName: {
      fontSize: L.guest.name.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: '700',
      color: '#000',
      flexShrink: 1,
      ...androidText,
    },
    vipCode: {
      fontSize: L.guest.code.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: '300',
      color: '#334866',
      marginLeft: L.guest.code.marginLeft * scaleX,
      ...androidText,
    },
    guestMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    guestDates: {
      fontSize: L.guest.dates.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: '300',
      color: '#000',
      marginRight: L.guest.dates.marginRight * scaleX,
      flexShrink: 1,
      ...androidText,
    },
    occupancyIcon: {
      marginRight: L.guest.occupancy.marginRight * scaleX,
    },
    guestCount: {
      fontSize: L.guest.count.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: '300',
      color: '#000',
      ...androidText,
    },
  });
}
