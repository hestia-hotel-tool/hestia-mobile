import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { GradientText } from '@/components/ui/GradientText';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';

/**
 * Figma 2186:2044: the photo frame with the gradient "+" on its top-right
 * corner. The empty "Add Photo" card on Create Ticket and on Lost & Found →
 * Register (4649:2407) both draw it.
 */
export function AddPhotoMark() {
  return (
    <View style={styles.mark}>
      <Icon name="action-add-photo-frame" width={55.4 * scaleX} height={47 * scaleX} color="#000000" />
      <View style={styles.plus} pointerEvents="none">
        <GradientText text="+" textStyle={styles.plusText} direction="vertical" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 55.4 * scaleX,
    height: 47 * scaleX,
  },
  // Figma 2186:2050: the "+" box starts 38 right of the frame and its
  // baseline lands ~6 below the frame's top; GradientText draws the baseline
  // at 1.2 x the font size (50.4) below its own top.
  plus: {
    position: 'absolute',
    left: 38 * scaleX,
    top: -44 * scaleX,
  },
  plusText: {
    fontSize: 42 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
  },
});

export default AddPhotoMark;
