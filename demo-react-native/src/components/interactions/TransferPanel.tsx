import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Search } from 'lucide-react-native';

import {
  InteractionEventType,
  InteractionStatus,
  type Interaction,
  type TransferableQueue,
  type TransferableUser,
} from '@/sdk';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { strings } from '@/locales/en';
import { colors, fontSize, radius, spacing } from '@/theme';
import { createLogger, getErrorDetails } from '@/utils/logger';

const logger = createLogger('TransferPanel');

type TransferTab = 'users' | 'queues';

interface TransferTarget {
  id: string;
  name: string;
  kind: TransferTab;
  status?: string;
}

interface TransferPanelProps {
  interaction: Interaction;
  onClose: () => void;
}

/**
 * TransferPanel — pick a target, then choose blind or attended transfer.
 *
 * Flow mirrors demo-app:
 *   1. Browse/search users or queues
 *   2. Select a target -> transfer-type choice appears
 *   3. Blind hands off immediately; attended opens a consult leg that can be
 *      cancelled or completed once the consulted party answers.
 *
 * Consult state is read from `interaction.transferDetails` and refreshed by the
 * TRANSFER_* event subscriptions, so the SDK stays authoritative.
 */
export function TransferPanel({ interaction, onClose }: TransferPanelProps) {
  const { addNotification } = useNotifications();
  const [tab, setTab] = useState<TransferTab>('users');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<TransferableUser[]>([]);
  const [queues, setQueues] = useState<TransferableQueue[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TransferTarget | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [, forceRender] = useState(0);

  const isConsulting = interaction.currentStatus === InteractionStatus.ATTENDED_TRANSFER;
  const consultAnswered = interaction.transferDetails?.isAnswered ?? false;

  const loadTargets = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'users') {
        setUsers(await interaction.getTransferableUsers(search || undefined));
      } else {
        setQueues(await interaction.getTransferableQueues(search || undefined));
      }
    } catch (error) {
      logger.warn('Transfer target load failed', getErrorDetails(error));
    } finally {
      setLoading(false);
    }
  }, [interaction, search, tab]);

  useEffect(() => {
    // Debounce so each keystroke doesn't fire a lookup.
    const timer = setTimeout(() => void loadTargets(), 250);
    return () => clearTimeout(timer);
  }, [loadTargets]);

  // Re-render on transfer lifecycle events so the consult controls track real state.
  useEffect(() => {
    const events = [
      InteractionEventType.INTERACTION_TRANSFER,
      InteractionEventType.INTERACTION_TRANSFER_ANSWER,
      InteractionEventType.INTERACTION_TRANSFER_CANCEL,
      InteractionEventType.INTERACTION_TRANSFER_FAILED,
      InteractionEventType.INTERACTION_TRANSFER_COMPLETE,
    ];

    const handlerIds = events.map((event) =>
      interaction.subscribe(event, () => forceRender((tick) => tick + 1)),
    );

    return () => {
      events.forEach((event, index) => interaction.unsubscribe(event, handlerIds[index]));
    };
  }, [interaction]);

  const notifyFailure = (title: string, error: unknown) => {
    logger.error(title, { interactionId: interaction.interactionId, ...getErrorDetails(error) });
    addNotification({
      id: `transfer-failed-${Date.now()}`,
      level: 'error',
      title,
      description: error instanceof Error ? error.message : undefined,
    });
  };

  const targetOptions = (target: TransferTarget) =>
    target.kind === 'users' ? { userId: target.id } : { queueId: target.id };

  const handleBlindTransfer = async () => {
    if (!selected) return;
    setTransferring(true);
    try {
      await interaction.blindTransfer(targetOptions(selected));
      onClose();
    } catch (error) {
      notifyFailure(strings.interactions.transfer.transferFailedTitle, error);
    } finally {
      setTransferring(false);
    }
  };

  const handleAttendedTransfer = async () => {
    if (!selected) return;
    setTransferring(true);
    try {
      await interaction.attendedTransfer(targetOptions(selected));
    } catch (error) {
      notifyFailure(strings.interactions.transfer.transferFailedTitle, error);
    } finally {
      setTransferring(false);
    }
  };

  const handleCancelTransfer = async () => {
    setTransferring(true);
    try {
      await interaction.cancelTransfer();
      setSelected(null);
    } catch (error) {
      notifyFailure(strings.interactions.transfer.transferFailedTitle, error);
    } finally {
      setTransferring(false);
    }
  };

  const handleCompleteTransfer = async () => {
    setTransferring(true);
    try {
      await interaction.completeTransfer();
      onClose();
    } catch (error) {
      notifyFailure(strings.interactions.transfer.transferFailedTitle, error);
    } finally {
      setTransferring(false);
    }
  };

  /* ----- consult in progress ---------------------------------------------- */

  if (isConsulting) {
    const consultName = interaction.transferDetails?.user?.name ?? selected?.name ?? '';

    return (
      <View style={styles.container}>
        <View style={styles.consultCard}>
          <Text style={styles.consultTitle}>
            {consultAnswered
              ? strings.interactions.transfer.connectedToUser
              : strings.interactions.transfer.connectingToUser}
          </Text>
          <Text style={styles.consultName}>{consultName}</Text>
          {!consultAnswered && <ActivityIndicator color={colors.blue600} style={styles.consultSpinner} />}
        </View>

        <View style={styles.consultActions}>
          <Button
            variant="outline"
            onPress={handleCancelTransfer}
            disabled={transferring || !interaction.canCancelTransfer()}
            style={styles.flexButton}
          >
            {strings.interactions.transfer.cancelTransfer}
          </Button>
          <Button
            onPress={handleCompleteTransfer}
            loading={transferring}
            disabled={!consultAnswered}
            style={styles.flexButton}
          >
            {strings.interactions.transfer.completeTransfer}
          </Button>
        </View>
      </View>
    );
  }

  /* ----- target chosen, pick transfer type -------------------------------- */

  if (selected) {
    return (
      <View style={styles.container}>
        <View style={styles.selectedCard}>
          <Text style={styles.selectedLabel}>{strings.interactions.transfer.transferTo}</Text>
          <View style={styles.selectedRow}>
            <Avatar fullName={selected.name} size="sm" />
            <Text style={styles.selectedName}>{selected.name}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>{strings.interactions.transfer.selectTransferType}</Text>

        <Button onPress={handleBlindTransfer} loading={transferring} style={styles.stackedButton}>
          {strings.interactions.transfer.transferAndComplete}
        </Button>
        <Button
          variant="outline"
          onPress={handleAttendedTransfer}
          disabled={transferring || !interaction.canAttendedTransfer()}
          style={styles.stackedButton}
        >
          {strings.interactions.transfer.consultationCall}
        </Button>
        <Button variant="ghost" onPress={() => setSelected(null)} disabled={transferring}>
          {strings.interactions.transfer.backToList}
        </Button>
      </View>
    );
  }

  /* ----- browse targets ---------------------------------------------------- */

  const data: TransferTarget[] =
    tab === 'users'
      ? users.map((user) => ({ id: user.userId, name: user.name, kind: 'users', status: user.status }))
      : queues.map((queue) => ({ id: queue.queueId, name: queue.name, kind: 'queues' }));

  return (
    <View style={styles.container}>
      <View style={styles.tabStrip}>
        {(['users', 'queues'] as TransferTab[]).map((candidate) => (
          <Pressable
            key={candidate}
            onPress={() => setTab(candidate)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === candidate }}
            style={[styles.tab, tab === candidate && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === candidate && styles.tabTextActive]}>
              {candidate === 'users'
                ? strings.interactions.transfer.users
                : strings.interactions.transfer.queues}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.searchRow}>
        <Search size={16} color={colors.gray400} />
        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder={
            tab === 'users'
              ? strings.interactions.transfer.searchUsers
              : strings.interactions.transfer.searchQueues
          }
          style={styles.searchField}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.blue600} style={styles.listSpinner} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.empty}>{strings.interactions.transfer.noResults}</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelected(item)}
              accessibilityRole="button"
              accessibilityLabel={`${strings.interactions.transfer.transferTo} ${item.name}`}
              style={({ pressed }) => [styles.targetRow, pressed && styles.targetPressed]}
            >
              <Avatar fullName={item.name} size="sm" />
              <Text style={styles.targetName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.status ? (
                <Badge
                  variant={item.status === 'Available' ? 'available' : 'secondary'}
                  textStyle={styles.statusText}
                >
                  {item.status}
                </Badge>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  tabStrip: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.white,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray500,
  },
  tabTextActive: {
    color: colors.gray900,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchField: {
    flex: 1,
    marginBottom: spacing.sm,
  },
  listContent: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  listSpinner: {
    marginTop: spacing.xl,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  targetPressed: {
    backgroundColor: colors.gray50,
  },
  targetName: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray900,
  },
  statusText: {
    fontSize: fontSize.xxs,
  },
  empty: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.gray500,
    paddingVertical: spacing.xl,
  },
  selectedCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.blue50,
    borderWidth: 1,
    borderColor: colors.blue100,
    marginBottom: spacing.lg,
  },
  selectedLabel: {
    fontSize: fontSize.xs,
    color: colors.gray500,
    marginBottom: spacing.sm,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectedName: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.gray900,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: spacing.md,
  },
  stackedButton: {
    marginBottom: spacing.sm,
  },
  consultCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.blue50,
    borderWidth: 1,
    borderColor: colors.blue100,
    marginBottom: spacing.lg,
  },
  consultTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.blue800,
  },
  consultName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.gray900,
    marginTop: spacing.xs,
  },
  consultSpinner: {
    marginTop: spacing.md,
  },
  consultActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
});
