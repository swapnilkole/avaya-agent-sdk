import { useEffect, useState } from 'react';

import {
  AgentSdkError,
  ReasonType,
  UserEventType,
  type ReasonCode,
  type User,
  type UserStatusChangedEvent,
} from '@/sdk';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { createLogger, getErrorDetails } from '@/utils/logger';
import { safeUnsubscribeUser } from '@/utils/safe-unsubscribe';

const logger = createLogger('useUserStatus');

interface UseUserStatusReturn {
  currentStatus: ReasonCode | null;
  reasonCodes: ReasonCode[];
  filteredReasonCodes: ReasonCode[];
  selectedStatusType: ReasonType;
  selectedReasonCode: string;
  statusChangeLoading: boolean;
  setSelectedStatusType: (type: ReasonType) => void;
  setSelectedReasonCode: (code: string) => void;
  handleStatusChange: () => Promise<boolean>;
  handleStatusTypeChange: (newType: ReasonType) => void;
  /** Applies a status change with explicit type and reason (for the CX menu). */
  changeStatus: (type: ReasonType, reason: string) => Promise<boolean>;
}

/**
 * Manages user status state and operations.
 *
 * Ported from demo-app, including the subtlety that CX login/logout update the
 * SDK's status but emit their own events rather than USER_STATUS_CHANGED — so the
 * hook subscribes to all three and re-reads `user.currentStatus` on the CX events.
 */
export const useUserStatus = (user: User): UseUserStatusReturn => {
  const { addNotification } = useNotifications();
  const [currentStatus, setCurrentStatus] = useState<ReasonCode | null>(null);
  const [reasonCodes, setReasonCodes] = useState<ReasonCode[]>([]);
  const [statusChangeLoading, setStatusChangeLoading] = useState(false);
  const [selectedStatusType, setSelectedStatusType] = useState<ReasonType>(ReasonType.AVAILABLE);
  const [selectedReasonCode, setSelectedReasonCode] = useState<string>('');

  const filteredReasonCodes = reasonCodes.filter((code) => code.type === selectedStatusType);

  useEffect(() => {
    /** Reads `user.currentStatus` into hook state (the SDK updates it before CX events fire). */
    const syncStatusFromUser = () => {
      try {
        const status = user.currentStatus;
        logger.info('Synced status from user', {
          type: status.type,
          hasReason: (status.reason?.length ?? 0) > 0,
        });
        setCurrentStatus(status);
      } catch (err) {
        logger.warn('Failed to read current status from user', { ...getErrorDetails(err) });
      }
    };

    const loadStatus = async () => {
      try {
        const status = await user.refreshStatus();
        setCurrentStatus(status);
      } catch (err) {
        logger.error('Current status load failed', getErrorDetails(err));
      }
    };

    const loadReasonCodes = async () => {
      try {
        const codes = await user.getAssignableReasonCodes();
        setReasonCodes(codes);
      } catch (err) {
        logger.error('Reason codes load failed', getErrorDetails(err));
      }
    };

    void loadStatus();
    void loadReasonCodes();

    const statusHandlerId = user.subscribe(
      UserEventType.USER_STATUS_CHANGED,
      (event: UserStatusChangedEvent) => {
        logger.info('USER_STATUS_CHANGED received', {
          type: event.payload.status.type,
          hasReason: (event.payload.status.reason?.length ?? 0) > 0,
        });
        setCurrentStatus({
          type: event.payload.status.type,
          reason: event.payload.status.reason,
        });
        setStatusChangeLoading(false);
      },
    );

    const cxLoginHandlerId = user.subscribe(UserEventType.USER_CX_LOGGED_IN, () => {
      logger.info('USER_CX_LOGGED_IN received — syncing profile status');
      syncStatusFromUser();
    });

    const cxLogoutHandlerId = user.subscribe(UserEventType.USER_CX_LOGGED_OUT, () => {
      logger.info('USER_CX_LOGGED_OUT received — syncing profile status');
      syncStatusFromUser();
    });

    return () => {
      safeUnsubscribeUser(user, UserEventType.USER_STATUS_CHANGED, statusHandlerId);
      safeUnsubscribeUser(user, UserEventType.USER_CX_LOGGED_IN, cxLoginHandlerId);
      safeUnsubscribeUser(user, UserEventType.USER_CX_LOGGED_OUT, cxLogoutHandlerId);
    };
  }, [user]);

  const handleStatusTypeChange = (newType: ReasonType) => {
    setSelectedStatusType(newType);
    setSelectedReasonCode('');
  };

  const changeStatus = async (type: ReasonType, reason: string): Promise<boolean> => {
    if (
      currentStatus !== null
      && currentStatus.type === type
      && (currentStatus.reason ?? '') === reason
    ) {
      return true;
    }

    setStatusChangeLoading(true);

    try {
      await user.changeStatus({ type, reason: reason || undefined });
      return true;
    } catch (err) {
      logger.error('User status change failed', {
        statusType: type,
        hasReason: reason.length > 0,
        ...getErrorDetails(err),
      });
      addNotification({
        id: `status-change-failed-${Date.now()}`,
        level: 'error',
        title: 'Failed to change status',
        description: AgentSdkError.is(err)
          ? (err.detail ?? err.message)
          : err instanceof Error
            ? err.message
            : undefined,
      });
      return false;
    } finally {
      setStatusChangeLoading(false);
    }
  };

  const handleStatusChange = async (): Promise<boolean> =>
    changeStatus(selectedStatusType, selectedReasonCode);

  return {
    currentStatus,
    reasonCodes,
    filteredReasonCodes,
    selectedStatusType,
    selectedReasonCode,
    statusChangeLoading,
    setSelectedStatusType,
    setSelectedReasonCode,
    handleStatusChange,
    handleStatusTypeChange,
    changeStatus,
  };
};
