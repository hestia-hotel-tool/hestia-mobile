import { useState, useCallback } from 'react';

/**
 * Hook for managing pull-to-refresh functionality
 */
export const useRefresh = (onRefresh: () => Promise<void> | void) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return {
    refreshing,
    onRefresh: handleRefresh,
  };
};

