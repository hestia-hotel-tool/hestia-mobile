import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Animated } from 'react-native';
import { typography } from '@/theme';
import { CHECKLIST_SECTION, scaleX } from '../../constants/checklistStyles';
import ChecklistItem from './ChecklistItem';
import type { ChecklistCategory as ChecklistCategoryType } from '../../types/checklist.types';

interface ChecklistCategoryProps {
  category: ChecklistCategoryType;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onLoadMore?: () => void;
}

export default function ChecklistCategory({
  category,
  onQuantityChange,
  onLoadMore,
}: ChecklistCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [animation] = useState(new Animated.Value(0)); // 0 = expanded (pointing down), 180 = collapsed (pointing up)

  const handleToggle = () => {
    const toValue = isExpanded ? 180 : 0; // Rotate to 180deg when collapsing
    Animated.timing(animation, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const rotateInterpolate = animation.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.container}>
      {/* Category Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.categoryTitle}>{category.name}</Text>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Image
            source={require('../../../../../assets/icons/dropdown-arrow.png')}
            style={styles.chevron}
            resizeMode="contain"
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Category Items - Collapsible */}
      {isExpanded && (
        <View style={styles.itemsContainer}>
          {category.items.map((item) => (
            <ChecklistItem
              key={item.id}
              item={item}
              onQuantityChange={onQuantityChange}
            />
          ))}

          {/* Load More Link (for Mini Bar) */}
          {category.showLoadMore && onLoadMore && (
            <TouchableOpacity
              style={styles.loadMoreContainer}
              onPress={onLoadMore}
              activeOpacity={0.7}
            >
              <Text style={styles.loadMoreText}>Load more</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24 * scaleX,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12 * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryTitle: {
    fontSize: CHECKLIST_SECTION.category.header.fontSize * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: CHECKLIST_SECTION.category.header.fontWeight as any,
    color: CHECKLIST_SECTION.category.header.color,
  },
  chevron: {
    width: 16 * scaleX,
    height: 16 * scaleX,
    tintColor: '#5a759d',
  },
  itemsContainer: {
    paddingTop: 12 * scaleX,
  },
  loadMoreContainer: {
    paddingVertical: 12 * scaleX,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.regular,
    fontWeight: 'regular' as any,
    color: '#5a759d',
  },
});
