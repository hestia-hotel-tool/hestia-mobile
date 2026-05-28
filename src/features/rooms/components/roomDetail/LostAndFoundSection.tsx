import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { typography } from '@shared/theme';
import { scaleX, LOST_AND_FOUND, CONTENT_AREA } from '../../constants/roomDetailStyles';
import { LostAndFoundItemCard, type LostAndFoundItem } from '@features/lost-and-found';

interface LostAndFoundSectionProps {
  displayType: 'empty' | 'withItems'; // Type of display based on room type
  items?: LostAndFoundItem[]; // Items to display (for Stayover/Turndown)
  onAddPhotosPress?: () => void;
  onTitlePress?: () => void;
  onItemPress?: (item: LostAndFoundItem) => void; // Callback when item is pressed
}

export default function LostAndFoundSection({
  displayType,
  items = [],
  onAddPhotosPress,
  onTitlePress,
  onItemPress,
}: LostAndFoundSectionProps) {
  const showEmptyBox = displayType === 'empty';
  const showItems = displayType === 'withItems' && items.length > 0;

  return (
    <View style={styles.container}>
      {/* Section Title - "Lost & Found" */}
      <TouchableOpacity
        onPress={onTitlePress}
        activeOpacity={0.7}
        disabled={!onTitlePress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.title}>Lost & Found</Text>
      </TouchableOpacity>

      {/* Empty Box - For Arrival/Departure/Arrival+Departure */}
      {showEmptyBox && (
        <TouchableOpacity
          style={styles.box}
          onPress={onAddPhotosPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {/* Left: Icon with plus sign overlay */}
          <View style={styles.iconContainer}>
            <Image
              source={require('../../../../../assets/icons/add-photo-basket.png')}
              style={styles.icon}
              resizeMode="contain"
            />
            <Text style={styles.plusIcon}>+</Text>
          </View>
          
          {/* Right: Text */}
          <Text style={styles.addPhotosText}>Add Lost & Found</Text>
        </TouchableOpacity>
      )}

      {/* Items Display - For Stayover/Turndown */}
      {showItems && (
        <View style={styles.itemsContainer}>
          {items.map((item) => (
            <LostAndFoundItemCard
              key={item.id}
              item={item}
              onPress={() => onItemPress?.(item)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 0,
    paddingBottom: 12 * scaleX,
    overflow: 'visible',
    paddingHorizontal: 0,
  },
  title: {
    paddingHorizontal: 20 * scaleX,
    marginBottom: 12 * scaleX,
    fontSize: LOST_AND_FOUND.title.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: LOST_AND_FOUND.title.color,
    lineHeight: LOST_AND_FOUND.title.fontSize * scaleX,
  },
  box: {
    alignSelf: 'center',
    width: LOST_AND_FOUND.box.width * scaleX,
    height: LOST_AND_FOUND.box.height * scaleX,
    borderRadius: LOST_AND_FOUND.box.borderRadius * scaleX,
    borderWidth: LOST_AND_FOUND.box.borderWidth,
    borderColor: LOST_AND_FOUND.box.borderColor,
    borderStyle: LOST_AND_FOUND.box.borderStyle,
    backgroundColor: LOST_AND_FOUND.box.backgroundColor,
    // Horizontal flex layout: icon on left, text on right
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around', // Space around items, not between
    paddingHorizontal: 16 * scaleX,
  },
  iconContainer: {
    position: 'relative',
    width: LOST_AND_FOUND.icon.width * scaleX,
    height: LOST_AND_FOUND.icon.height * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: LOST_AND_FOUND.icon.width * scaleX,
    height: LOST_AND_FOUND.icon.height * scaleX,
  },
  plusIcon: {
    position: 'absolute',
    // Plus icon positioned at top-right of the icon
    // From constants: plusIcon left: 213, top: 23 (relative to box)
    // Icon is at left: 160, so plus offset from icon left: 213 - 160 = 53px
    // Icon top is at 31.02px, plus top is at 23px, so plus offset: 23 - 31.02 = -8.02px
    left: (LOST_AND_FOUND.plusIcon.left - LOST_AND_FOUND.icon.left) * scaleX, // 213 - 160 = 53px from icon left
    top: (LOST_AND_FOUND.plusIcon.top - LOST_AND_FOUND.icon.top) * scaleX, // 23 - 31.02 = -8.02px from icon top
    fontSize: LOST_AND_FOUND.plusIcon.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.light as any,
    color: LOST_AND_FOUND.plusIcon.color,
  },
  addPhotosText: {
    fontSize: LOST_AND_FOUND.addPhotosText.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: LOST_AND_FOUND.addPhotosText.color,
    // Text on the right side of the flex container
    textAlign: 'right',
  },
  itemsContainer: {
    width: '100%',
    flexDirection: 'column',
  },
});

