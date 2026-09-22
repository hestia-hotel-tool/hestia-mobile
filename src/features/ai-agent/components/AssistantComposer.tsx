import React from 'react';
import { TextInput } from 'react-native';

import { View, Text, Pressable } from '@/tw';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme';

interface AssistantComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onMicPress: () => void;
  isRecording: boolean;
  /** True while an answer is streaming: send becomes stop. */
  isStreaming: boolean;
  onStop: () => void;
  scaleX: number;
}

/**
 * The input row: type a question, dictate it, or stop the answer.
 *
 * The send button becomes a stop button while a reply streams. One control,
 * because the two are mutually exclusive and a second button would be dead
 * most of the time — and stopping a long answer is something people reach for
 * far more often than a chat UI usually admits.
 */
export default function AssistantComposer({
  value,
  onChangeText,
  onSend,
  onMicPress,
  isRecording,
  isStreaming,
  onStop,
  scaleX,
}: AssistantComposerProps) {
  const s = (n: number) => n * scaleX;
  const canSend = value.trim().length > 0;

  return (
    <View
      className="flex-row items-end border-t border-border-light bg-surface-primary"
      style={{ gap: s(10), paddingHorizontal: s(16), paddingTop: s(10), paddingBottom: s(10) }}
    >
      <View
        className="flex-1 justify-center rounded-3xl bg-surface-secondary"
        style={{ minHeight: s(44), paddingHorizontal: s(16), paddingVertical: s(8) }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={isRecording ? 'Listening…' : 'Ask about rooms, tickets, items…'}
          placeholderTextColor={colors.text.faint}
          multiline
          /*
           * Grows to four lines then scrolls. Unbounded, a pasted paragraph
           * would push the conversation off the screen entirely.
           */
          style={{
            fontSize: s(15),
            lineHeight: s(20),
            maxHeight: s(88),
            color: colors.text.primary,
            padding: 0,
          }}
          onSubmitEditing={canSend ? onSend : undefined}
          blurOnSubmit={false}
          editable={!isRecording}
          accessibilityLabel="Ask the assistant"
        />
      </View>

      {/*
        The mic gives way to send as soon as there is something to send, and
        disappears while an answer streams — three controls competing for the
        same corner would be worse than one that changes.
      */}
      {!canSend && !isStreaming ? (
        <Pressable
          onPress={onMicPress}
          accessibilityRole="button"
          accessibilityLabel={isRecording ? 'Stop dictation' : 'Dictate a question'}
          accessibilityState={{ selected: isRecording }}
          className="items-center justify-center rounded-full bg-surface-ai-mic"
          style={{ width: s(44), height: s(44) }}
        >
          <Icon
            name="action-mic"
            size={s(22)}
            // Recording is the one state the frame never drew; the app's
            // existing "active / stop" red is the honest borrow.
            color={isRecording ? colors.status.dirty : colors.text.pink}
          />
        </Pressable>
      ) : null}

      <Pressable
        onPress={isStreaming ? onStop : onSend}
        disabled={!isStreaming && !canSend}
        accessibilityRole="button"
        accessibilityLabel={isStreaming ? 'Stop the answer' : 'Send'}
        className={`items-center justify-center rounded-full ${
          isStreaming || canSend ? 'bg-ink-accent' : 'bg-surface-secondary'
        }`}
        style={{ width: s(44), height: s(44) }}
      >
        {isStreaming ? (
          // A square reads as "stop" without needing an icon in the registry.
          <View
            className="bg-ink-white"
            style={{ width: s(13), height: s(13), borderRadius: s(2) }}
          />
        ) : (
          <Text
            className={canSend ? 'text-ink-white' : 'text-ink-faint'}
            style={{ fontSize: s(19), lineHeight: s(22) }}
          >
            ↑
          </Text>
        )}
      </Pressable>
    </View>
  );
}
