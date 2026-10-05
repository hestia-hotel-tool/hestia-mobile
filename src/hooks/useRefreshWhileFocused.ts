import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

/**
 * Keep a screen's data current without realtime.
 *
 * Calls `refresh` when the screen comes back into focus (not on its first
 * focus — the screen's own load covers that), every `intervalMs` while it is
 * focused, and when the app returns to the foreground while it is focused.
 *
 * For screens over tables that are not in the realtime publication — `rooms`
 * and `room_assignments` — where a room assigned or started elsewhere would
 * otherwise never show until the screen was reopened. With `freezeOnBlur`
 * a screen left open behind another one keeps its first load indefinitely.
 */
export function useRefreshWhileFocused(refresh: () => void, intervalMs = 30_000) {
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const focusedOnce = useRef(false);
  const focused = useRef(false);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (focusedOnce.current) refreshRef.current();
      focusedOnce.current = true;
      const timer = intervalMs > 0 ? setInterval(() => refreshRef.current(), intervalMs) : null;
      return () => {
        focused.current = false;
        if (timer) clearInterval(timer);
      };
    }, [intervalMs])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && focused.current) refreshRef.current();
    });
    return () => sub.remove();
  }, []);
}

export default useRefreshWhileFocused;
