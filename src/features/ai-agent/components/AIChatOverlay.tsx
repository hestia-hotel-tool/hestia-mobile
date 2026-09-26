import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  // The `src/tw` ScrollView does not forward refs, and the transcript needs
  // `scrollToEnd`, so this one list stays on the RN component.
  ScrollView,
} from 'react-native';
import { SafeKeyboardAvoidingView as KeyboardAvoidingView } from '@/components/ui/SafeKeyboardAvoidingView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { View, Text, Pressable } from '@/tw';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme';
import { useDesignScale } from '@/hooks/useDesignScale';
import { useAssistant } from '../hooks/useAssistant';
import { useVoiceDictation } from '../hooks/useVoiceDictation';
import AssistantBubble from './AssistantBubble';
import AssistantComposer from './AssistantComposer';

interface AIChatOverlayProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Questions worth offering when the sheet is empty.
 *
 * An assistant with a blank box gets asked nothing, because nobody knows what
 * it can do. These are the shape of question the tools can actually answer
 * well, so the first attempt succeeds rather than teaching the user it is
 * useless.
 */
const SUGGESTIONS = [
  'How many rooms are dirty?',
  'Which rooms are flagged?',
  'Any unsolved tickets?',
  "What's in lost and found?",
];

/**
 * The Hestia assistant.
 *
 * ## Why this is no longer the card in Figma 3910:1496
 *
 * That frame draws a 330pt card with the assistant's mark, a three-dot
 * indicator and a microphone — and no text field, no close button and no
 * scrollback, because it specifies the **idle** state and nothing else. It
 * cannot host a conversation: three lines of visible transcript, no way to
 * type, and dismissal only by tapping the backdrop.
 *
 * Asked for a typed, streaming assistant, the honest thing is to say the frame
 * is for a different product than the one requested rather than cram an input
 * into 330pt. What is kept is its identity — the gradient stroke, the mark, the
 * title — so it still reads as the same component; what changes is that it is
 * now a full sheet. A stated deviation, not an oversight.
 */
export default function AIChatOverlay({ visible, onClose }: AIChatOverlayProps) {
  const { scaleX } = useDesignScale();
  const insets = useSafeAreaInsets();
  const s = useCallback((n: number) => n * scaleX, [scaleX]);

  const { messages, isStreaming, send, retry, cancel, clear } = useAssistant();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const voice = useVoiceDictation({
    onText: (text) => setDraft(text),
    /*
     * Dictation ends by sending, not by leaving the words in the box. Someone
     * holding a phone one-handed in a corridor said the question out loud
     * because they did not want to touch the screen twice.
     */
    onFinal: (text) => {
      const question = text.trim();
      if (question) {
        send(question);
        setDraft('');
      }
    },
  });

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const submit = useCallback(() => {
    const question = draft.trim();
    if (!question) return;
    send(question);
    setDraft('');
    scrollToEnd();
  }, [draft, send, scrollToEnd]);

  const hasConversation = messages.length > 0;

  const header = useMemo(
    () => (
      <View
        className="flex-row items-center bg-surface-primary"
        style={{
          paddingTop: insets.top + s(10),
          paddingBottom: s(12),
          paddingHorizontal: s(16),
          gap: s(10),
        }}
      >
        {/* Two-tone: no `color`, or Icon warns and the gradient is lost. */}
        <Icon name="ai-assistant-mark" size={s(34)} />
        <Text
          className="flex-1 font-hestia-primary font-bold text-ink-primary"
          style={{ fontSize: s(15) }}
          numberOfLines={1}
        >
          Hestia Hospitality Assistant
        </Text>

        {hasConversation ? (
          <Pressable
            onPress={clear}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Clear the conversation"
          >
            <Text
              className="font-hestia-primary text-ink-accent"
              style={{ fontSize: s(13) }}
            >
              Clear
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close assistant"
          className="items-center justify-center"
          style={{ width: s(30), height: s(30) }}
        >
          <Text className="text-ink-secondary" style={{ fontSize: s(22) }}>
            ✕
          </Text>
        </Pressable>
      </View>
    ),
    [insets.top, s, hasConversation, clear, onClose],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View className="flex-1 bg-surface-primary">
        {/*
          The 1px gradient stroke from the frame (#FF4DD8 -> #3BC1F6), kept as
          the sheet's top edge. It is the component's signature and the one
          part of 3910:1496 that survives the change of shape intact.
        */}
        <LinearGradient
          colors={[colors.border.aiPanelStart, colors.border.aiPanelEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ height: s(3) }}
        />

        {header}

        {/*
          `style`, not `className`: KeyboardAvoidingView comes from react-native,
          and only the `src/tw` wrappers accept className. As a className this
          silently did nothing, the view collapsed to its content height, and
          the transcript got zero height — the composer ended up under the
          header with the suggestions nowhere.
        */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: s(16),
              gap: s(16),
              flexGrow: 1,
              justifyContent: hasConversation ? 'flex-start' : 'center',
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToEnd}
          >
            {hasConversation ? (
              messages.map((message) => (
                <AssistantBubble
                  key={message.id}
                  message={message}
                  scaleX={scaleX}
                  onRetry={retry}
                />
              ))
            ) : (
              <View className="items-center" style={{ gap: s(10) }}>
                <Text
                  className="text-center font-hestia-primary text-ink-secondary"
                  style={{ fontSize: s(14), lineHeight: s(20), marginBottom: s(6) }}
                >
                  Ask about rooms, tickets, lost and found, or your team.
                  {'\n'}Answers come from live hotel data.
                </Text>
                {SUGGESTIONS.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    onPress={() => {
                      send(suggestion);
                      scrollToEnd();
                    }}
                    accessibilityRole="button"
                    className="rounded-full border border-border-light bg-surface-secondary"
                    style={{ paddingHorizontal: s(16), paddingVertical: s(10) }}
                  >
                    <Text
                      className="font-hestia-primary text-ink-primary"
                      style={{ fontSize: s(14) }}
                    >
                      {suggestion}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>

          {voice.error ? (
            <Text
              className="bg-surface-secondary px-4 py-2 text-center font-hestia-primary text-ink-secondary"
              style={{ fontSize: s(12) }}
            >
              {voice.error}
            </Text>
          ) : null}

          <AssistantComposer
            value={draft}
            onChangeText={setDraft}
            onSend={submit}
            onMicPress={voice.toggle}
            isRecording={voice.isRecording}
            isStreaming={isStreaming}
            onStop={cancel}
            scaleX={scaleX}
          />
          <View style={{ height: insets.bottom }} className="bg-surface-primary" />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
