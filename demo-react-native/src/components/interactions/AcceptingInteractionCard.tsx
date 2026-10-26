import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Phone } from 'lucide-react-native';

import type { Interaction } from '@/sdk';
import { strings } from '@/locales/en';
import { colors, fontSize, radius, spacing } from '@/theme';

import { TimerDisplay } from './TimerDisplay';

interface AcceptingInteractionCardProps {
  interaction: Interaction;
}

/**
 * AcceptingInteractionCard — shown while an accept is in flight on a still-pending
 * interaction, so the agent can see the SDK is working rather than a doorbell that
 * cannot be clicked.
 *
 * Styling intentionally matches IncomingCallAlert (amber, phone icon) so the
 * ringing -> accepting transition reads as continuous state, not two unrelated cards.
 */
export function AcceptingInteractionCard({ interaction }: AcceptingInteractionCardProps) {
  const callerDisplay = interaction.customer.name || interaction.customer.phone;
  const { transferDetails } = interaction;

  const transferDescription =
    transferDetails?.transferType === 'blind'
      ? 'Blind Transfer'
      : transferDetails?.transferType === 'attended'
        ? `Attended Transfer${transferDetails.user?.name ? ` from ${transferDetails.user.name}` : ''}`
        : null;

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Accepting call from ${callerDisplay}`}
    >
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <Phone size={16} color={colors.white} />
        </View>

        <View style={styles.body}>
          <Text style={styles.eyebrow}>{strings.interactions.incomingCall}</Text>
          <Text style={styles.caller} numberOfLines={1}>
            {callerDisplay}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{`${interaction.queueDetails.name} - `}</Text>
            <TimerDisplay startTime={interaction.startTime} style={styles.meta} />
          </View>

          {transferDescription && <Text style={styles.transferLine}>{transferDescription}</Text>}

          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={colors.amber800} />
            <Text style={styles.statusText}>{strings.interactions.accepting}</Text>
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.amber800,
  },
});
