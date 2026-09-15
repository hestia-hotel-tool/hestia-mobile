import React, { useState, useRef, useCallback } from 'react';
import {
  Modal,
  Platform,
  // Backdrop only — it is styled with `StyleSheet.absoluteFill`, no className.
  Pressable as RNPressable,
  StyleSheet,
  ActivityIndicator,
  // The `src/tw` ScrollView does not forward refs, and the transcript needs
  // `scrollToEnd`, so this one list stays on the RN component.
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, Pressable } from '@/tw';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme';
import { useToast } from '@/contexts/ToastContext';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { transcribeAndRespond } from '../services/aiAgent';
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

/*
 * Geometry, measured from Figma 3910:1496 on the 440-wide frame.
 *
 * The card is 398 wide at x=21, so it insets 21 each side; 330 tall with its
 * bottom at y=818 against a tab bar whose top is 806, i.e. it deliberately
 * floats over the bar's top 12pt (clear of the icons, which start at 841).
 * 958 - 818 leaves 140 from the bottom of the screen.
 */
const CARD = {
  inset: 21,
  height: 330,
  bottom: 140,
  radius: 8,
  /** The gradient stroke is 1px; the inner face is inset by it. */
  border: 1,
} as const;

/** Header block: mark at (22, 28.61), title at (77, 33.72), dots at (78, 58.24). */
const MARK = { left: 22, top: 28.61, size: 44.954 } as const;
const TITLE = { left: 77, top: 33.72, fontSize: 15 } as const;
const DOTS = { left: 78, top: 58.24, width: 27 } as const;
/** Mic button: 86 x 84.799 at (143, 217), fully round, glyph 38.56 x 49.9. */
const MIC = { left: 143, top: 217, width: 86, height: 84.799, glyphHeight: 49.9 } as const;

/**
 * The Hestia assistant panel — Figma 3910:1496, over any screen.
 *
 * A card floated above the tab bar: the assistant's mark and name, a three-dot
 * indicator, the conversation, and a microphone. Rendered in a `Modal`, so the
 * OS presents it in its own window above everything the app has drawn —
 * including the absolutely-positioned tab bar — which is what makes one
 * instance, mounted once in `AppProviders`, work from every screen.
 *
 * The frame draws no close button and no text field, so neither is here. The
 * conversation still renders in the space between the title and the mic, which
 * is empty in the frame because the frame is the idle state — dropping it would
 * leave the assistant's replies nowhere to go.
 *
 * Dismissal is therefore the backdrop and the Android back button. See the note
 * on `onClose` below.
 */
export default function AIChatOverlay({ visible, onClose }: AIChatOverlayProps) {
  const { scaleX } = useDesignScale();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const toast = useToast();

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const isRecording = recorderState.isRecording;

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
        toast.show('Microphone access is needed for voice notes.', {
          type: 'error',
          title: 'Permission needed',
        });
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.show('Failed to start recording.', { type: 'error', title: 'Error' });
    }
  }, [isRecording, recorderState.durationMillis, audioRecorder, processVoiceNote, toast]);

  const s = (n: number) => n * scaleX;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View className="flex-1 bg-[rgba(0,0,0,0.4)]">
        <RNPressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close assistant"
        />

        <View
          className="absolute"
          style={{ left: s(CARD.inset), right: s(CARD.inset), bottom: s(CARD.bottom), height: s(CARD.height) }}
        >
          {/*
            The 1px stroke is a top-to-bottom gradient (#FF4DD8 -> #3BC1F6), so
            it cannot be a `borderColor`. Drawn as a gradient ground with the
            white face inset by the stroke width — cheaper and more responsive
            than an SVG rect, which would need the card measured first.
          */}
          <LinearGradient
            colors={[colors.border.aiPanelStart, colors.border.aiPanelEnd]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ flex: 1, borderRadius: s(CARD.radius), padding: s(CARD.border) }}
          >
            <View
              className="flex-1 bg-surface-primary"
              style={{ borderRadius: s(CARD.radius - CARD.border) }}
            >
              <View
                className="absolute"
                style={{ left: s(MARK.left), top: s(MARK.top) }}
              >
                {/* Two-tone: no `color`, or Icon warns and the gradient is lost. */}
                <Icon name="ai-assistant-mark" size={s(MARK.size)} />
              </View>

              <Text
                className="absolute font-hestia-primary text-hestia-lg font-bold text-ink-primary"
                style={{ left: s(TITLE.left), top: s(TITLE.top), fontSize: s(TITLE.fontSize) }}
                numberOfLines={1}
              >
                Hestia Hospitality Assistant
              </Text>

              <View className="absolute" style={{ left: s(DOTS.left), top: s(DOTS.top) }}>
                <Icon
                  name="ai-typing-dots"
                  width={s(DOTS.width)}
                  height={s(DOTS.width / 3.7753)}
                  color={colors.text.faint}
                />
              </View>

              {/*
                The conversation, between the header and the mic. Empty in the
                frame, which is the idle state.
              */}
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1, marginTop: s(80), marginBottom: s(CARD.height - MIC.top) }}
                contentContainerStyle={{ paddingHorizontal: s(MARK.left), gap: s(8) }}
                showsVerticalScrollIndicator={false}
              >
                {messages.map((msg, i) => (
                  <Text
                    key={i}
                    className={`font-hestia-primary text-hestia-base ${
                      msg.role === 'user' ? 'text-right text-ink-accent' : 'text-ink-primary'
                    }`}
                  >
                    {msg.content}
                  </Text>
                ))}
                {isProcessing && <ActivityIndicator size="small" color={colors.primary.main} />}
              </ScrollView>

              <Pressable
                onPress={handleMicPress}
                disabled={isProcessing}
                accessibilityRole="button"
                accessibilityLabel={isRecording ? 'Stop recording' : 'Start voice note'}
                className="absolute items-center justify-center rounded-full bg-surface-ai-mic"
                style={{
                  left: s(MIC.left),
                  top: s(MIC.top),
                  width: s(MIC.width),
                  height: s(MIC.height),
                  opacity: isProcessing ? 0.5 : 1,
                }}
              >
                <Icon
                  name="action-mic"
                  size={s(MIC.glyphHeight)}
                  // Recording is the one state the frame does not draw; the
                  // dirty red is the app's existing "stop / active" signal.
                  color={isRecording ? colors.status.dirty : colors.text.pink}
                />
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}
