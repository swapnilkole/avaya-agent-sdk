import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react-native';

import { colors, fontSize, radius, shadow, spacing } from '@/theme';
import { strings } from '@/locales/en';

import { useNotifications, type AppNotification, type NotificationLevel } from './NotificationProvider';

const levelStyles: Record<
  NotificationLevel,
  { bg: string; border: string; fg: string; Icon: typeof Info }
> = {
  error: { bg: colors.red50, border: colors.red200, fg: colors.red700, Icon: XCircle },
  warning: { bg: colors.amber50, border: colors.amber200, fg: colors.amber800, Icon: AlertTriangle },
  success: { bg: colors.green50, border: colors.green100, fg: colors.green800, Icon: CheckCircle2 },
  info: { bg: colors.blue50, border: colors.blue100, fg: colors.blue800, Icon: Info },
};

function NotificationToast({ notification }: { notification: AppNotification }) {
  const { removeNotification } = useNotifications();
  const palette = levelStyles[notification.level];
  const { Icon } = palette;
  const { id, autoDismissMs } = notification;

  // Errors stick until dismissed (autoDismissMs === null); everything else expires.
  useEffect(() => {
    if (autoDismissMs === null) return undefined;
    const timer = setTimeout(() => removeNotification(id), autoDismissMs);
    return () => clearTimeout(timer);
  }, [id, autoDismissMs, removeNotification]);

  return (
    <View
      style={[styles.toast, { backgroundColor: palette.bg, borderColor: palette.border }]}
      accessibilityRole="alert"
      accessibilityLiveRegion={notification.level === 'error' ? 'assertive' : 'polite'}
    >
      {notification.loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <Icon size={18} color={palette.fg} />
      )}

      <View style={styles.toastBody}>
        <Text style={[styles.toastTitle, { color: palette.fg }]}>{notification.title}</Text>
        {notification.description ? (
          <Text style={styles.toastDescription}>{notification.description}</Text>
        ) : null}
      </View>

      <Pressable
        onPress={() => removeNotification(notification.id)}
        accessibilityRole="button"
        accessibilityLabel={strings.notifications.close}
        hitSlop={8}
      >
        <X size={16} color={palette.fg} />
      </Pressable>
    </View>
  );
}

/**
 * NotificationCenter — floating toast stack.
 *
 * Anchored below the status bar via safe-area insets so toasts never collide with
 * the notch. `pointerEvents="box-none"` lets taps fall through the empty area to
 * the screen underneath.
 */
export function NotificationCenter() {
  const { notifications } = useNotifications();
  const insets = useSafeAreaInsets();

  if (notifications.length === 0) return null;

  return (
    <View style={[styles.container, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
      {notifications.slice(0, 3).map((notification) => (
        <NotificationToast key={notification.id} notification={notification} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
    gap: spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadow.md,
  },
  toastBody: {
    flex: 1,
  },
  toastTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  toastDescription: {
    fontSize: fontSize.xs,
    color: colors.gray600,
    marginTop: 2,
  },
});
