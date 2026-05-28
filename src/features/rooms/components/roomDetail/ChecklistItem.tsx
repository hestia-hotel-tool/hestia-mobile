import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, TextInput } from 'react-native';
import { typography } from '@shared/theme';
import { CHECKLIST_SECTION, scaleX } from '../../constants/checklistStyles';
import type { ChecklistItem as ChecklistItemType } from '../../types/checklist.types';

interface ChecklistItemProps {
  item: ChecklistItemType;
  onQuantityChange: (itemId: string, quantity: number) => void;
}

export default function ChecklistItem({
  item,
  onQuantityChange,
}: ChecklistItemProps) {
  const handleDecrease = () => {
    if (item.quantity > 0) {
      onQuantityChange(item.id, item.quantity - 1);
    }
  };

  const handleIncrease = () => {
    const maxQuantity = item.initialStock || 999;
    if (item.quantity < maxQuantity) {
      onQuantityChange(item.id, item.quantity + 1);
    }
  };

  const handleQuantityInput = (text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= 0) {
      const maxQuantity = item.initialStock || 999;
      const clampedQuantity = Math.min(num, maxQuantity);
      onQuantityChange(item.id, clampedQuantity);
    } else if (text === '') {
      onQuantityChange(item.id, 0);
    }
  };

  return (
    <View style={styles.container}>
      {/* Product Image with Badge */}
      <View style={styles.imageContainer}>
        <Image
          source={item.image}
          style={styles.itemImage}
          resizeMode="contain"
        />
        {/* Quantity Badge - show for all products when quantity is 1 or above */}
        {item.quantity >= 1 && (
          <View style={styles.initialStockBadge}>
            <Text style={styles.initialStockText}>{item.quantity}</Text>
          </View>
        )}
      </View>

      {/* Item Info Container */}
      <View style={styles.itemInfo}>
        {/* Description - Format differently for Mini Bar vs Laundry */}
        {item.categoryId === 'minibar' ? (
          <Text style={styles.description}>
            How many bottles of <Text style={styles.itemName}>{item.name}</Text> was consumed
          </Text>
        ) : (
          <Text style={styles.description}>{item.description}</Text>
        )}
      </View>

      {/* Quantity Selector */}
      <View style={styles.quantitySelector}>
        <TouchableOpacity
          style={[styles.quantityButton, styles.quantityButtonMinus, item.quantity === 0 && styles.quantityButtonDisabled]}
          onPress={handleDecrease}
          disabled={item.quantity === 0}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.quantityButtonText, styles.quantityButtonTextMinus, item.quantity === 0 && styles.quantityButtonTextDisabled]}>
            −
          </Text>
        </TouchableOpacity>

        <TextInput
          style={styles.quantityInput}
          value={item.quantity.toString()}
          onChangeText={handleQuantityInput}
          keyboardType="numeric"
          selectTextOnFocus
          scrollEnabled={false}
          editable={true}
          multiline={false}
          numberOfLines={1}
        />

        <TouchableOpacity
          style={[
            styles.quantityButton,
            styles.quantityButtonPlus,
            item.initialStock !== undefined && item.quantity >= item.initialStock && styles.quantityButtonDisabled
          ]}
          onPress={handleIncrease}
          disabled={item.initialStock !== undefined && item.quantity >= item.initialStock}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text
            style={[
              styles.quantityButtonText,
              styles.quantityButtonTextPlus,
              item.initialStock !== undefined && item.quantity >= item.initialStock && styles.quantityButtonTextDisabled
            ]}
          >
            +
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20 * scaleX,
    paddingVertical: 8 * scaleX,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 16 * scaleX,
  },
  itemImage: {
    width: 50 * scaleX,
    height: 50 * scaleX,
  },
  initialStockBadge: {
    position: 'absolute',
    bottom: -8 * scaleX,
    right: -4 * scaleX,
    backgroundColor: '#ffffff',
    borderRadius: 12 * scaleX,
    width: 24 * scaleX,
    height: 24 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  initialStockText: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'bold' as any,
    color: '#000000',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12 * scaleX,
  },
  itemName: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'bold' as any,
    color: '#000000',
  },
  description: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'light' as any,
    color: '#666666',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32 * scaleX,
    height: 32 * scaleX,
    borderRadius: 16 * scaleX, // Make it circular
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonMinus: {
    backgroundColor: '#f5f5f5', // Light grey
    marginRight: 2 * scaleX,
  },
  quantityButtonPlus: {
    backgroundColor: '#e3ecf5', // Light blue
    marginLeft: 2 * scaleX,
  },
  quantityButtonDisabled: {
    backgroundColor: '#f0f0f0',
    opacity: 0.5,
  },
  quantityButtonText: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'bold' as any,
  },
  quantityButtonTextMinus: {
    color: '#666666', // Dark grey
  },
  quantityButtonTextPlus: {
    color: '#5a759d', // Dark blue
  },
  quantityButtonTextDisabled: {
    color: '#999999',
  },
  quantityInput: {
    width: 50 * scaleX,
    height: 36 * scaleX, // Increased height to ensure text is fully visible
    textAlign: 'center',
    fontSize: 14 * scaleX,
    lineHeight: 18 * scaleX, // Add line height for proper text display
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'regular' as any,
    color: '#000000',
    backgroundColor: '#ffffff',
    paddingHorizontal: 4 * scaleX,
    paddingVertical: 0, // Remove vertical padding to allow proper centering
    paddingTop: 0,
    paddingBottom: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    overflow: 'hidden',
    // No border as per Figma design
    marginHorizontal: 1 * scaleX,
  },
});
