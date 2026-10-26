import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { MessageAuthorType, type Message } from '@/sdk';
import { Avatar } from '@/components/ui/Avatar';
import { strings } from '@/locales/en';
import { colors, fontSize, radius, spacing } from '@/theme';
import { formatTime } from '@/utils/format-duration';

interface ChatMessageRowProps {
  message: Message;
  /** True when the local agent authored this message. */
  isOwn: boolean;
}

/**
 * ChatMessageRow — a chat bubble with author, time and delivery state.
 *
 * Own messages align right in agent-blue; customer and other-agent messages align
 * left on a light surface. Optimistic sends show a spinner until the server echoes
 * them back, then a tick — the same feedback loop demo-app uses.
 */
export function ChatMessageRow({ message, isOwn }: ChatMessageRowProps) {
  const authorName =
    message.author.details?.displayName
    ?? (message.author.type === MessageAuthorType.CUSTOMER
      ? strings.interactions.messages.customerFallbackName
      : 'Agent');

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      {!isOwn && <Avatar fullName={authorName} size="xs" backgroundColor={colors.gray600} />}

      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {!isOwn && <Text style={styles.author}>{authorName}</Text>}

        <Text style={[styles.body, isOwn && styles.bodyOwn]}>{message.body.text.content}</Text>

        <View style={styles.metaRow}>
          <Text style={[styles.time, isOwn && styles.timeOwn]}>
            {formatTime(message.createdAt)}
          </Text>
          {isOwn
            && (message.pending ? (
              <ActivityIndicator size="small" color={colors.blue100} />
            ) : (
              <View style={styles.sentRow}>
                <Check size={12} color={colors.blue100} />
                <Text style={[styles.time, styles.timeOwn]}>
                  {strings.interactions.messages.sentIndicator}
                </Text>
              </View>
            ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleOwn: {
    backgroundColor: colors.blue600,
    borderBottomRightRadius: radius.sm,
  },
  bubbleOther: {
    backgroundColor: colors.gray100,
    borderBottomLeftRadius: radius.sm,
  },
  author: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.gray600,
    marginBottom: 2,
  },
  body: {
    fontSize: fontSize.sm,
    color: colors.gray900,
  },
  bodyOwn: {
    color: colors.white,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: 4,
  },
  sentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  time: {
    fontSize: fontSize.xxs,
    color: colors.gray500,
  },
  timeOwn: {
    color: colors.blue100,
  },
});
