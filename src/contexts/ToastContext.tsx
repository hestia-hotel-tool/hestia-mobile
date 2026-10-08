/**
 * Toast helper – show short-lived messages (success, error, info) and
 * incoming notifications. Use useToast() in components; use getToast() in
 * utils/non-React code.
 *
 * Figma 4443:224: a white card (406 x 112, radius 15, 1pt #e1e1e1 border, a
 * soft 12% shadow) under the status bar, holding a 93 x 61 pill in the
 * event's colour with its white glyph, then the title (bold 16) over the
 * message (regular 14).
 */

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { TINTABLE_ICONS } from '@/components/Icon/registry';
import { Avatar } from '@/components/ui/Avatar';
import { typography } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;
const s = (n: number) => n * scaleX;

export type ToastType = 'info' | 'success' | 'error';

/** The pill: its colour and glyph. Notifications pass their own (taskMeta). */
export interface ToastVisual {
  /** Pill colour. */
  colour: string;
  /** A registered icon, drawn white (tintable icons), or an Ionicons name. */
  icon?: IconName;
  ionicon?: keyof typeof Ionicons.glyphMap;
  /** Glyph colour on a pale pill; white otherwise. */
  glyph?: string;
  /**
   * A person instead of the pill — Figma 4443:547, a General Announcement
   * shows its sender's photo (64, round) in the pill's place.
   */
  avatar?: { uri?: string | null; name?: string | null };
}

export interface ToastOptions {
  title?: string;
  type?: ToastType;
  duration?: number;
  /** Overrides the type's pill — e.g. "Cleaning started" is yellow with a vacuum. */
  visual?: ToastVisual;
}

export interface ToastApi {
  show: (message: string, options?: ToastOptions) => void;
  hide: () => void;
}

interface ToastState {
  message: string;
  title?: string;
  type: ToastType;
  visual?: ToastVisual;
}

/** The pill for a plain success / error / info toast. */
const TYPE_VISUAL: Record<ToastType, ToastVisual> = {
  success: { colour: '#41d541', ionicon: 'checkmark' },
  error: { colour: '#f92424', ionicon: 'alert' },
  info: { colour: '#5a759d', ionicon: 'information' },
};

/** The title when none is given — the card always has one, as in the frame. */
const TYPE_TITLE: Record<ToastType, string> = {
  success: 'Done',
  error: 'Something went wrong',
  info: 'Update',
};

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

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      const type = options?.type ?? 'info';
      const duration = options?.duration ?? 3000;
      setState({ message, title: options?.title, type, visual: options?.visual });
      timeoutRef.current = setTimeout(hide, duration);
    },
    [hide]
  );

  const api: ToastApi = React.useMemo(() => ({ show, hide }), [show, hide]);
  toastRef.current = api;

  const visible = state.message.length > 0;
  const visual = state.visual ?? TYPE_VISUAL[state.type];
  const glyphColour = visual.glyph ?? '#ffffff';
  const title = state.title || TYPE_TITLE[state.type];

  return (
    <ToastContext.Provider value={api}>
      {children}
      {visible && (
        // Tap to dismiss early.
        <Pressable
          onPress={hide}
          accessibilityRole="alert"
          accessibilityLabel={`${title}. ${state.message}`}
          style={[styles.card, { top: insets.top + s(8) }]}
        >
          {visual.avatar ? (
            <View style={styles.avatarSlot}>
              <Avatar uri={visual.avatar.uri ?? undefined} name={visual.avatar.name ?? undefined} size={s(64)} />
            </View>
          ) : (
          <View style={[styles.pill, { backgroundColor: visual.colour }]}>
            {visual.icon ? (
              <Icon
                name={visual.icon}
                size={s(30)}
                {...(TINTABLE_ICONS.has(visual.icon) ? { color: glyphColour } : null)}
              />
            ) : (
              <Ionicons name={visual.ionicon ?? 'information'} size={s(30)} color={glyphColour} />
            )}
          </View>
          )}
          <View style={styles.text}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.message} numberOfLines={3}>
              {state.message}
            </Text>
          </View>
        </Pressable>
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
  // 4443:206 — 406 wide at x=17, radius 15, #e1e1e1 outline, shadow y4 / 14.4 blur / 12%.
  card: {
    position: 'absolute',
    left: s(17),
    right: s(17),
    minHeight: s(112),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(27),
    paddingVertical: s(18),
    gap: s(21),
    backgroundColor: '#ffffff',
    borderRadius: s(15),
    borderWidth: 1,
    borderColor: '#e1e1e1',
    shadowColor: '#888888',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 7.2,
    elevation: 6,
    zIndex: 1000,
  },
  // 4443:212 — 93 x 61, fully round.
  pill: {
    width: s(93),
    height: s(61),
    borderRadius: s(45),
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 4443:593 — the sender's photo sits where the pill would, left-aligned in
  // its 93-wide slot, so the text starts at the same x as every other toast.
  avatarSlot: {
    width: s(93),
    alignItems: 'flex-start',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  // 4443:220 — bold 16, #1e1e1e.
  title: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    fontSize: s(16),
    lineHeight: s(21),
    color: '#1e1e1e',
  },
  // 4443:207 — regular 14, #1e1e1e.
  message: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    fontSize: s(14),
    lineHeight: s(18),
    color: '#1e1e1e',
    marginTop: s(1),
  },
});
