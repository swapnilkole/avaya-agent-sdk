import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  CheckCircle,
  CheckSquare,
  Hash,
  Mic,
  MicOff,
  Pause,
  PhoneOff,
  Play,
  TimerReset,
  XSquare,
} from 'lucide-react-native';

import { InteractionCommType, type Interaction } from '@/sdk';
import { Badge } from '@/components/ui/Badge';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { strings } from '@/locales/en';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';
import { createLogger, getErrorDetails } from '@/utils/logger';

import { DtmfDialPad } from './DtmfDialPad';
import { TimerDisplay } from './TimerDisplay';
import { WrapUpCountdownDisplay } from './WrapUpCountdownDisplay';

const logger = createLogger('CallControlsBar');

interface CallControlsBarProps {
  interaction: Interaction;
  onHold: (interaction: Interaction) => void | Promise<void>;
  onMute: (interaction: Interaction) => void | Promise<void>;
  onTransfer: (interaction: Interaction) => void;
  onEndCall: (interaction: Interaction) => void | Promise<void>;
  onClosedResolved: (interaction: Interaction) => void | Promise<void>;
  onClosedUnresolved: (interaction: Interaction) => void | Promise<void>;
  onWrapUp: (interaction: Interaction) => void | Promise<void>;
  onExtendWrapUp: (interaction: Interaction) => void | Promise<void>;
}

/** Transfer glyph: two stacked arrows pointing opposite ways, as in demo-app. */
function TransferIcon({ size = 22, color = colors.gray800 }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center' }}>
      <View style={[styles.transferArrow, { backgroundColor: color }]} />
      <View style={[styles.transferArrow, styles.transferArrowLower, { backgroundColor: color }]} />
    </View>
  );
}

interface CircleButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  active?: boolean;
  activeBg?: string;
  activeFg?: string;
  label: string;
  children: (color: string) => React.ReactNode;
}

/** Round icon control used for hold / mute / dtmf / transfer / end-call. */
function CircleButton({
  onPress,
  disabled = false,
  loading = false,
  active = false,
  activeBg,
  activeFg,
  label,
  children,
}: CircleButtonProps) {
  const inactive = disabled || loading;
  const background = active && activeBg ? activeBg : colors.gray100;
  const foreground = active && activeFg ? activeFg : colors.gray800;

  return (
    <View style={styles.circleWrapper}>
      <Pressable
        onPress={inactive ? undefined : onPress}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: inactive, selected: active }}
        style={({ pressed }) => [
          styles.circleButton,
          { backgroundColor: background },
          pressed && !inactive && styles.pressed,
          inactive && styles.disabled,
        ]}
      >
        {loading ? <ActivityIndicator size="small" color={foreground} /> : children(foreground)}
      </Pressable>
    </View>
  );
}

/**
 * CallControlsBar — customer header plus the live call controls.
 *
 * Every button's enabled state is read from the interaction's own `can*()`
 * predicates, exactly as in demo-app, so the SDK remains the single
 * source of truth for what is permitted in the current state.
 *
 * The controls scroll horizontally because a phone cannot fit the web app's full
 * row; order and grouping are otherwise unchanged.
 */
