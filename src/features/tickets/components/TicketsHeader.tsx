import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, PixelRatio } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '@/theme';
import { Icon } from '@/components/Icon';
import CreateTicketButton from './CreateTicketButton';
import {
  TICKETS_HEADER,
  TICKETS_COLORS,
  TICKETS_TYPOGRAPHY,
  ticketsScaleX,
  getTicketsCreateButtonTopPx,
  getTicketsTopShift,
} from '../constants/ticketsStyles';

interface TicketsHeaderProps {
  onBackPress?: () => void;
  onCreatePress?: () => void;
}

export default function TicketsHeader({
  onBackPress,
  onCreatePress,
}: TicketsHeaderProps) {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scaleXForIcons = ticketsScaleX(windowWidth);

  /*
   * How far the whole header block drops to clear the notch.
   *
   * Figma 667-3068 is notch-naive: it puts the Create Ticket pill at y=47, which
   * on an iPhone 16 Pro is 42pt — inside the 59pt top inset, so the pill rendered
   * *behind* the Dynamic Island. Rather than re-space the header, shift the block
   * by the smallest amount that clears the inset, which keeps every relationship
   * the frame specifies (title 22 below the pill, chevron 28 below that) intact
   * and is zero on a device with no inset.
   */
  const topShift = getTicketsTopShift(insets.top, scaleXForIcons);
  const styles = useMemo(
    () => buildTicketsHeaderStyles(windowWidth, topShift),
    [windowWidth, topShift]
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerBackground} />

      <View style={styles.topSection}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackPress || (() => {})}
          activeOpacity={0.7}
        >
          {/*
            Figma 667-3068 node 667:3116 is 14x28. `action-chevron` already
            points left and its viewBox aspect is exactly 0.5, so a height of 28
            paints 14 wide — the same call the room-detail header back button
            makes. The 32x32 box around it is unchanged in this stage.
          */}
          <Icon
            name="action-chevron"
            size={TICKETS_HEADER.backButton.height * scaleXForIcons}
            color="#607AA1"
          />
        </TouchableOpacity>

        <Text style={styles.title}>Tickets</Text>

        <View style={styles.createButton}>
          <CreateTicketButton onPress={onCreatePress} scaleX={scaleXForIcons} />
        </View>
      </View>
    </View>
  );
}

function buildTicketsHeaderStyles(windowWidth: number, topShift: number) {
  const scaleX = ticketsScaleX(windowWidth);
  const createW = PixelRatio.roundToNearestPixel(TICKETS_HEADER.createButton.width * scaleX);
  const createH = PixelRatio.roundToNearestPixel(TICKETS_HEADER.createButton.height * scaleX);

  return StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: TICKETS_HEADER.height * scaleX + topShift,
      zIndex: 10,
    },
    headerBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: TICKETS_HEADER.background.height * scaleX + topShift,
      backgroundColor: TICKETS_COLORS.headerBackground,
    },
    topSection: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: TICKETS_HEADER.backButton.left * scaleX,
      paddingTop: TICKETS_HEADER.backButton.top * scaleX,
      height: TICKETS_HEADER.background.height * scaleX,
    },
    backButton: {
      position: 'absolute',
      left: TICKETS_HEADER.backButton.left * scaleX,
      top: TICKETS_HEADER.backButton.top * scaleX + topShift,
      width: TICKETS_HEADER.backButton.width * scaleX,
      height: TICKETS_HEADER.backButton.height * scaleX,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: TICKETS_TYPOGRAPHY.headerTitle.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: TICKETS_TYPOGRAPHY.headerTitle.fontWeight as any,
      color: TICKETS_TYPOGRAPHY.headerTitle.color,
      position: 'absolute',
      left: TICKETS_HEADER.title.left * scaleX,
      top: TICKETS_HEADER.title.top * scaleX + topShift,
    },
    createButton: {
      position: 'absolute',
      right: TICKETS_HEADER.createButton.right * scaleX,
      top: PixelRatio.roundToNearestPixel(getTicketsCreateButtonTopPx() * scaleX + topShift),
      width: createW,
      height: createH,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}
