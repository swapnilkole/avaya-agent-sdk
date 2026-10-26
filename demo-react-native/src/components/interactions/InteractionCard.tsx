import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Interaction } from '@/sdk';
import { Badge } from '@/components/ui/Badge';
import { strings } from '@/locales/en';
import { colors, fontSize, radius, spacing } from '@/theme';

import { InteractionIcon } from './InteractionIcon';
import { TimerDisplay } from './TimerDisplay';

interface InteractionCardProps {
  interaction: Interaction;
  isSelected?: boolean;
  onPress?: (interaction: Interaction) => void;
}

const statusColors: Record<string, string> = {
  connected: colors.blue700,
  hold: colors.amber600,
};

/**
 * InteractionCard — one interaction in the list.
 *
 * Shows channel icon, customer info, queue and running duration, plus viewer and
 * transfer provenance lines. Mirrors demo-app's card, including its derived labels.
 */
export function InteractionCard({ interaction, isSelected = false, onPress }: InteractionCardProps) {
  const { communicationType, currentStatus, customer, queueDetails, startTime, transferDetails } =
    interaction;

  const channelLabel = String(communicationType);
  const statusLabel =
    strings.interactions.status[currentStatus as keyof typeof strings.interactions.status]
    ?? String(currentStatus);
  const customerName = customer.name?.length > 0 ? customer.name : 'Guest';

  /**
   * Human-readable transfer provenance when this interaction arrived via transfer.
   * @example "Blind Transfer" | "Attended Transfer from John Doe" | null
   */
  const transferDescription =
    !interaction.isOwner && transferDetails?.transferType === 'blind'
      ? 'Blind Transfer'
      : !interaction.isOwner && transferDetails?.transferType === 'attended'
        ? `Attended Transfer${transferDetails.user?.name ? ` from ${transferDetails.user.name}` : ''}`
        : null;

  return (
    <Pressable
      onPress={() => onPress?.(interaction)}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${transferDescription ? `${transferDescription} - ` : ''}${
        interaction.isElite ? 'Elite ' : ''
      }${channelLabel} with ${customerName}, ${statusLabel}`}
      style={({ pressed }) => [
        styles.card,
        isSelected ? styles.cardSelected : styles.cardDefault,
        pressed && styles.cardPressed,
      ]}
    >
      <InteractionIcon communicationType={communicationType} />

      <View style={styles.body}>
        <View style={styles.statusRow}>
          <Text
            style={[
              styles.statusText,
              { color: statusColors[String(currentStatus)] ?? colors.gray600 },
            ]}
            numberOfLines={1}
          >
            {`${channelLabel} - ${statusLabel}`}
          </Text>
          {interaction.isElite && (
            <Badge
              variant="accent"
              style={styles.eliteBadge}
              textStyle={styles.eliteBadgeText}
              accessibilityLabel={strings.interactions.eliteBadgeAriaLabel}
            >
              {strings.interactions.eliteBadge}
            </Badge>
          )}
        </View>

        <Text style={styles.customerName} numberOfLines={1}>
          {customerName}
        </Text>
        <Text style={styles.queueName} numberOfLines={1}>
          {queueDetails.name}
        </Text>

        {interaction.isViewer() && (
          <Text style={styles.viewingLine} numberOfLines={1}>
            {interaction.ownerDetails?.fullName
              ? `Viewing ${interaction.ownerDetails.fullName}`
              : 'Viewing'}
          </Text>
        )}

        {transferDescription && (
          <Text style={styles.transferLine} numberOfLines={1}>
            {transferDescription}
          </Text>
        )}
      </View>

      <Badge variant="secondary" style={styles.timerBadge}>
        <TimerDisplay startTime={startTime} style={styles.timerText} />
      </Badge>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  cardDefault: {
    backgroundColor: colors.white,
    borderColor: colors.gray200,
  },
  cardSelected: {
    backgroundColor: colors.blue50,
    borderColor: colors.blue600,
    borderWidth: 2,
  },
  cardPressed: {
    opacity: 0.85,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  statusText: {
    fontSize: fontSize.xxs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  eliteBadge: {
    paddingHorizontal: 5,
    paddingVertical: 0,
  },
  eliteBadgeText: {
    fontSize: fontSize.xxs,
    textTransform: 'uppercase',
  },
  customerName: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.gray900,
  },
  queueName: {
    fontSize: fontSize.xs,
    color: colors.gray500,
  },
  viewingLine: {
    fontSize: fontSize.xxs,
    fontWeight: '600',
    color: colors.purple700,
  },
  transferLine: {
    fontSize: fontSize.xxs,
    fontWeight: '600',
    color: colors.blue700,
  },
  timerBadge: {
    backgroundColor: colors.blue100,
  },
  timerText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.blue800,
    fontVariant: ['tabular-nums'],
  },
});
