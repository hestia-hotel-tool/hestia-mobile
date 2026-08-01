/**
 * Clean Checklist Section - Figma node 2702:2572 (1772-255)
 * https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=1772-255
 * Same pattern as Inspection Checklist: icon + label + checkbox per item, Optional (Add Photo, Add Notes), Slide to complete.
 */

import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { typography } from '@/theme';
import { CHECKLIST_SECTION, CLEAN_CHECKLIST, scaleX } from '../../constants/checklistStyles';
import { CONTENT_AREA } from '../../constants/roomDetailStyles';

const CLEAN_CHECKLIST_ITEMS = [
  { id: 'curtains', icon: 'sunny-outline' as const, label: 'Curtains/blinds properly arranged' },
  { id: 'minibar', icon: 'wine-outline' as const, label: 'Items in the mini bar checked and replaced' },
] as const;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const horizontalPadding = CHECKLIST_SECTION.container.paddingHorizontal * scaleX;
const contentWidth = SCREEN_WIDTH - horizontalPadding * 2;
const SLIDE_TRACK_WIDTH = contentWidth - 48 * scaleX - 50;
const COMPLETE_THRESHOLD = 0.85;

interface CleanChecklistSectionProps {
  roomNumber?: string;
  roomCode?: string;
  onComplete?: () => void;
  onAddPhoto?: () => void;
  onAddNotes?: () => void;
}

