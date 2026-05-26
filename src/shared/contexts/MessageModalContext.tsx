/**
 * MessageModal – optional replacement for Alert.alert (title + message + buttons).
 * Use useMessageModal() in components; use getMessageModal() in utils/non-React code.
 */

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, typography } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

export interface MessageModalButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface MessageModalOptions {
  title: string;
  message?: string;
  buttons: MessageModalButton[];
  cancelable?: boolean;
}

interface MessageModalState extends MessageModalOptions {
  visible: boolean;
}

const defaultState: MessageModalState = {
  visible: false,
  title: '',
  buttons: [],
};

export interface MessageModalApi {
  show: (options: MessageModalOptions) => void;
  hide: () => void;
}

const messageModalRef = { current: null as MessageModalApi | null };

export function getMessageModal(): MessageModalApi | null {
  return messageModalRef.current;
}

const MessageModalContext = createContext<MessageModalApi | undefined>(undefined);

export function MessageModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MessageModalState>(defaultState);

  const hide = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const show = useCallback((options: MessageModalOptions) => {
    setState({ ...options, visible: true });
  }, []);

  const api: MessageModalApi = React.useMemo(() => ({ show, hide }), [show, hide]);
  messageModalRef.current = api;

  const onRequestClose = state.cancelable ? hide : undefined;

  const handlePress = useCallback(
    (button: MessageModalButton) => {
      hide();
      button.onPress?.();
    },
    [hide]
  );

  return (
    <MessageModalContext.Provider value={api}>
      {children}
      <Modal
        visible={state.visible}
        transparent
        animationType="fade"
        onRequestClose={onRequestClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.overlay}
          onPress={state.cancelable ? hide : undefined}
        >
          <View style={styles.card} onStartShouldSetResponder={() => true}>
            <Text style={styles.title}>{state.title}</Text>
            {state.message != null && state.message !== '' && (
              <Text style={styles.message}>{state.message}</Text>
            )}
            <View style={styles.buttons}>
              {state.buttons.map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.button,
                    btn.style === 'cancel' && styles.buttonCancel,
                    btn.style === 'destructive' && styles.buttonDestructive,
                  ]}
                  onPress={() => handlePress(btn)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      btn.style === 'cancel' && styles.buttonTextCancel,
                      btn.style === 'destructive' && styles.buttonTextDestructive,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </MessageModalContext.Provider>
  );
}

export function useMessageModal(): MessageModalApi {
  const context = useContext(MessageModalContext);
  if (context === undefined) {
    throw new Error('useMessageModal must be used within MessageModalProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24 * scaleX,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 14,
    paddingHorizontal: 20 * scaleX,
    paddingTop: 20 * scaleX,
    paddingBottom: 16 * scaleX,
    minWidth: 260,
    maxWidth: 340,
  },
  title: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as string,
    fontSize: 17 * scaleX,
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as string,
    fontSize: 14 * scaleX,
    color: colors.text.secondary,
    marginBottom: 20 * scaleX,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttons: {
    gap: 10,
  },
  button: {
    paddingVertical: 12 * scaleX,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.primary?.main ?? '#5a759d',
    alignItems: 'center',
  },
  buttonCancel: {
    backgroundColor: colors.background.secondary,
  },
  buttonDestructive: {
    backgroundColor: colors.status?.dirty ?? '#f92424',
  },
  buttonText: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.semibold as string,
    fontSize: 16 * scaleX,
    color: colors.text.white,
  },
  buttonTextCancel: {
    color: colors.text.primary,
  },
  buttonTextDestructive: {
    color: colors.text.white,
  },
});
