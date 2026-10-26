import { StyleSheet, Text, View } from 'react-native';
import { Cog } from 'lucide-react-native';

import { MessageAuthorType, MessageType, type Message } from '@/sdk';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { colors, fontSize, radius, spacing } from '@/theme';
import { formatTime } from '@/utils/format-duration';

interface MessageBubbleProps {
  message: Message;
}

/** Small "private" marker shown on viewer-only messages. */
function PrivateBadge() {
  return (
    <Badge variant="secondary" style={styles.privateBadge} textStyle={styles.privateBadgeText}>
      Private
    </Badge>
  );
}

/**
 * MessageBubble — renders a single SYSTEM message row.
 *
 * Layout mirrors demo-app:
 *   row 1: [Cog] System  <time>  [Private]
 *   row 2: [actor chip]? body text
 *
 * The actor chip appears only for agent-triggered system events; pure server
 * notifications render the body alone. CHAT messages are handled by ChatMessageRow.
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  // Defensive: this component renders system rows only.
  if (message.type !== MessageType.SYSTEM) {
    return null;
  }

  const actor =
    message.author.type === MessageAuthorType.AGENT ? message.author.details : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Cog size={14} color={colors.gray700} />
        <Text style={styles.systemLabel}>System</Text>
        <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
        {message.isPrivate && <PrivateBadge />}
      </View>

      <View style={styles.bodyRow}>
        {actor && (
          <View style={styles.actorChip}>
            <Avatar fullName={actor.displayName} size="xs" backgroundColor={colors.blue800} />
            <Text style={styles.actorName}>{actor.displayName}</Text>
          </View>
        )}
        <Text style={styles.bodyText}>{message.body.text.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray100,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  systemLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.gray700,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.gray500,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 3,
    paddingRight: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.md,
    backgroundColor: colors.gray200,
  },
  actorName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray900,
  },
  bodyText: {
    flexShrink: 1,
    fontSize: fontSize.sm,
    color: colors.gray900,
  },
  privateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 0,
    backgroundColor: colors.purple100,
  },
  privateBadgeText: {
    fontSize: fontSize.xxs,
    color: colors.purple800,
  },
});
