import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  Image,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { colors, typography } from '@/theme';
import { useToast } from '@/contexts/ToastContext';
import { transcribeAndRespond, sendTextToAgent } from '../services/aiAgent';
import { useDesignScale } from '@/hooks/useDesignScale';

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'voice';
}

interface AIChatOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export default function AIChatOverlay({ visible, onClose }: AIChatOverlayProps) {
  const { width: windowWidth, scaleX, normalizedScaleX } = useDesignScale();
  const hestiaIconW = Math.round(120 * normalizedScaleX);
  const hestiaIconH = Math.round(32 * normalizedScaleX);
  const overlayHeight = 280 * scaleX;
  const styles = useMemo(() => buildAIChatOverlayStyles(scaleX), [scaleX]);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const toast = useToast();

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const isRecording = recorderState.isRecording;
  const recordingSeconds = Math.floor(recorderState.durationMillis / 1000);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setInputText('');
  }, []);

  const handleSendText = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isProcessing) return;
    setMessages((prev) => [...prev, { role: 'user', content: text, type: 'text' }]);
    setInputText('');
    setIsProcessing(true);
    try {
      const response = await sendTextToAgent(text);
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.warn('AI text error', e);
      toast.show('Could not get a response. Try again.', { type: 'error', title: 'Error' });
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, isProcessing, toast]);

  const processVoiceNote = useCallback(
    async (audioUri: string) => {
      setIsProcessing(true);
      try {
        const { transcript, response } = await transcribeAndRespond(audioUri);
        setMessages((prev) => [
          ...prev,
          { role: 'user', content: transcript || '🎤 Voice note', type: 'voice' },
          { role: 'assistant', content: response },
        ]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      } catch (e) {
        console.warn('AI voice note error', e);
        toast.show('Could not process voice note. Try again.', { type: 'error', title: 'Error' });
      } finally {
        setIsProcessing(false);
      }
    },
    [toast]
  );

  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      try {
        const durationSec = Math.round(recorderState.durationMillis / 1000) || 0;
        await audioRecorder.stop();
        const uri = audioRecorder.uri;
        if (uri && durationSec > 0) {
          await processVoiceNote(uri);
        } else {
          toast.show('Record at least 1 second.', { type: 'error', title: 'Too short' });
        }
      } catch (error) {
        console.error('Error stopping recording:', error);
        toast.show('Failed to save recording.', { type: 'error', title: 'Error' });
      }
      return;
    }

    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        toast.show('Microphone access is needed for voice notes.', { type: 'error', title: 'Permission needed' });
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.show('Failed to start recording.', { type: 'error', title: 'Error' });
    }
  }, [
    isRecording,
    recorderState.durationMillis,
    audioRecorder,
    processVoiceNote,
    toast,
  ]);

  // When keyboard is closed, sit just above the tab bar. When open, move up slightly more than
  // the keyboard height so there's clear space and the input is never under the keyboard.
  const tabBarHeight = 152 * scaleX;
  const bottomOffset = tabBarHeight;
  const isKeyboardOpen = keyboardHeight > 0;
  const extraGapAboveKeyboard = 52 * scaleX; // push sheet clearly above keyboard
  const overlayBottom = isKeyboardOpen
    ? keyboardHeight + extraGapAboveKeyboard
    : bottomOffset;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.overlay,
            {
              width: windowWidth,
              height: overlayHeight,
              left: 0,
              bottom: overlayBottom,
            },
          ]}
        >
          <View style={styles.overlayContent}>
            {/* Header row: Hestia AI icon top left, close top right (as in Figma) */}
            <View style={styles.header}>
              <Image
                source={require('../../../../assets/icons/ai-chat-icon.png')}
                style={[styles.hestiaIcon, { width: hestiaIconW, height: hestiaIconH }]}
                resizeMode="contain"
              />
              <View style={styles.headerSpacer} />
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            {/* Messages: transcript + AI response */}
            <ScrollView
              ref={scrollRef}
              style={styles.messagesScroll}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {messages.map((msg, i) => (
                <View
                  key={i}
                  style={[
                    styles.messageRow,
                    msg.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      msg.role === 'user' ? styles.messageUser : styles.messageAssistant,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        msg.role === 'assistant' && styles.messageTextAssistant,
                        msg.role === 'user' && styles.messageTextUser,
                      ]}
                    >
                      {msg.content}
                    </Text>
                  </View>
                </View>
              ))}
              {isProcessing && (
                <View style={[styles.messageRow, styles.messageRowAssistant]}>
                  <View style={[styles.messageBubble, styles.messageAssistant]}>
                    <ActivityIndicator size="small" color={colors.primary.main} />
                    <Text style={[styles.messageText, styles.processingText]}>
                      Transcribing and responding…
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
            {/* Input bar – pill with +, "Ask anything....", mic (voice note) */}
            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.attachBtn} onPress={handleNewChat} activeOpacity={0.7}>
                <Ionicons name="add" size={24} color={colors.primary.main} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder={isRecording ? `Recording ${recordingSeconds}s…` : 'Ask anything....'}
                placeholderTextColor={colors.primary.main}
                value={inputText}
                onChangeText={setInputText}
                multiline={false}
                returnKeyType="send"
                onSubmitEditing={handleSendText}
                blurOnSubmit={false}
                editable={!isRecording && !isProcessing}
              />
              {inputText.trim().length > 0 ? (
                <TouchableOpacity
                  style={styles.sendBtn}
                  onPress={handleSendText}
                  disabled={isProcessing}
                  activeOpacity={0.7}
                >
                  <Ionicons name="send" size={22} color={colors.primary.main} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.micBtn}
                  onPress={handleMicPress}
                  disabled={isProcessing}
                  activeOpacity={0.7}
                >
                  {isRecording ? (
                    <Ionicons name="stop-circle" size={26} color={colors.status?.dirty ?? '#f92424'} />
                  ) : (
                    <Ionicons name="mic-outline" size={22} color={colors.primary.main} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function buildAIChatOverlayStyles(scaleX: number) {
  return StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  overlay: {
    position: 'absolute',
    backgroundColor: '#FFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: '#FF46A3',
    justifyContent: 'space-between',
  },
  overlayKeyboardWrap: {
    flex: 1,
  },
  overlayContent: {
    flex: 1,
    paddingHorizontal: 16 * scaleX,
    paddingTop: 12 * scaleX,
    paddingBottom: 14 * scaleX,
    justifyContent: 'space-between',
  },
  messagesScroll: {
    flex: 1,
    maxHeight: 160 * scaleX,
    marginVertical: 10 * scaleX,
  },
  messagesContent: {
    paddingVertical: 8 * scaleX,
    gap: 10 * scaleX,
  },
  messageRow: {
    width: '100%',
    paddingHorizontal: 4 * scaleX,
  },
  messageRowUser: {
    alignItems: 'flex-end',
  },
  messageRowAssistant: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 12 * scaleX,
    paddingVertical: 10 * scaleX,
    borderRadius: 16,
    maxWidth: '88%',
  },
  messageUser: {
    backgroundColor: '#FFFFFF', // Light user bubble
  },
  messageAssistant: {
    backgroundColor: '#F7F7F8', // ChatGPT-style assistant gray
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 * scaleX,
  },
  messageText: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    fontSize: 13 * scaleX,
    color: colors.text.primary,
  },
  messageTextUser: {
    color: '#111827',
  },
  messageTextAssistant: {
    color: '#111827',
  },
  processingText: {
    color: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hestiaIcon: {
    // Rounded dimensions set inline (HESTIA_ICON_WIDTH/HEIGHT) for sharp, non-blurred rendering as in Figma
  },
  headerSpacer: {
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary ?? '#f1f6fc',
    borderRadius: 50,
    paddingVertical: 10 * scaleX,
    paddingLeft: 14 * scaleX,
    paddingRight: 14 * scaleX,
    minHeight: 48 * scaleX,
  },
  attachBtn: {
    marginRight: 10 * scaleX,
    padding: 2,
  },
  input: {
    flex: 1,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    fontSize: 15 * scaleX,
    color: colors.text.primary,
    paddingVertical: 2,
  },
  micBtn: {
    marginLeft: 6 * scaleX,
    padding: 2,
  },
  sendBtn: {
    marginLeft: 6 * scaleX,
    padding: 2,
  },
});
}

