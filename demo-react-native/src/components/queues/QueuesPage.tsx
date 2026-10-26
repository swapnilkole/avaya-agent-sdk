import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  QueueEventType,
  QueueType,
  ReasonType,
  UserEventType,
  type Queue,
  type ReasonCode,
  type User,
} from '@/sdk';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { LogoutReasonDialog } from '@/components/shared/LogoutReasonDialog';
import { strings } from '@/locales/en';
import { colors, fontSize, spacing } from '@/theme';
import { createLogger, getErrorDetails } from '@/utils/logger';
import { safeUnsubscribeUser } from '@/utils/safe-unsubscribe';

import { QueueSearchBar } from './QueueSearchBar';
import { QueueStatsCard } from './QueueStatsCard';
import { QueueTable } from './QueueTable';

const logger = createLogger('QueuesPage');

interface QueuesPageProps {
  user: User;
}

/**
 * QueuesPage — queue memberships, stats and login toggles.
 *
 * Ported from demo-app including its subscription bookkeeping: each queue is
 * individually subscribed for QUEUE_STATUS_CHANGED, and the whole set is rebuilt
 * on CX login/logout because the platform reissues queue objects at those points.
 */
export function QueuesPage({ user }: QueuesPageProps) {
  const { addNotification } = useNotifications();
  const [searchValue, setSearchValue] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(user.isLoggedInToCx);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loadingQueueIds, setLoadingQueueIds] = useState<Set<string>>(new Set());
  const queueSubscriptionsRef = useRef<Map<string, string>>(new Map());

  const [logoutPicker, setLogoutPicker] = useState<{
    open: boolean;
    reasons: ReasonCode[];
    pendingQueue: Queue | null;
    loading: boolean;
  }>({ open: false, reasons: [], pendingQueue: null, loading: false });

  const fetchQueues = useCallback(() => {
    // Personal queues are platform-managed — the agent cannot log in or out of
    // them, so they are hidden entirely.
    const sdkQueues = user.getAssignedQueues().filter((q) => q.queueType !== QueueType.PERSONAL);
    setQueues(sdkQueues);
    return sdkQueues;
  }, [user]);

  const subscribeToQueue = useCallback(
    (queue: Queue) => {
      if (queueSubscriptionsRef.current.has(queue.queueId)) return;
      const handlerId = queue.subscribe(QueueEventType.QUEUE_STATUS_CHANGED, () => {
        fetchQueues();
      });
      queueSubscriptionsRef.current.set(queue.queueId, handlerId);
    },
    [fetchQueues],
  );

  const unsubscribeAllQueues = useCallback((currentQueues: Queue[]) => {
    for (const [queueId, handlerId] of queueSubscriptionsRef.current.entries()) {
      try {
        const queue = currentQueues.find((q) => q.queueId === queueId);
        queue?.unsubscribe(QueueEventType.QUEUE_STATUS_CHANGED, handlerId);
      } catch (err) {
        logger.warn('Queue unsubscribe failed during teardown', {
          queueId,
          ...getErrorDetails(err),
        });
      }
    }
    queueSubscriptionsRef.current.clear();
  }, []);

  const resubscribeAll = useCallback(() => {
    unsubscribeAllQueues(user.getAssignedQueues());
    const updated = fetchQueues();
    updated.forEach(subscribeToQueue);
    return updated;
  }, [fetchQueues, subscribeToQueue, unsubscribeAllQueues, user]);

  useEffect(() => {
    fetchQueues().forEach(subscribeToQueue);

    const cxLoggedInHandlerId = user.subscribe(UserEventType.USER_CX_LOGGED_IN, () => {
      setIsUserLoggedIn(true);
      resubscribeAll();
    });
    const cxLoggedOutHandlerId = user.subscribe(UserEventType.USER_CX_LOGGED_OUT, () => {
      setIsUserLoggedIn(false);
      resubscribeAll();
    });

    return () => {
      safeUnsubscribeUser(user, UserEventType.USER_CX_LOGGED_IN, cxLoggedInHandlerId);
      safeUnsubscribeUser(user, UserEventType.USER_CX_LOGGED_OUT, cxLoggedOutHandlerId);
      unsubscribeAllQueues(user.getAssignedQueues());
    };
  }, [user, fetchQueues, subscribeToQueue, unsubscribeAllQueues, resubscribeAll]);

  const filteredQueues = useMemo(() => {
    if (!searchValue.trim()) return queues;
    const search = searchValue.toLowerCase();
    return queues.filter((q) => q.queueName.toLowerCase().includes(search));
  }, [queues, searchValue]);

  const stats = useMemo(() => {
    const total = queues.length;
    const loggedIn = queues.filter((q) => q.isLoggedIn).length;
    return { total, loggedIn, loggedOut: total - loggedIn };
  }, [queues]);

  const setQueueBusy = (queueId: string, busy: boolean) => {
    setLoadingQueueIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(queueId);
      else next.delete(queueId);
      return next;
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await user.refreshAssignedQueues();
      const updated = resubscribeAll();
      logger.info('Queues refreshed', { queueCount: updated.length });
    } catch (error) {
      logger.error('Queue refresh failed', getErrorDetails(error));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleQueue = async (queue: Queue, enabled: boolean) => {
    setQueueBusy(queue.queueId, true);

    if (enabled) {
      try {
        await queue.login();
        fetchQueues();
      } catch (error) {
        logger.error('Queue login failed', { queueId: queue.queueId, ...getErrorDetails(error) });
        addNotification({
          id: `queue-toggle-failed-${queue.queueId}-${Date.now()}`,
          level: 'error',
          title: strings.queues.loginFailed,
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setQueueBusy(queue.queueId, false);
      }
      return;
    }

    // Logout needs a reason, so collect the codes and hand off to the picker.
    // The queue stays busy (switch disabled) until the picker resolves.
    try {
      const reasons = await user.getAssignableReasonCodes();
      setLogoutPicker({
        open: true,
        reasons: reasons.filter((r) => r.type === ReasonType.LOGOUT),
        pendingQueue: queue,
        loading: false,
      });
    } catch (error) {
      logger.error('Queue logout preparation failed', {
        queueId: queue.queueId,
        ...getErrorDetails(error),
      });
      setQueueBusy(queue.queueId, false);
      addNotification({
        id: `queue-toggle-failed-${queue.queueId}-${Date.now()}`,
        level: 'error',
        title: strings.queues.logoutFailed,
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleLogoutReasonConfirm = async (reason: ReasonCode) => {
    const { pendingQueue } = logoutPicker;
    if (!pendingQueue) return;

    setLogoutPicker((prev) => ({ ...prev, open: false, loading: true }));
    try {
      await pendingQueue.logout(reason);
      fetchQueues();
    } catch (error) {
      logger.error('Queue logout failed', {
        queueId: pendingQueue.queueId,
        ...getErrorDetails(error),
      });
      addNotification({
        id: `queue-toggle-failed-${pendingQueue.queueId}-${Date.now()}`,
        level: 'error',
        title: strings.queues.logoutFailed,
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setQueueBusy(pendingQueue.queueId, false);
      setLogoutPicker({ open: false, reasons: [], pendingQueue: null, loading: false });
    }
  };

  const handleLogoutReasonCancel = () => {
    const { pendingQueue } = logoutPicker;
    if (pendingQueue) setQueueBusy(pendingQueue.queueId, false);
    setLogoutPicker({ open: false, reasons: [], pendingQueue: null, loading: false });
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.statsRow}>
          <QueueStatsCard label={strings.queues.totalQueues} value={stats.total} />
          <QueueStatsCard
            label={strings.queues.loggedIn}
            value={stats.loggedIn}
            variant="success"
          />
          <QueueStatsCard
            label={strings.queues.loggedOut}
            value={stats.loggedOut}
            variant="danger"
          />
        </View>

        <Text style={styles.sectionTitle}>{strings.queues.myQueues}</Text>

        <View style={styles.searchWrapper}>
          <QueueSearchBar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        </View>

        <QueueTable
          queues={filteredQueues}
          onToggleQueue={handleToggleQueue}
          isUserLoggedIn={isUserLoggedIn}
          loadingQueueIds={loadingQueueIds}
        />
      </ScrollView>

      <LogoutReasonDialog
        open={logoutPicker.open}
        reasons={logoutPicker.reasons}
        loading={logoutPicker.loading}
        onConfirm={handleLogoutReasonConfirm}
        onCancel={handleLogoutReasonCancel}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.md,
  },
  searchWrapper: {
    marginBottom: spacing.md,
  },
});
