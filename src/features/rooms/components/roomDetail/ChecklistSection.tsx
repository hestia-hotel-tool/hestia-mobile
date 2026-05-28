import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useToast } from '@shared/contexts/ToastContext';
import { typography } from '@shared/theme';
import { CHECKLIST_SECTION, scaleX } from '../../constants/checklistStyles';
import { CONTENT_AREA } from '../../constants/roomDetailStyles';
import ChecklistCategory from './ChecklistCategory';
import ChecklistFooter from './ChecklistFooter';
import DownloadReportButton from './DownloadReportButton';
import type { ChecklistData, ChecklistSubmissionData } from '../../types/checklist.types';
import { getDefaultChecklist } from '@/data/mockChecklistData';
import { generateChecklistReport } from '../../utils/generateChecklistReport';

interface ChecklistSectionProps {
  roomNumber: string;
  roomCode?: string;
  roomStatus?: string;
  onSubmit?: (data: ChecklistSubmissionData) => void;
  onCancel?: () => void;
  initialData?: ChecklistData;
}

export default function ChecklistSection({
  roomNumber,
  roomCode,
  roomStatus,
  onSubmit,
  onCancel,
  initialData,
}: ChecklistSectionProps) {
  const toast = useToast();
  // Get current user from auth context
  const currentUser = { id: 'user-1', name: 'Staff Member', initials: 'SM' };

  // Format current date and time
  const formatDate = (date: Date): string => {
    const day = date.getDate();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Store initial state for comparison
  const getInitialData = useCallback(() => {
    if (initialData) {
      return initialData;
    }
    // Initialize with default template
    const now = new Date();
    const defaultData = getDefaultChecklist(roomNumber);
    return {
      ...defaultData,
      registeredBy: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      },
      registeredAt: {
        time: formatTime(now),
        date: formatDate(now),
      },
    };
  }, [initialData, roomNumber, currentUser]);

  const [checklistData, setChecklistData] = useState<ChecklistData>(getInitialData);
  const [initialChecklistData] = useState<ChecklistData>(getInitialData);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // At least one product consumed (quantity > 0) - download only enabled in that case
  const hasConsumedProducts = useMemo(
    () =>
      checklistData.categories.some((cat) =>
        cat.items.some((item) => item.quantity > 0)
      ),
    [checklistData]
  );

  const handleDownloadReport = useCallback(async () => {
    if (!hasConsumedProducts || isGeneratingReport) return;
    try {
      setIsGeneratingReport(true);
      await generateChecklistReport({
        roomNumber,
        roomCode,
        checklistData,
      });
    } catch (error) {
      console.error('Error downloading checklist report:', error);
      toast.show('Failed to generate report. Please try again.', { type: 'error', title: 'Error' });
    } finally {
      setIsGeneratingReport(false);
    }
  }, [roomNumber, roomCode, checklistData, hasConsumedProducts, isGeneratingReport]);

  // Check if there are any changes
  const hasChanges = useCallback(() => {
    const currentItems = checklistData.categories.flatMap((cat) =>
      cat.items.map((item) => ({ id: item.id, quantity: item.quantity }))
    );
    const initialItems = initialChecklistData.categories.flatMap((cat) =>
      cat.items.map((item) => ({ id: item.id, quantity: item.quantity }))
    );

    // Compare quantities - check if any item has a different quantity
    if (currentItems.length !== initialItems.length) {
      return true;
    }

    for (const currentItem of currentItems) {
      const initialItem = initialItems.find((item) => item.id === currentItem.id);
      if (!initialItem || initialItem.quantity !== currentItem.quantity) {
        return true;
      }
    }

    return false;
  }, [checklistData, initialChecklistData]);

  const handleQuantityChange = useCallback((itemId: string, quantity: number) => {
    setChecklistData((prev) => {
      const updated = { ...prev };
      
      // Find and update the item quantity
      updated.categories = updated.categories.map((category) => ({
        ...category,
        items: category.items.map((item) =>
          item.id === itemId ? { ...item, quantity } : item
        ),
      }));

      return updated;
    });

    // TODO: Auto-save to backend/API (optional)
    console.log('Checklist item quantity changed:', itemId, quantity);
  }, []);

  const handleLoadMore = useCallback(() => {
    // TODO: Load more items for Mini Bar section
    console.log('Load more items requested');
  }, []);

  const handleSubmit = useCallback(() => {
    const submissionData: ChecklistSubmissionData = {
      roomNumber: checklistData.roomNumber,
      items: checklistData.categories.flatMap((category) =>
        category.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
        }))
      ),
      registeredBy: checklistData.registeredBy.id,
      registeredAt: new Date().toISOString(),
    };

    if (onSubmit) {
      onSubmit(submissionData);
    }

    // TODO: Save to backend/API
    console.log('Checklist submitted:', submissionData);
  }, [checklistData, onSubmit]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      // Default: reset to initial state
      const defaultData = getDefaultChecklist(roomNumber);
      setChecklistData({
        ...defaultData,
        registeredBy: checklistData.registeredBy,
        registeredAt: checklistData.registeredAt,
      });
    }
  }, [roomNumber, onCancel, checklistData.registeredBy, checklistData.registeredAt]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Download Report Button - only when at least one product consumed */}
        {hasConsumedProducts && (
          <DownloadReportButton
            onPress={handleDownloadReport}
            isLoading={isGeneratingReport}
          />
        )}

        {/* Title */}
        <Text style={styles.title}>Room Checklist</Text>

        {/* Categories */}
        {checklistData.categories.map((category) => (
          <ChecklistCategory
            key={category.id}
            category={category}
            onQuantityChange={handleQuantityChange}
            onLoadMore={category.showLoadMore ? handleLoadMore : undefined}
          />
        ))}
      </ScrollView>

      {/* Footer */}
      <ChecklistFooter
        registeredBy={checklistData.registeredBy}
        registeredAt={checklistData.registeredAt}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        hasChanges={hasChanges()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: CONTENT_AREA.top * scaleX, // Match content area start position
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: CHECKLIST_SECTION.container.paddingHorizontal,
    paddingTop: CHECKLIST_SECTION.container.marginTop,
    paddingBottom: 20 * scaleX,
  },
  title: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'bold' as any,
    color: CHECKLIST_SECTION.title.color,
    marginBottom: 24 * scaleX,
  },
});