export default function CleanChecklistSection({
  onComplete,
  onAddPhoto,
  onAddNotes,
}: CleanChecklistSectionProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const thumbPosition = useRef(new Animated.Value(0)).current;

  const allChecked = CLEAN_CHECKLIST_ITEMS.every((item) => checkedItems[item.id]);

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => allChecked,
        onMoveShouldSetPanResponder: () => allChecked,
        onPanResponderGrant: () => {},
        onPanResponderMove: (_, gestureState) => {
          if (!allChecked) return;
          const maxX = SLIDE_TRACK_WIDTH;
          const x = Math.max(0, Math.min(gestureState.dx, maxX));
          thumbPosition.setValue(x);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!allChecked) return;
          const maxX = SLIDE_TRACK_WIDTH;
          const x = Math.max(0, Math.min(gestureState.dx, maxX));
          if (x >= maxX * COMPLETE_THRESHOLD) {
            Animated.timing(thumbPosition, {
              toValue: maxX,
              duration: 150,
              useNativeDriver: true,
            }).start(() => onComplete?.());
          } else {
            Animated.spring(thumbPosition, {
              toValue: 0,
              useNativeDriver: true,
              tension: 80,
              friction: 10,
            }).start();
          }
        },
      }),
    [allChecked, onComplete]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Clean Checklist</Text>
        <View style={[styles.divider, styles.dividerAfterTitle]} />

        {CLEAN_CHECKLIST_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.checklistItem}
            onPress={() => toggleCheck(item.id)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={24 * scaleX} color="#334866" />
            </View>
            <Text style={styles.checklistLabel}>{item.label}</Text>
            <View style={[styles.checkbox, checkedItems[item.id] && styles.checkboxChecked]}>
              {checkedItems[item.id] && (
                <Svg width={18 * scaleX} height={18 * scaleX} viewBox="0 0 24 24" fill="none" stroke="#4a91fc" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M5 12l5 5L20 7" />
                </Svg>
              )}
            </View>
          </TouchableOpacity>
        ))}

        <View style={[styles.divider, styles.dividerBeforeOptional]} />
        <Text style={styles.optionalTitle}>Optional</Text>

        <TouchableOpacity style={styles.optionalItem} onPress={onAddPhoto} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <View style={styles.iconCircle}>
            <Ionicons name="image-outline" size={24 * scaleX} color="#334866" />
          </View>
          <Text style={styles.optionalLabel}>Add Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionalItem} onPress={onAddNotes} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <View style={styles.iconCircle}>
            <Ionicons name="create-outline" size={24 * scaleX} color="#334866" />
          </View>
          <Text style={styles.optionalLabel}>Add Notes</Text>
        </TouchableOpacity>

        <View style={styles.slideSection}>
          <View
            style={[styles.slideTrack, !allChecked && styles.slideTrackDisabled]}
            {...panResponder.panHandlers}
          >
            <Animated.View style={[styles.slideThumb, { transform: [{ translateX: thumbPosition }] }]}>
              <Ionicons name="checkmark-circle" size={28 * scaleX} color="#4a91fc" />
            </Animated.View>
            <Text style={[styles.slideLabel, !allChecked && styles.slideLabelDisabled]}>Slide to complete</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: CONTENT_AREA.top * scaleX,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: horizontalPadding,
    paddingTop: CHECKLIST_SECTION.container.marginTop,
    paddingBottom: 40 * scaleX,
  },
  title: {
    fontSize: CLEAN_CHECKLIST.title.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: CLEAN_CHECKLIST.title.fontWeight as any,
    color: CLEAN_CHECKLIST.title.color,
  },
  divider: {
    height: CLEAN_CHECKLIST.divider.height,
    backgroundColor: CLEAN_CHECKLIST.divider.backgroundColor,
    width: '100%',
  },
  dividerAfterTitle: {
    marginTop: CLEAN_CHECKLIST.dividerAfterTitle.marginTop,
    marginBottom: CLEAN_CHECKLIST.dividerAfterTitle.marginBottom,
  },
  dividerBeforeOptional: {
    marginTop: 20 * scaleX,
    marginBottom: 16 * scaleX,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: CLEAN_CHECKLIST.item.marginBottom,
  },
  iconCircle: {
    width: CLEAN_CHECKLIST.item.iconCircle.size,
    height: CLEAN_CHECKLIST.item.iconCircle.size,
    borderRadius: CLEAN_CHECKLIST.item.iconCircle.borderRadius,
    backgroundColor: CLEAN_CHECKLIST.item.iconCircle.backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: CLEAN_CHECKLIST.item.iconMarginRight,
  },
  checklistLabel: {
    flex: 1,
    fontSize: CLEAN_CHECKLIST.item.labelFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: CLEAN_CHECKLIST.item.labelColor,
  },
  checkbox: {
    width: CLEAN_CHECKLIST.item.checkboxSize,
    height: CLEAN_CHECKLIST.item.checkboxSize,
    borderRadius: CLEAN_CHECKLIST.item.checkboxBorderRadius,
    borderWidth: 3,
    borderColor: '#5A759D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: '#4a91fc',
  },
  optionalTitle: {
    fontSize: CLEAN_CHECKLIST.optional.titleFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: CLEAN_CHECKLIST.optional.titleColor,
    marginBottom: CLEAN_CHECKLIST.optional.marginBottom,
  },
  optionalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: CLEAN_CHECKLIST.optional.itemMarginBottom,
  },
  optionalLabel: {
    fontSize: CLEAN_CHECKLIST.optional.itemLabelFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: CLEAN_CHECKLIST.optional.itemLabelWeight as any,
    color: CLEAN_CHECKLIST.optional.itemLabelColor,
  },
  slideSection: {
    marginTop: CLEAN_CHECKLIST.slide.marginTop,
  },
  slideTrack: {
    height: CLEAN_CHECKLIST.slide.trackHeight,
    backgroundColor: CLEAN_CHECKLIST.slide.trackBg,
    borderRadius: CLEAN_CHECKLIST.slide.trackBorderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6 * scaleX,
    overflow: 'hidden',
  },
  slideTrackDisabled: {
    opacity: 0.6,
  },
  slideThumb: {
    width: CLEAN_CHECKLIST.slide.thumbSize,
    height: CLEAN_CHECKLIST.slide.thumbSize,
    borderRadius: CLEAN_CHECKLIST.slide.thumbSize / 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  slideLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: CLEAN_CHECKLIST.slide.labelFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: CLEAN_CHECKLIST.slide.labelWeight as any,
    color: CLEAN_CHECKLIST.slide.labelColor,
  },
  slideLabelDisabled: {
    color: '#9ca3af',
  },
});
