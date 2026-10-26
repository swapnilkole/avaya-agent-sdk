import { useCallback, useEffect, useState } from 'react';

import { AgentSdkError, type ReasonCode, type User } from '@/sdk';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { strings } from '@/locales/en';
import { createLogger, getErrorDetails } from '@/utils/logger';
import { filterLoginStatusReasons } from '@/utils/loginStatusReasons';
import { filterLogoutStatusReasons } from '@/utils/logoutStatusReasons';

const logger = createLogger('useCxLogin');

interface UseCxLoginOptions {
  /** Called after a successful CX login or logout. */
  onSuccess?: () => void;
}

interface UseCxLoginReturn {
  cxLoginLoading: boolean;
  loginStatusReasons: ReasonCode[];
  loginStatusReasonsLoading: boolean;
  logoutStatusReasons: ReasonCode[];
  logoutStatusReasonsLoading: boolean;
  handleLoginToCx: (reasonCode?: ReasonCode) => Promise<void>;
  handleLogoutFromCx: (reasonCode: ReasonCode) => Promise<void>;
}

/**
 * Manages CX login/logout state and the assignable reason codes each needs.
 * Failures surface as toast notifications, consistent with the rest of the app.
 */
export const useCxLogin = (user: User, options: UseCxLoginOptions = {}): UseCxLoginReturn => {
  const { onSuccess } = options;
  const { addNotification } = useNotifications();
  const [cxLoginLoading, setCxLoginLoading] = useState(false);
  const [loginStatusReasons, setLoginStatusReasons] = useState<ReasonCode[]>([]);
  const [loginStatusReasonsLoading, setLoginStatusReasonsLoading] = useState(false);
  const [logoutStatusReasons, setLogoutStatusReasons] = useState<ReasonCode[]>([]);
  const [logoutStatusReasonsLoading, setLogoutStatusReasonsLoading] = useState(false);

  const loadLoginStatusReasons = useCallback(async () => {
    setLoginStatusReasonsLoading(true);
    try {
      const codes = await user.getAssignableReasonCodes();
      const filtered = filterLoginStatusReasons(codes);
      setLoginStatusReasons(filtered);
      logger.info('Loaded login status reasons', { count: filtered.length });
    } catch (err) {
      logger.warn('Failed to load login status reasons', { ...getErrorDetails(err) });
      setLoginStatusReasons([]);
    } finally {
      setLoginStatusReasonsLoading(false);
    }
  }, [user]);

  const loadLogoutStatusReasons = useCallback(async () => {
    setLogoutStatusReasonsLoading(true);
    try {
      const codes = await user.getAssignableReasonCodes();
      const filtered = filterLogoutStatusReasons(codes);
      setLogoutStatusReasons(filtered);
      logger.info('Loaded logout status reasons', { count: filtered.length });
    } catch (err) {
      logger.warn('Failed to load logout status reasons', { ...getErrorDetails(err) });
      setLogoutStatusReasons([]);
    } finally {
      setLogoutStatusReasonsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadLoginStatusReasons();
    void loadLogoutStatusReasons();
  }, [loadLoginStatusReasons, loadLogoutStatusReasons]);

  const describeError = (err: unknown): string | undefined => {
    if (AgentSdkError.is(err)) return err.detail ?? err.message;
    return err instanceof Error ? err.message : undefined;
  };

  const handleLoginToCx = useCallback(
    async (reasonCode?: ReasonCode) => {
      setCxLoginLoading(true);
      try {
        await user.loginToCx(reasonCode);
        logger.info('CX login succeeded', { withInitialStatus: reasonCode !== undefined });
        onSuccess?.();
      } catch (err) {
        logger.error('CX login failed', { ...getErrorDetails(err) });
        addNotification({
          id: `cx-login-failed-${Date.now()}`,
          level: 'error',
          title: strings.userProfile.loginFailed,
          description: describeError(err),
        });
      } finally {
        setCxLoginLoading(false);
      }
    },
    [addNotification, onSuccess, user],
  );

  const handleLogoutFromCx = useCallback(
    async (reasonCode: ReasonCode) => {
      setCxLoginLoading(true);
      try {
        await user.logoutFromCx(reasonCode);
        logger.info('CX logout succeeded');
        onSuccess?.();
      } catch (err) {
        logger.error('CX logout failed', { ...getErrorDetails(err) });
        addNotification({
          id: `cx-logout-failed-${Date.now()}`,
          level: 'error',
          title: strings.userProfile.logoutFailed,
          description: describeError(err),
        });
      } finally {
        setCxLoginLoading(false);
      }
    },
    [addNotification, onSuccess, user],
  );

  return {
    cxLoginLoading,
    loginStatusReasons,
    loginStatusReasonsLoading,
    logoutStatusReasons,
    logoutStatusReasonsLoading,
    handleLoginToCx,
    handleLogoutFromCx,
  };
};
