import React from 'react';
import { SwipeToDelete } from '@/components/ui/SwipeToDelete';
import ChatItem, { type ChatItemData } from './ChatItem';

/**
 * A chat row that can be deleted: swipe left for a red Delete, or long-press
 * — the two ways messaging apps offer it. Both call `onDelete`, which asks to
 * confirm (ChatScreen).
 */
export default function SwipeableChatItem({
  chat,
  onPress,
  onDelete,
}: {
  chat: ChatItemData;
  onPress: () => void;
  onDelete: (chat: ChatItemData) => void;
}) {
  return (
    <SwipeToDelete onDelete={() => onDelete(chat)} accessibilityLabel={`Delete chat with ${chat.name}`}>
      <ChatItem chat={chat} onPress={onPress} onLongPress={() => onDelete(chat)} />
    </SwipeToDelete>
  );
}
