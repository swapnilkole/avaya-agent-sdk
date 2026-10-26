import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  UserEventType,
  type Interaction,
  type InteractionAutoAcceptFailedEvent,
  type InteractionCreatedEvent,
  type InteractionReceivedEvent,
  type InteractionViewingStartedEvent,
  type ReasonCode,
  type User,
} from '@/sdk';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { NotificationNames } from '@/components/notifications/notification-names';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useUserStatus } from '@/hooks/useUserStatus';
import { strings } from '@/locales/en';
import { colors } from '@/theme';
import { createLogger } from '@/utils/logger';
import { safeUnsubscribeUser } from '@/utils/safe-unsubscribe';

import { AppHeader } from './AppHeader';
import { InteractionsContext, type InteractionsContextType } from './interactions-context';
import { RootTabs } from '@/navigation/RootTabs';

const logger = createLogger('MainLayout');

/**
 * Inserts an interaction at the head of the list unless one with the same id is
 * already present. New arrivals go to the top so a ring on a busy list is visible
 * without scrolling.
 */
function prependInteraction(list: Interaction[], interaction: Interaction): Interaction[] {
  if (list.some((existing) => existing.interactionId === interaction.interactionId)) return list;
  return [interaction, ...list];
}

interface MainLayoutProps {
  user: User;
  onSignOut?: () => void;
}

/**
 * MainLayout — header, tabs, and the global interaction state.
 *
 * Interaction state is hoisted here (rather than into a screen) so it survives tab
 * navigation, exactly as demo-app hoists it above the router outlet. All user-level
 * SDK subscriptions live here too, which is what lets an interaction that arrives
 * while the Queues tab is open still be waiting on the Interactions tab.
 */
export function MainLayout({ user, onSignOut }: MainLayoutProps) {
  // Every interaction the user is associated with — ringing, connected, on hold,
  // in wrap-up, or being viewed — lives in one list. Consumers read
  // `interaction.currentStatus` and role predicates to decide how to present each.
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedInteractionId, setSelectedInteractionId] = useState<string | undefined>(undefined);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(user.isLoggedInToCx);
  const { addNotification } = useNotifications();
  const { currentStatus } = useUserStatus(user);

  const addInteractionToList = useCallback((interaction: Interaction) => {
    setInteractions((prev) => prependInteraction(prev, interaction));
  }, []);

  const refreshInteractionsList = useCallback(() => {
    setInteractions((prev) => [...prev]);
  }, []);

  useEffect(() => {
    // Inbound: the interaction is ringing. Selection is NOT set here — the agent
    // has not accepted yet.
    const receivedId = user.subscribe(
      UserEventType.INTERACTION_RECEIVED,
      (event: InteractionReceivedEvent) => {
        const { interaction } = event.payload;
        logger.info('Interaction received', {
          interactionId: interaction.interactionId,
          communicationType: interaction.communicationType,
          currentStatus: interaction.currentStatus,
        });
        addInteractionToList(interaction);
      },
    );

    // Outbound: already connected when this fires. Add, select, and notify.
    const createdId = user.subscribe(
      UserEventType.INTERACTION_CREATED,
      (event: InteractionCreatedEvent) => {
        const { interaction } = event.payload;
        logger.info('Outbound interaction created', {
          interactionId: interaction.interactionId,
        });
        addInteractionToList(interaction);
        setSelectedInteractionId(interaction.interactionId);
        addNotification({
          id: `${NotificationNames.OUTBOUND_CALL_CONNECTED}:${interaction.interactionId}`,
          level: 'success',
          title: strings.notifications.events.outboundCallConnectedTitle,
          description: strings.notifications.events.outboundCallConnectedDescription(
            interaction.customer.phone,
          ),
        });
      },
    );

    const viewingId = user.subscribe(
      UserEventType.INTERACTION_VIEWING_STARTED,
      (event: InteractionViewingStartedEvent) => {
        const { interaction } = event.payload;
        logger.info('Interaction viewing started', {
          interactionId: interaction.interactionId,
        });
        addInteractionToList(interaction);
        setSelectedInteractionId(interaction.interactionId);
      },
    );

    // Auto-accept was attempted but failed. Refresh so consumers re-query
    // canAccept() (now true again) and tell the agent to accept manually.
    const autoAcceptFailedId = user.subscribe(
      UserEventType.INTERACTION_AUTO_ACCEPT_FAILED,
      (event: InteractionAutoAcceptFailedEvent) => {
        const { interaction } = event.payload;
        logger.warn('Interaction auto accept failed', {
          interactionId: interaction.interactionId,
        });
        refreshInteractionsList();
        addNotification({
          id: `${NotificationNames.AUTO_ACCEPT_FAILED}:${interaction.interactionId}`,
          level: 'warning',
          title: strings.notifications.events.autoAcceptFailedTitle,
          description: strings.notifications.events.autoAcceptFailedDescription,
          autoDismissMs: 6000,
        });
      },
    );

    const cxLoggedInId = user.subscribe(UserEventType.USER_CX_LOGGED_IN, () =>
      setIsUserLoggedIn(true),
    );
    const cxLoggedOutId = user.subscribe(UserEventType.USER_CX_LOGGED_OUT, () =>
      setIsUserLoggedIn(false),
    );

    return () => {
      safeUnsubscribeUser(user, UserEventType.INTERACTION_RECEIVED, receivedId);
      safeUnsubscribeUser(user, UserEventType.INTERACTION_CREATED, createdId);
      safeUnsubscribeUser(user, UserEventType.INTERACTION_VIEWING_STARTED, viewingId);
      safeUnsubscribeUser(user, UserEventType.INTERACTION_AUTO_ACCEPT_FAILED, autoAcceptFailedId);
      safeUnsubscribeUser(user, UserEventType.USER_CX_LOGGED_IN, cxLoggedInId);
      safeUnsubscribeUser(user, UserEventType.USER_CX_LOGGED_OUT, cxLoggedOutId);
    };
  }, [user, addInteractionToList, refreshInteractionsList, addNotification]);

  const contextValue = useMemo<InteractionsContextType>(
    () => ({
      user,
      interactions,
      selectedInteractionId,
      isUserLoggedIn,
      setInteractions,
      setSelectedInteractionId,
    }),
    [user, interactions, selectedInteractionId, isUserLoggedIn],
  );

  return (
    <InteractionsContext.Provider value={contextValue}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AppHeader
          user={user}
          status={currentStatus as ReasonCode | null}
          isLoggedInToCx={isUserLoggedIn}
          onSignOut={onSignOut}
        />
        <View style={styles.content}>
          <RootTabs interactionCount={interactions.length} />
        </View>
        <NotificationCenter />
      </SafeAreaView>
    </InteractionsContext.Provider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
  },
});
