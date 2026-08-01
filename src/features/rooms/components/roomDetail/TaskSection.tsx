import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { typography } from '@/theme';
import { scaleX, TASK_SECTION, ASSIGNED_TASK_CARD } from '../../constants/roomDetailStyles';
import TaskItem from './TaskItem';
import type { Task } from '../../types/roomDetail.types';

interface TaskSectionProps {
  tasks?: Task[];
  onAddPress?: () => void;
  onSeeMorePress?: (task: Task) => void; // Callback to open view task modal
  cardHeight?: number; // Dynamic card height based on room type (defaults to 206.09)
}

export default function TaskSection({ tasks = [], onAddPress, onSeeMorePress, cardHeight = 206.09 }: TaskSectionProps) {
  const [taskHeights, setTaskHeights] = useState<{ [key: string]: number }>({});
  
  // Handle height measurement from TaskItem
  const handleTaskHeightMeasured = useCallback((taskId: string, height: number) => {
    setTaskHeights(prev => {
      if (prev[taskId] !== height) {
        return { ...prev, [taskId]: height };
      }
      return prev;
    });
  }, []);


  // Fallback estimation for initial render before heights are measured
  // Returns height in unscaled pixels (will be scaled in TaskItem)
  // Includes space for "see more" button if text is long
  const estimateTaskHeight = (text: string): number => {
    const charsPerLine = 50;
    const lineHeight = 18; // Unscaled line height
    const estimatedLines = Math.ceil(text.length / charsPerLine);
    const textHeight = estimatedLines * lineHeight;
    const padding = 16; // Top and bottom padding (unscaled)
    const seeMoreButtonHeight = textHeight > (2 * lineHeight) ? 20 : 0; // Add space for "see more" if text exceeds 2 lines
    return textHeight + padding + seeMoreButtonHeight;
  };
  
  // No longer need to calculate positions since tasks are in a ScrollView with relative positioning

  // Dynamic container height based on card height
  // TaskSection container starts at 80px (after divider at 80px), so available height = cardHeight - 80
  const CONTAINER_HEIGHT = cardHeight - 80; // Dynamic height based on card height
  
  // Calculate scrollable area height
  // From Figma: Task title at 777px absolute, card at 674px = 103px from card top (relative to card content)
  // Title and Add button area: title top (103px) + button height (39px) - container start (80px) = 62px
  // Available scroll height = container height - (title/button area + spacing)
  const TITLE_BUTTON_AREA = 103 + 39 - 80 + 8; // 103px from card + 39px button - 80px container start + 8px spacing = 70px
  const SCROLL_VIEW_HEIGHT = CONTAINER_HEIGHT - TITLE_BUTTON_AREA; // Dynamic based on card height

  return (
    <View style={[styles.container, { height: CONTAINER_HEIGHT * scaleX }]}>
      {/* Section Title */}
      <Text style={styles.title}>Task</Text>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={onAddPress}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>

      {/* Scrollable Tasks List */}
      <ScrollView
        style={[styles.scrollView, { height: SCROLL_VIEW_HEIGHT * scaleX }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {tasks.map((task, index) => {
          return (
            <TaskItem
              key={task.id}
              task={task}
              absoluteTop={0} // No longer using absolute positioning
              contentAreaTop={0}
              onHeightMeasured={(height) => handleTaskHeightMeasured(task.id, height)}
              onSeeMorePress={onSeeMorePress}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 81 * scaleX, // Start after divider (80px divider + 1px divider height = 81px from card content top)
    left: 0,
    width: '100%',
    // height is set dynamically in component based on cardHeight prop
    zIndex: 0, // Below divider and Assigned to section
    overflow: 'hidden', // Clip tasks that extend beyond container
    paddingHorizontal: 16 * scaleX, // Add horizontal padding matching card padding
  },
  title: {
    position: 'absolute',
    // From Figma: Task title at 777px absolute
    // Card starts at 674px, so relative to card: 777 - 674 = 103px
    // Container starts at 80px from card top, so relative to container: 103 - 80 = 23px
    top: (777 - 674 - 80) * scaleX, // 23px from container top
    left: (TASK_SECTION.title.left - ASSIGNED_TASK_CARD.left) * scaleX, // Adjust for card left position
    fontSize: TASK_SECTION.title.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: TASK_SECTION.title.color,
    lineHeight: TASK_SECTION.title.fontSize * scaleX,
    includeFontPadding: false,
  },
  addButton: {
    position: 'absolute',
    // From Figma: Task Add button at 761px absolute (using taskAddButton from constants)
    // Card starts at 674px, so relative to card: 761 - 674 = 87px
    // Container starts at 81px from card top, so relative to container: 87 - 81 = 6px
    top: (761 - 674 - 81) * scaleX, // 6px from container top
    right: 16 * scaleX, // Position from right edge to ensure it's fully visible
    width: TASK_SECTION.addButton.width * scaleX,
    height: TASK_SECTION.addButton.height * scaleX,
    borderRadius: TASK_SECTION.addButton.borderRadius * scaleX,
    borderWidth: TASK_SECTION.addButton.borderWidth,
    borderColor: TASK_SECTION.addButton.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: TASK_SECTION.addButton.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.light as any,
    color: TASK_SECTION.addButton.color,
  },
  scrollView: {
    marginTop: ((761 - 674 - 81) + TASK_SECTION.addButton.height + 8) * scaleX, // Start after Add button with 8px spacing: 6 + 39 + 8 = 53px
  },
  scrollContent: {
    paddingBottom: 8 * scaleX, // Add padding at bottom for better scrolling
  },
});
