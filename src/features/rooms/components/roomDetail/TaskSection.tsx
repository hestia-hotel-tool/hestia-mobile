import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { typography } from '@/theme';
import { scaleX, TASK_SECTION } from '../../constants/roomDetailStyles';
import TaskItem from './TaskItem';
import type { Task } from '../../types/roomDetail.types';

interface TaskSectionProps {
  tasks?: Task[];
  onAddPress?: () => void;
  /** Opens the full task in ViewTaskModal. */
  onSeeMorePress?: (task: Task) => void;
}

/**
 * The Task half of the Assigned/Task card — title, Add button, and the tasks.
 *
 * Laid out in flow. It used to position itself absolutely inside a card of a
 * fixed height, with the title and Add button pinned to offsets derived from
 * Figma's absolute y-coordinates and the list given a height computed by
 * subtracting them — which only held for one card height and clipped whatever
 * did not fit. The Overview is a flex column, so this stretches the card to
 * whatever its tasks need instead.
 */
export default function TaskSection({ tasks = [], onAddPress, onSeeMorePress }: TaskSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Task</Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add task"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          absoluteTop={0}
          contentAreaTop={0}
          onSeeMorePress={onSeeMorePress}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16 * scaleX,
    paddingTop: 12 * scaleX,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8 * scaleX,
  },
  title: {
    fontSize: TASK_SECTION.title.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: TASK_SECTION.title.color,
    includeFontPadding: false,
  },
  addButton: {
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
});
