import { useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { MessageType, type Interaction, type Message } from '@/sdk';
import { strings } from '@/locales/en';
import { colors, fontSize, spacing } from '@/theme';

import { ChatMessageRow } from './ChatMessageRow';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';

interface MessagePanelProps {
  interaction: Interaction;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
}

/**
 * MessagePanel — scrolling message feed plus composer.
 *
 * The list is inverted so new messages appear at the bottom and stay pinned there
 * without manual scroll management — the RN-idiomatic replacement for demo-app's
 * scroll-anchoring logic. Because it is inverted, the data is reversed on the way in.
 */
export function MessagePanel({
  interaction,
  messages,
  currentUserId,
  onSendMessage,
}: MessagePanelProps) {
  const listRef = useRef<FlatList<Message>>(null);

  // Newest first for the inverted list.
  const ordered = [...messages].reverse();

  return (
    <View style={styles.container}>
      {ordered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{strings.interactions.messages.empty}</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          inverted
          data={ordered}
          keyExtractor={(item) => item.messageId}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) =>
            item.type === MessageType.SYSTEM ? (
              <MessageBubble message={item} />
            ) : (
              <ChatMessageRow
                message={item}
                isOwn={item.author.details?.userId === currentUserId
                  || item.author.details?.displayName === 'You'}
              />
            )
          }
        />
      )}

      <MessageInput interaction={interaction} onSend={onSendMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.gray500,
  },
});
