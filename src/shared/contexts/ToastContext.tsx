/**
 * Toast helper – show short-lived messages (success, error, info).
 * Use useToast() in components; use getToast() in utils/non-React code.
 */

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

export type ToastType = 'info' | 'success' | 'error';

export interface ToastOptions {
  title?: string;
  type?: ToastType;
  duration?: number;
}

export interface ToastApi {
  show: (message: string, options?: ToastOptions) => void;
  hide: () => void;
}

interface ToastState {
  message: string;
  title?: string;
  type: ToastType;
}

const defaultState: ToastState = { message: '', type: 'info' };

const ToastContext = createContext<ToastApi | undefined>(undefined);

const toastRef = { current: null as ToastApi | null };

export function getToast(): ToastApi | null {
  return toastRef.current;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<ToastState>(defaultState);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState(defaultState);
  }, []);

  const show = useCallback((message: string, options?: ToastOptions) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const type = options?.type ?? 'info';
    const duration = options?.duration ?? 3000;
    setState({ message, title: options?.title, type });
    timeoutRef.current = setTimeout(hide, duration);
  }, [hide]);

  const api: ToastApi = React.useMemo(() => ({ show, hide }), [show, hide]);
  toastRef.current = api;

  const visible = state.message.length > 0;
  const bgColor =
    state.type === 'error'
      ? colors.status?.dirty ?? '#f92424'
      : state.type === 'success'
        ? colors.status?.inspected ?? '#41d541'
        : colors.primary?.main ?? '#5a759d';

  return (
    <ToastContext.Provider value={api}>
      {children}
      {visible && (
        <View
          style={[
            styles.toast,
            { top: insets.top + 8, marginHorizontal: 16 * scaleX },
            { backgroundColor: bgColor },
          ]}
        >
          {state.title ? (
            <Text style={styles.title} numberOfLines={1}>
              {state.title}
            </Text>
          ) : null}
          <Text style={styles.message} numberOfLines={3}>
            {state.message}
          </Text>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingVertical: 12 * scaleX,
    paddingHorizontal: 16 * scaleX,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as string,
    fontSize: 14 * scaleX,
    color: colors.text.white,
    marginBottom: 2,
  },
  message: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as string,
    fontSize: 13 * scaleX,
    color: colors.text.white,
  },
});
