import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { typography } from '@/theme';
import { scaleX } from '../constants/roomDetailStyles';

interface TaskCardProps {
  title?: string;
  description: string;
  style?: any;
  showAddButton?: boolean;
  onAddPress?: () => void;
}

/**
 * Reusable Task Card Component
 * Displays a task title and description
 * Used in Return Later modal and other places where task details are shown
 */
export default function TaskCard({ 
  title = 'Task', 
  description, 
  style, 
  showAddButton = false,
  onAddPress 
}: TaskCardProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {showAddButton && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAddPress}
            activeOpacity={0.7}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8 * scaleX,
  },
  title: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#000000',
  },
  addButton: {
    width: 74 * scaleX,
    height: 39 * scaleX,
    borderRadius: 41 * scaleX,
    borderWidth: 1,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.light as any,
    color: '#000000',
  },
  description: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.light as any,
    color: '#000000',
    lineHeight: 18 * scaleX,
  },
});