export function CallControlsBar({
  interaction,
  onHold,
  onMute,
  onTransfer,
  onEndCall,
  onClosedResolved,
  onClosedUnresolved,
  onWrapUp,
  onExtendWrapUp,
}: CallControlsBarProps) {
  const [isDtmfPadOpen, setIsDtmfPadOpen] = useState(false);
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());
  const [, setWrapUpTick] = useState(0);
  const { addNotification } = useNotifications();

  const isActionLoading = (action: string) => loadingActions.has(action);

  const withLoading = useCallback(
    async (action: string, fn: () => void | Promise<void>) => {
      setLoadingActions((prev) => new Set(prev).add(action));
      try {
        await fn();
      } catch (error) {
        logger.error('Call control action failed', {
          actionName: action,
          interactionId: interaction.interactionId,
          ...getErrorDetails(error),
        });
        addNotification({
          id: `call-control-failed-${action}-${Date.now()}`,
          level: 'error',
          title: strings.interactions.controls.actionFailed,
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setLoadingActions((prev) => {
          const next = new Set(prev);
          next.delete(action);
          return next;
        });
      }
    },
    [addNotification, interaction.interactionId],
  );

  const { customer, queueDetails, startTime } = interaction;
  const customerName = customer.name?.length > 0 ? customer.name : 'Guest';
  const isOnHold = interaction.isHold;
  const isMuted = interaction.isMuted;
  const isWrapUp = interaction.canWrapUp();
  const isViewer = interaction.isViewer();

  const channelLabel =
    strings.interactions.channels[
      interaction.communicationType as keyof typeof strings.interactions.channels
    ] ?? String(interaction.communicationType);

  const canToggleHold = interaction.canHold() || interaction.canResume();
  const canToggleMute = interaction.canMute() || interaction.canUnmute();
  const canOpenTransfer = interaction.canTransfer() || interaction.canAttendedTransfer();

  return (
    <View style={styles.container}>
      {/* Customer header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.customerName} numberOfLines={1}>
              {customerName}
            </Text>
            <Badge variant="secondary" style={styles.channelBadge} textStyle={styles.channelText}>
              {channelLabel}
            </Badge>
            {isViewer && (
              <Badge variant="secondary" style={styles.viewerBadge} textStyle={styles.viewerText}>
                {strings.interactions.transfer.viewing}
              </Badge>
            )}
          </View>
          <Text style={styles.subline} numberOfLines={1}>
            {`${customer.phone} - ${queueDetails.name}`}
          </Text>
        </View>

        <View style={styles.timerPill} accessibilityRole="timer">
          <TimerDisplay startTime={startTime} style={styles.timerText} />
        </View>
      </View>

      {/* Controls */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.controls}
        accessibilityLabel="Call controls"
      >
        {!isViewer && !isWrapUp && (
          <>
            <CircleButton
              label={isOnHold ? strings.interactions.controls.resumeHold : strings.interactions.controls.hold}
              onPress={() => withLoading('hold', () => onHold(interaction))}
              disabled={!canToggleHold}
              loading={isActionLoading('hold')}
              active={isOnHold}
              activeBg={colors.amber100}
              activeFg={colors.amber700}
            >
              {(color) => (isOnHold ? <Play size={22} color={color} /> : <Pause size={22} color={color} />)}
            </CircleButton>

            <CircleButton
              label={isMuted ? strings.interactions.controls.unmute : strings.interactions.controls.mute}
              onPress={() => withLoading('mute', () => onMute(interaction))}
              disabled={!canToggleMute}
              loading={isActionLoading('mute')}
              active={isMuted}
              activeBg={colors.red100}
              activeFg={colors.red700}
            >
              {(color) => (isMuted ? <MicOff size={22} color={color} /> : <Mic size={22} color={color} />)}
            </CircleButton>

            <CircleButton
              label={strings.interactions.controls.dialPad}
              onPress={() => setIsDtmfPadOpen(true)}
              disabled={!interaction.canSendDtmf()}
              active={isDtmfPadOpen}
              activeBg={colors.blue100}
              activeFg={colors.blue800}
            >
              {(color) => <Hash size={22} color={color} />}
            </CircleButton>

            <CircleButton
              label={strings.interactions.controls.transfer}
              onPress={() => onTransfer(interaction)}
              disabled={!canOpenTransfer}
            >
              {(color) => <TransferIcon color={color} />}
            </CircleButton>

            <CircleButton
              label={strings.interactions.controls.endCall}
              onPress={() => withLoading('endCall', () => onEndCall(interaction))}
              disabled={!interaction.canDisconnectCall()}
              loading={isActionLoading('endCall')}
              active
              activeBg={colors.red600}
              activeFg={colors.white}
            >
              {(color) => <PhoneOff size={22} color={color} />}
            </CircleButton>

            <Pressable
              onPress={() =>
                interaction.canResolve() && withLoading('resolve', () => onClosedResolved(interaction))
              }
              disabled={!interaction.canResolve() || isActionLoading('resolve')}
              accessibilityRole="button"
              accessibilityLabel={strings.interactions.controls.closedResolved}
              style={({ pressed }) => [
                styles.pillButton,
                styles.resolvedButton,
                pressed && styles.pressed,
                (!interaction.canResolve() || isActionLoading('resolve')) && styles.disabled,
              ]}
            >
              {isActionLoading('resolve') ? (
                <ActivityIndicator size="small" color={colors.green800} />
              ) : (
                <CheckSquare size={16} color={colors.green800} />
              )}
              <Text style={[styles.pillText, { color: colors.green800 }]}>
                {strings.interactions.controls.closedResolved}
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                interaction.canUnresolve()
                && withLoading('unresolve', () => onClosedUnresolved(interaction))
              }
              disabled={!interaction.canUnresolve() || isActionLoading('unresolve')}
              accessibilityRole="button"
              accessibilityLabel={strings.interactions.controls.closedUnresolved}
              style={({ pressed }) => [
                styles.pillButton,
                styles.unresolvedButton,
                pressed && styles.pressed,
                (!interaction.canUnresolve() || isActionLoading('unresolve')) && styles.disabled,
              ]}
            >
              {isActionLoading('unresolve') ? (
                <ActivityIndicator size="small" color={colors.orange800} />
              ) : (
                <XSquare size={16} color={colors.orange800} />
              )}
              <Text style={[styles.pillText, { color: colors.orange800 }]}>
                {strings.interactions.controls.closedUnresolved}
              </Text>
            </Pressable>
          </>
        )}

        {!isViewer && isWrapUp && (
          <>
            <Pressable
              onPress={() => withLoading('wrapUp', () => onWrapUp(interaction))}
              disabled={isActionLoading('wrapUp')}
              accessibilityRole="button"
              accessibilityLabel={strings.interactions.controls.wrapUp}
              style={({ pressed }) => [
                styles.pillButton,
                styles.wrapUpButton,
                pressed && styles.pressed,
                isActionLoading('wrapUp') && styles.disabled,
              ]}
            >
              {isActionLoading('wrapUp') ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <CheckCircle size={16} color={colors.white} />
              )}
              <Text style={[styles.pillText, { color: colors.white }]}>
                {strings.interactions.controls.wrapUp}
              </Text>
              <WrapUpCountdownDisplay
                deadline={interaction.wrapUpDeadline}
                onTick={setWrapUpTick}
                style={[styles.pillText, { color: colors.white }]}
              />
            </Pressable>

            {(queueDetails.wrapUpExtendDuration ?? 0) > 0 && (
              <Pressable
                onPress={() =>
                  interaction.canExtendWrapUp()
                  && withLoading('extendWrapUp', () => onExtendWrapUp(interaction))
                }
                disabled={!interaction.canExtendWrapUp() || isActionLoading('extendWrapUp')}
                accessibilityRole="button"
                accessibilityLabel={strings.interactions.controls.extendWrapUp}
                style={({ pressed }) => [
                  styles.pillButton,
                  styles.extendButton,
                  pressed && styles.pressed,
                  (!interaction.canExtendWrapUp() || isActionLoading('extendWrapUp')) && styles.disabled,
                ]}
              >
                {isActionLoading('extendWrapUp') ? (
                  <ActivityIndicator size="small" color={colors.purple800} />
                ) : (
                  <TimerReset size={16} color={colors.purple800} />
                )}
                <Text style={[styles.pillText, { color: colors.purple800 }]}>
                  {`+${queueDetails.wrapUpExtendDuration ?? 0}s`}
                </Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      <DtmfDialPad
        open={isDtmfPadOpen}
        onClose={() => setIsDtmfPadOpen(false)}
        onDigitPress={(digit) => {
          try {
            interaction.sendDtmf(digit);
          } catch (error) {
            logger.error('DTMF send failed', {
              interactionId: interaction.interactionId,
              ...getErrorDetails(error),
            });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  customerName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.gray900,
    flexShrink: 1,
  },
  channelBadge: {
    backgroundColor: colors.blue100,
  },
  channelText: {
    color: colors.blue800,
  },
  viewerBadge: {
    backgroundColor: colors.purple100,
  },
  viewerText: {
    color: colors.purple800,
  },
  subline: {
    fontSize: fontSize.xs,
    color: colors.gray500,
    marginTop: 2,
  },
  timerPill: {
    paddingHorizontal: spacing.md,
    height: 38,
    borderRadius: radius.lg,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.gray900,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingRight: spacing.xs,
  },
  circleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButton: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  resolvedButton: {
    backgroundColor: colors.green100,
  },
  unresolvedButton: {
    backgroundColor: colors.orange100,
  },
  wrapUpButton: {
    backgroundColor: colors.purple600,
  },
  extendButton: {
    backgroundColor: colors.purple100,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.5,
  },
  transferArrow: {
    height: 2,
    width: '100%',
    borderRadius: 1,
    marginVertical: 3,
  },
  transferArrowLower: {
    width: '80%',
    alignSelf: 'flex-end',
  },
});
