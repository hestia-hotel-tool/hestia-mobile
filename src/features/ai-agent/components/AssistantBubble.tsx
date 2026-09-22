import React from 'react';
import { ActivityIndicator } from 'react-native';

import { View, Text, Pressable } from '@/tw';
import { colors } from '@/theme';
import type { AssistantChatMessage } from '../hooks/useAssistant';

interface AssistantBubbleProps {
  message: AssistantChatMessage;
  scaleX: number;
  /** Offered on the failed turn only. */
  onRetry: () => void;
}

/**
 * One turn of the conversation.
 *
 * The user's words sit right in a tinted bubble; the assistant's run full
 * width as plain text. That asymmetry is deliberate — an answer is usually
 * several lines and reads better unboxed, while a question is short and needs
 * to be distinguishable at a glance when scrolling back.
 */
export default function AssistantBubble({ message, scaleX, onRetry }: AssistantBubbleProps) {
  const s = (n: number) => n * scaleX;
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View
        className="self-end rounded-2xl bg-ink-accent"
        style={{
          maxWidth: '85%',
          paddingHorizontal: s(14),
          paddingVertical: s(10),
          borderBottomRightRadius: s(4),
        }}
      >
        <Text
          className="font-hestia-primary text-ink-white"
          style={{ fontSize: s(15), lineHeight: s(21) }}
        >
          {message.content}
        </Text>
      </View>
    );
  }

  /*
   * Nothing has arrived yet. A bare spinner would say "working" without saying
   * on what, so the status label from the tool loop is shown when there is one.
   */
  const isEmpty = message.content.length === 0;
  if (isEmpty && message.streaming) {
    return (
      <View className="flex-row items-center self-start" style={{ gap: s(8) }}>
        <ActivityIndicator size="small" color={colors.primary.main} />
        <Text
          className="font-hestia-primary text-ink-secondary"
          style={{ fontSize: s(13) }}
        >
          {message.status ? `${message.status}…` : 'Thinking…'}
        </Text>
      </View>
    );
  }

  return (
    <View className="self-start" style={{ maxWidth: '100%' }}>
      {message.content.length > 0 && (
        <Text
          className="font-hestia-primary text-ink-primary"
          style={{ fontSize: s(15), lineHeight: s(22) }}
        >
          {message.content}
          {/*
            A caret while the text is still arriving. Without it a reply that
            pauses mid-sentence — which a tool round does — looks finished.
          */}
          {message.streaming ? (
            <Text className="text-ink-accent" style={{ fontSize: s(15) }}>
              {' ▌'}
            </Text>
          ) : null}
        </Text>
      )}

      {message.error ? (
        <View
          className="mt-2 flex-row items-center rounded-lg bg-surface-secondary"
          style={{ gap: s(10), paddingHorizontal: s(12), paddingVertical: s(10) }}
        >
          <Text
            className="flex-1 font-hestia-primary text-ink-secondary"
            style={{ fontSize: s(13), lineHeight: s(18) }}
          >
            {message.error}
          </Text>
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            hitSlop={10}
          >
            <Text
              className="font-hestia-primary font-bold text-ink-accent"
              style={{ fontSize: s(13) }}
            >
              Retry
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
