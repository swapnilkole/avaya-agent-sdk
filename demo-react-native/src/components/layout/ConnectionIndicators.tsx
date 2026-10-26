import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Headphones, Wifi, WifiOff } from 'lucide-react-native';

import {
  WebRtcRegistrationState,
  WebSocketConnectionEventType,
  agentSdk,
  type User,
} from '@/sdk';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { NotificationNames } from '@/components/notifications/notification-names';
import { strings } from '@/locales/en';
import { colors, radius, spacing } from '@/theme';

/**
 * WebSocketConnectionIndicator — live socket health in the header.
 *
 * Subscribes to the SDK's socket lifecycle events and raises/clears the same
 * notifications demo-app does, so a dropped connection is visible both as an icon
 * and as a toast.
 */
export function WebSocketConnectionIndicator() {
  const [isConnected, setIsConnected] = useState(true);
  const { addNotification, removeNotification } = useNotifications();

  useEffect(() => {
    const connectedId = agentSdk.subscribe(WebSocketConnectionEventType.CONNECTED, () => {
      setIsConnected(true);
      removeNotification(NotificationNames.WEBSOCKET_CONNECTION_LOST);
      addNotification({
        id: NotificationNames.WEBSOCKET_CONNECTION_ESTABLISHED,
        level: 'success',
        title: strings.notifications.events.websocketReconnectedTitle,
        description: strings.notifications.events.websocketReconnectedDescription,
      });
    });

    const closedId = agentSdk.subscribe(WebSocketConnectionEventType.CONNECTION_CLOSED, () => {
      setIsConnected(false);
    });

    const failedId = agentSdk.subscribe(WebSocketConnectionEventType.CONNECTION_FAILED, () => {
      setIsConnected(false);
      addNotification({
        id: NotificationNames.WEBSOCKET_CONNECTION_LOST,
        level: 'error',
        title: strings.notifications.events.websocketLostTitle,
        description: strings.notifications.events.websocketLostDescription,
      });
    });

    return () => {
      agentSdk.unsubscribe(WebSocketConnectionEventType.CONNECTED, connectedId);
      agentSdk.unsubscribe(WebSocketConnectionEventType.CONNECTION_CLOSED, closedId);
      agentSdk.unsubscribe(WebSocketConnectionEventType.CONNECTION_FAILED, failedId);
    };
  }, [addNotification, removeNotification]);

  return (
    <View
      style={[styles.indicator, isConnected ? styles.ok : styles.bad]}
      accessibilityLabel={isConnected ? 'Socket connected' : 'Socket disconnected'}
    >
      {isConnected ? (
        <Wifi size={15} color={colors.green700} />
      ) : (
        <WifiOff size={15} color={colors.red600} />
      )}
    </View>
  );
}

interface WebRtcRegistrationIndicatorProps {
  user: User;
}

/**
 * WebRtcRegistrationIndicator — voice-readiness light.
 *
 * Polls `getWebRtcRegistrationState()` because registration transitions are not
 * surfaced as user events; a one-second poll is cheap and keeps the header honest.
 */
export function WebRtcRegistrationIndicator({ user }: WebRtcRegistrationIndicatorProps) {
  const [state, setState] = useState<WebRtcRegistrationState>(() =>
    user.getWebRtcRegistrationState(),
  );

  useEffect(() => {
    const interval = setInterval(() => setState(user.getWebRtcRegistrationState()), 1000);
    return () => clearInterval(interval);
  }, [user]);

  const isRegistered = state === WebRtcRegistrationState.REGISTERED;

  return (
    <View
      style={[styles.indicator, isRegistered ? styles.ok : styles.idle]}
      accessibilityLabel={`WebRTC ${state}`}
    >
      <Headphones size={15} color={isRegistered ? colors.green700 : colors.gray400} />
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    marginLeft: spacing.xs,
  },
  ok: {
    backgroundColor: colors.green50,
  },
  bad: {
    backgroundColor: colors.red50,
  },
  idle: {
    backgroundColor: colors.gray100,
  },
});
