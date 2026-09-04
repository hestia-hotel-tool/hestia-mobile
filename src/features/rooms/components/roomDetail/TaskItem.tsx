import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { typography } from '@/theme';
import { scaleX } from '../../constants/roomDetailStyles';
import type { Task } from '../../types/roomDetail.types';

interface TaskItemProps {
  task: Task;
  absoluteTop: number; // Position relative to TaskSection container (already calculated)
  contentAreaTop: number; // Should be 0 (relative to container)
  onHeightMeasured?: (height: number) => void;
  onSeeMorePress?: (task: Task) => void; // Callback to open modal
}

const MAX_LINES = 2; // Maximum lines to show before truncating
const LINE_HEIGHT = 18; // Line height in unscaled pixels

export default function TaskItem({
  task,
  absoluteTop,
  contentAreaTop,
  onHeightMeasured,
  onSeeMorePress,
}: TaskItemProps) {
  const [showSeeMore, setShowSeeMore] = useState(false);
  const [textHeight, setTextHeight] = useState<number>(0);
  const containerRef = React.useRef<View>(null);
  const textRef = React.useRef<Text>(null);
  const fullTextRef = React.useRef<Text>(null);

  // Measure full text height to determine if truncation is needed
  const handleFullTextLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setTextHeight(height);
    const maxHeight = MAX_LINES * LINE_HEIGHT * scaleX;
    setShowSeeMore(height > maxHeight);
  };

  // Calculate if text needs truncation (rough estimate for initial render)
  const charsPerLine = 50;
  const maxChars = MAX_LINES * charsPerLine;
  const estimatedNeedsTruncation = task.text.length > maxChars;

  // Initialize showSeeMore based on estimated length
  useEffect(() => {
    if (textHeight === 0) {
      setShowSeeMore(estimatedNeedsTruncation);
    }
  }, [task.text, textHeight, estimatedNeedsTruncation]);

  // Get truncated text for display
  const getDisplayText = () => {
    if (!showSeeMore) {
      return task.text;
    }
    // Truncate to approximately 2 lines worth of text
    // Leave space for " see more" (9 characters)
    const truncateLength = Math.max(0, maxChars - 9);
    return task.text.substring(0, truncateLength);
  };

  // Handle see more press - open modal
  const handleSeeMorePress = () => {
    if (onSeeMorePress) {
      onSeeMorePress(task);
    }
  };

  // Measure container height for positioning
  useEffect(() => {
    if (containerRef.current && onHeightMeasured) {
      // Use setTimeout to ensure layout has completed
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.measure((x, y, width, height) => {
            onHeightMeasured(height);
          });
        }
      }, 0);
    }
  }, [task.text, showSeeMore, onHeightMeasured]);

  // Reset when task changes
  useEffect(() => {
    setTextHeight(0);
    setShowSeeMore(estimatedNeedsTruncation);
  }, [task.id, estimatedNeedsTruncation]);

  return (
    <View
      ref={containerRef}
      style={styles.container}
    >
      {/* Hidden text to measure full height */}
      <Text
        ref={fullTextRef}
        style={[styles.taskText, styles.hiddenText]}
        onLayout={handleFullTextLayout}
      >
        {task.text}
      </Text>
      {/* Text with inline "see more" button */}
      <Text
        ref={textRef}
        style={styles.taskText}
        numberOfLines={!showSeeMore ? MAX_LINES : undefined}
      >
        {getDisplayText()}
        {showSeeMore && (
          <>
            {' '}
            <Text
              style={styles.seeMoreText}
              onPress={handleSeeMorePress}
            >
              see more
            </Text>
          </>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative', // Changed from absolute to relative for scrollable layout
    paddingHorizontal: 0, // Padding handled by ScrollView
    paddingVertical: 8 * scaleX,
    marginBottom: 8 * scaleX, // Spacing between tasks
  },
  taskText: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.regular,
    fontWeight: typography.fontWeights.regular as any,
    color: '#1e1e1e',
    lineHeight: LINE_HEIGHT * scaleX,
  },
  hiddenText: {
    position: 'absolute',
    opacity: 0,
    zIndex: -1,
    width: '100%',
  },
  seeMoreText: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.regular,
    fontWeight: typography.fontWeights.regular as any,
    color: '#5a759d',
  },
});
