import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Phone } from 'lucide-react-native';

import type { Interaction } from '@/sdk';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { strings } from '@/locales/en';
import { colors, fontSize, radius, spacing } from '@/theme';
import { createLogger, getErrorDetails } from '@/utils/logger';

import { TimerDisplay } from './TimerDisplay';

const logger = createLogger('IncomingCallAlert');

interface IncomingCallAlertProps {
  interaction: Interaction;
  disableAccept: boolean;
  onAccept: (interaction: Interaction) => void | Promise<void>;
  onReject: (interaction: Interaction) => void | Promise<void>;
}

/**
 * Pulsing halo behind the phone icon — the RN equivalent of demo-app's
 * `animate-ping` ring, which draws the eye to a ringing call.
 */
function PulsingRing() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseRing,
        {
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
          transform: [
            { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) },
          ],
        },
      ]}
    />
  );
}

/**
 * IncomingCallAlert — ringing interaction with accept/reject.
 *
 * Amber styling and assertive live-region semantics match demo-app so the ring is
 * unmistakable both visually and to screen readers.
 */
export function IncomingCallAlert({
  interaction,
  disableAccept,
  onAccept,
  onReject,
}: IncomingCallAlertProps) {
  const [isResponding, setIsResponding] = useState<'accept' | 'reject' | null>(null);
  const { addNotification } = useNotifications();

  const { customer, queueDetails, startTime, transferDetails } = interaction;
  const callerDisplay = customer.name || customer.phone;

  const transferDescription =
    transferDetails?.transferType === 'blind'
      ? 'Blind Transfer'
      : transferDetails?.transferType === 'attended'
        ? `Attended Transfer${transferDetails.user?.name ? ` from ${transferDetails.user.name}` : ''}`
        : null;

  const handleAccept = async () => {
    setIsResponding('accept');
    try {
      await onAccept(interaction);
    } catch (error) {
      logger.error('Interaction accept failed', {
        interactionId: interaction.interactionId,
        ...getErrorDetails(error),
      });
      addNotification({
        id: `accept-failed-${interaction.interactionId}-${Date.now()}`,
        level: 'error',
        title: strings.interactions.acceptFailed,
        description: error instanceof Error ? error.message : undefined,
      });
      setIsResponding(null);
    }
  };

  const handleReject = async () => {
    setIsResponding('reject');
    try {
      await onReject(interaction);
    } catch (error) {
      logger.error('Interaction reject failed', {
        interactionId: interaction.interactionId,
        ...getErrorDetails(error),
      });
      addNotification({
        id: `reject-failed-${interaction.interactionId}-${Date.now()}`,
        level: 'error',
        title: strings.interactions.rejectFailed,
        description: error instanceof Error ? error.message : undefined,
      });
      setIsResponding(null);
    }
  };

  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`${
        transferDescription ? `${transferDescription} - ` : ''
      }Incoming call from ${callerDisplay}`}
    >
      <View style={styles.row}>
        <View style={styles.iconWrapper}>
          <PulsingRing />
          <View style={styles.iconCircle}>
            <Phone size={16} color={colors.white} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.eyebrow}>{strings.interactions.incomingCall}</Text>
          <Text style={styles.caller} numberOfLines={1}>
            {callerDisplay}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta} numberOfLines={1}>
              {`${queueDetails.name} - `}
            </Text>
            <TimerDisplay startTime={startTime} style={styles.meta} />
          </View>

          {transferDescription && (
            <Text style={styles.transferLine}>{transferDescription}</Text>
          )}

          <View style={styles.actions}>
            <Button
              variant="success"
              size="sm"
              onPress={handleAccept}
              disabled={disableAccept || isResponding !== null}
              loading={isResponding === 'accept'}
              accessibilityLabel={`Accept call from ${callerDisplay}`}
            >
              {strings.interactions.accept}
            </Button>

            {interaction.canReject() && (
              <Button
                variant="destructive"
                size="sm"
                onPress={handleReject}
                disabled={isResponding !== null}
                loading={isResponding === 'reject'}
                accessibilityLabel={`Reject call from ${callerDisplay}`}
              >
                {strings.interactions.reject}
              </Button>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.amber50,
    borderWidth: 2,
    borderColor: colors.amber600,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.amber600,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.amber600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: fontSize.xxs,
    fontWeight: '700',
    color: colors.amber800,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  caller: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.gray900,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.gray500,
  },
  transferLine: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.blue700,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
