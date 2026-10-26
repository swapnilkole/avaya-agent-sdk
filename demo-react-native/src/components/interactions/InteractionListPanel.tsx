import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';

import { InteractionStatus, type Interaction, type User } from '@/sdk';
import { strings } from '@/locales/en';
import { colors, fontSize, radius, spacing } from '@/theme';

import { AcceptingInteractionCard } from './AcceptingInteractionCard';
import { IncomingCallAlert } from './IncomingCallAlert';
import { InteractionCard } from './InteractionCard';
import { OutboundDialPanel } from './OutboundDialPanel';

interface InteractionListPanelProps {
  user: User;
  interactions: Interaction[];
  disableAcceptIncoming: boolean;
  selectedInteractionId?: string;
  onSelectInteraction: (interaction: Interaction) => void;
  onAcceptIncoming: (interaction: Interaction) => void;
  onRejectIncoming: (interaction: Interaction) => void;
  isUserLoggedIn?: boolean;
}

/**
 * InteractionListPanel — "My Interactions" list plus the outbound-dial entry point.
 *
 * Card selection per item is driven by the interaction's own state, exactly as in
 * demo-app:
 *   viewer or non-pending            -> InteractionCard
 *   ringing + acceptable             -> IncomingCallAlert
 *   ringing + accept already in flight -> AcceptingInteractionCard
 */
export function InteractionListPanel({
  user,
  interactions,
  disableAcceptIncoming,
  selectedInteractionId,
  onSelectInteraction,
  onAcceptIncoming,
  onRejectIncoming,
  isUserLoggedIn = true,
}: InteractionListPanelProps) {
  const [isOutboundOpen, setIsOutboundOpen] = useState(false);

  const renderItem = (interaction: Interaction) => {
    // Incoming-ring surface:
    //  - PENDING: regular customer ring shown to the pending owner.
    //  - ATTENDED_TRANSFER: consult ring shown to a non-viewer non-owner whose
    //    transfer has not yet been answered.
    const isRinging =
      (interaction.currentStatus === InteractionStatus.PENDING && !interaction.isViewer())
      || (interaction.currentStatus === InteractionStatus.ATTENDED_TRANSFER
        && !interaction.isViewer()
        && !interaction.isOwner
        && !interaction.transferDetails?.isAnswered);

    if (isRinging && interaction.canAccept()) {
      return (
        <IncomingCallAlert
          interaction={interaction}
          disableAccept={disableAcceptIncoming}
          onAccept={onAcceptIncoming}
          onReject={onRejectIncoming}
        />
      );
    }

    if (isRinging) {
      return <AcceptingInteractionCard interaction={interaction} />;
    }

    return (
      <InteractionCard
        interaction={interaction}
        isSelected={interaction.interactionId === selectedInteractionId}
        onPress={onSelectInteraction}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{strings.interactions.myInteractions}</Text>
        {user.canCreateOutboundVoiceInteraction && (
          <Pressable
            onPress={() => setIsOutboundOpen(true)}
            disabled={!isUserLoggedIn}
            accessibilityRole="button"
            accessibilityLabel={strings.interactions.outboundDial.createInteraction}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
              !isUserLoggedIn && styles.addButtonDisabled,
            ]}
          >
            <Plus size={18} color={colors.gray700} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={interactions}
        keyExtractor={(item) => item.interactionId}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <View accessibilityRole="none">{renderItem(item)}</View>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{strings.interactions.noActiveInteractions}</Text>
            <Text style={styles.emptySubtitle}>
              {strings.interactions.waitingForInteraction}
            </Text>
          </View>
        }
      />

      {user.canCreateOutboundVoiceInteraction && (
        <OutboundDialPanel
          user={user}
          open={isOutboundOpen}
          onOpenChange={setIsOutboundOpen}
          disabled={!isUserLoggedIn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addButton: {
    width: 44,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  addButtonPressed: {
    backgroundColor: colors.gray200,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: fontSize.sm,
    color: colors.gray500,
  },
  emptySubtitle: {
    fontSize: fontSize.xs,
    color: colors.gray400,
    marginTop: spacing.xs,
  },
});
