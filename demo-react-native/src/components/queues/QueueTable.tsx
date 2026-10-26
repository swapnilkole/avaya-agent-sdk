import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';

import type { Queue } from '@/sdk';
import { strings } from '@/locales/en';
import { colors, fontSize, radius, spacing } from '@/theme';
import { getLoggedInDuration } from '@/utils/format-duration';

interface QueueTableProps {
  queues: Queue[];
  onToggleQueue: (queue: Queue, enabled: boolean) => void;
  isLoading?: boolean;
  isUserLoggedIn?: boolean;
  loadingQueueIds?: Set<string>;
}

/**
 * QueueTable — the agent's queue memberships with login toggles.
 *
 * Rendered as stacked rows rather than demo-app's HTML table: a three-column table
 * does not survive phone widths, so each queue becomes a row with its name, login
 * duration and switch.
 */
export function QueueTable({
  queues,
  onToggleQueue,
  isLoading = false,
  isUserLoggedIn = true,
  loadingQueueIds,
}: QueueTableProps) {
  if (isLoading) {
    return (
      <View style={styles.stateBox} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.blue600} />
        <Text style={styles.stateText}>{strings.common.loading}</Text>
      </View>
    );
  }

  if (queues.length === 0) {
    return (
      <View style={styles.stateBox}>
        <Text style={styles.stateText}>{strings.queues.noQueuesFound}</Text>
      </View>
    );
  }

  return (
    <View style={styles.table}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.nameColumn]}>
          {strings.queues.columnQueueName}
        </Text>
        <Text style={[styles.headerCell, styles.timeColumn]}>
          {strings.queues.columnLoginTime}
        </Text>
        <Text style={[styles.headerCell, styles.toggleColumn]}>
          {strings.queues.columnEnable}
        </Text>
      </View>

      {queues.map((queue, index) => {
        const isBusy = loadingQueueIds?.has(queue.queueId) ?? false;

        return (
          <View
            key={queue.queueId}
            style={[styles.row, index % 2 === 1 && styles.rowAlternate]}
          >
            <Text
              style={[
                styles.nameCell,
                styles.nameColumn,
                !queue.isLoggedIn && styles.mutedText,
              ]}
              numberOfLines={1}
            >
              {queue.queueName}
            </Text>

            <Text
              style={[styles.timeCell, styles.timeColumn, !queue.isLoggedIn && styles.mutedText]}
              numberOfLines={1}
            >
              {queue.isLoggedIn && queue.loggedInAt
                ? getLoggedInDuration(queue.loggedInAt)
                : strings.queues.noLoginTime}
            </Text>

            <View style={[styles.toggleCell, styles.toggleColumn]}>
              {isBusy && <ActivityIndicator size="small" color={colors.gray400} />}
              <Switch
                value={queue.isLoggedIn}
                onValueChange={(checked) => onToggleQueue(queue, checked)}
                disabled={!isUserLoggedIn || isBusy}
                trackColor={{ false: colors.gray300, true: colors.green600 }}
                thumbColor={colors.white}
                accessibilityLabel={`Toggle queue ${queue.queueName}`}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerCell: {
    fontSize: fontSize.xxs,
    fontWeight: '700',
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowAlternate: {
    backgroundColor: colors.gray50,
  },
  nameColumn: {
    flex: 1,
  },
  timeColumn: {
    width: 92,
  },
  toggleColumn: {
    width: 76,
  },
  nameCell: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray900,
  },
  timeCell: {
    fontSize: fontSize.xs,
    color: colors.gray900,
  },
  mutedText: {
    color: colors.gray400,
  },
  toggleCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 48,
  },
  stateText: {
    fontSize: fontSize.sm,
    color: colors.gray500,
  },
});
