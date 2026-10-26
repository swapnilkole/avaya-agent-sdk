import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  ChatMessageVisibility,
  InteractionEventType,
  InteractionStatus,
  MediaDevicePermissionState,
  MessageAuthorType,
  MessageType,
  ResolutionStatus,
  UserEventType,
  type Interaction,
  type Message,
  type User,
} from '@/sdk';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { strings } from '@/locales/en';
import { colors } from '@/theme';
import { createLogger, getErrorDetails } from '@/utils/logger';
import { safeUnsubscribeUser } from '@/utils/safe-unsubscribe';

import { InteractionDetail } from './InteractionDetail';
import { InteractionListPanel } from './InteractionListPanel';

const logger = createLogger('InteractionsPage');

/** Events that mutate interaction state the UI renders, so each one forces a re-read. */
const INTERACTION_REFRESH_EVENTS: InteractionEventType[] = [
  InteractionEventType.INTERACTION_ACCEPTED,
  InteractionEventType.INTERACTION_CALL_ESTABLISHED,
  InteractionEventType.INTERACTION_CALL_HELD,
  InteractionEventType.INTERACTION_CALL_RESUMED,
  InteractionEventType.INTERACTION_CALL_MUTED,
  InteractionEventType.INTERACTION_CALL_UNMUTED,
  InteractionEventType.INTERACTION_CALL_DISCONNECTED,
  InteractionEventType.INTERACTION_WRAP_UP,
  InteractionEventType.INTERACTION_WRAP_UP_EXTENDED,
  InteractionEventType.INTERACTION_TRANSFER,
  InteractionEventType.INTERACTION_TRANSFER_ANSWER,
  InteractionEventType.INTERACTION_TRANSFER_CANCEL,
  InteractionEventType.INTERACTION_TRANSFER_COMPLETE,
  InteractionEventType.INTERACTION_TRANSFER_FAILED,
  InteractionEventType.INTERACTION_OWNERSHIP_CHANGED,
  InteractionEventType.INTERACTION_CUSTOMER_INFO_UPDATED,
  InteractionEventType.INTERACTION_VIEWER_ADDED,
  InteractionEventType.INTERACTION_VIEWER_REMOVED,
];

interface InteractionsPageProps {
  user: User;
  interactions: Interaction[];
  selectedInteractionId: string | undefined;
  isUserLoggedIn: boolean;
  setInteractions: React.Dispatch<React.SetStateAction<Interaction[]>>;
  setSelectedInteractionId: React.Dispatch<React.SetStateAction<string | undefined>>;
}

/**
 * InteractionsPage — the agent's interaction workspace.
 *
 * Owns per-interaction event subscriptions and the message feed, and renders either
 * the list or the selected interaction's detail view. Interaction state itself lives
 * in MainLayout so it survives tab navigation, mirroring how demo-app hoists it above
 * the router outlet.
 */
export function InteractionsPage({
  user,
  interactions,
  selectedInteractionId,
  isUserLoggedIn,
  setInteractions,
  setSelectedInteractionId,
}: InteractionsPageProps) {
  const { addNotification } = useNotifications();

  // Cleanup functions for each interaction's event subscriptions, keyed by id.
  const cleanupFunctionsRef = useRef<Map<string, () => void>>(new Map());

  const [showTransferPanel, setShowTransferPanel] = useState(false);
  const [messagesByInteractionId, setMessagesByInteractionId] = useState<Record<string, Message[]>>({});
  const [, setInteractionTick] = useState(0);

  const selectedInteraction = interactions.find(
    (item) => item.interactionId === selectedInteractionId,
  );

  // Interaction objects are mutable and mutate in place, so a tick is what makes
  // React re-read their getters after an SDK event.
  const triggerRerender = useCallback(() => setInteractionTick((tick) => tick + 1), []);

  const [isAudioPermissionDenied, setIsAudioPermissionDenied] = useState(
    user.getAudioDevicePermissionState() === MediaDevicePermissionState.DENIED,
  );

  // Reset the transfer panel whenever the selection changes. Without this it stays
  // open after an attended transfer completes and re-opens on the next interaction.
  useEffect(() => {
    setShowTransferPanel(false);
  }, [selectedInteractionId]);

  useEffect(() => {
    const grantedHandlerId = user.subscribe(
      UserEventType.AUDIO_DEVICE_PERMISSION_GRANTED,
      () => setIsAudioPermissionDenied(false),
    );
    const deniedHandlerId = user.subscribe(
      UserEventType.AUDIO_DEVICE_PERMISSION_DENIED,
      () => setIsAudioPermissionDenied(true),
    );

    setIsAudioPermissionDenied(
      user.getAudioDevicePermissionState() === MediaDevicePermissionState.DENIED,
    );

    return () => {
      safeUnsubscribeUser(user, UserEventType.AUDIO_DEVICE_PERMISSION_GRANTED, grantedHandlerId);
      safeUnsubscribeUser(user, UserEventType.AUDIO_DEVICE_PERMISSION_DENIED, deniedHandlerId);
    };
  }, [user]);

  const appendMessage = useCallback((interactionId: string, message: Message) => {
    setMessagesByInteractionId((prev) => {
      const existing = prev[interactionId] ?? [];
      // Reconcile the optimistic entry with the server's echo instead of double-posting.
      const withoutOptimistic = existing.filter(
        (item) => !(item.pending && item.body.text.content === message.body.text.content),
      );
      if (withoutOptimistic.some((item) => item.messageId === message.messageId)) {
        return prev;
      }
      return { ...prev, [interactionId]: [...withoutOptimistic, message] };
    });
  }, []);

  /**
   * Wires one interaction's event subscriptions and records a cleanup closure.
   * Walking the list (rather than subscribing from arrival handlers) means the
   * wiring catches up for interactions that arrived while this page was elsewhere.
   */
  const subscribeToInteractionEvents = useCallback(
    (interaction: Interaction) => {
      const handlerIds = INTERACTION_REFRESH_EVENTS.map((event) => ({
        event,
        id: interaction.subscribe(event, triggerRerender),
      }));

      const messageEvents = [
        InteractionEventType.INTERACTION_MESSAGE_RECEIVED,
        InteractionEventType.INTERACTION_MESSAGE_SENT,
      ];
      const messageHandlerIds = messageEvents.map((event) => ({
        event,
        id: interaction.subscribe(event, (payload: { payload?: { message?: Message } }) => {
          const message = payload?.payload?.message;
          if (message) appendMessage(interaction.interactionId, message);
        }),
      }));

      // Completion removes the interaction from the list and drops its feed.
      const completedId = interaction.subscribe(
        InteractionEventType.INTERACTION_COMPLETED,
        () => {
          logger.info('Interaction completed', { interactionId: interaction.interactionId });
          setInteractions((prev) =>
            prev.filter((item) => item.interactionId !== interaction.interactionId),
          );
          setSelectedInteractionId((current) =>
            current === interaction.interactionId ? undefined : current,
          );
          setMessagesByInteractionId((prev) => {
            const next = { ...prev };
            delete next[interaction.interactionId];
            return next;
          });
        },
      );

      cleanupFunctionsRef.current.set(interaction.interactionId, () => {
        [...handlerIds, ...messageHandlerIds].forEach(({ event, id }) => {
          try {
            interaction.unsubscribe(event, id);
          } catch {
            // The interaction may already be torn down; teardown must not throw.
          }
        });
        try {
          interaction.unsubscribe(InteractionEventType.INTERACTION_COMPLETED, completedId);
        } catch {
          // As above.
        }
      });
    },
    [appendMessage, setInteractions, setSelectedInteractionId, triggerRerender],
  );

  // Subscribe to any interaction in the list that isn't wired up yet.
  useEffect(() => {
    interactions.forEach((interaction) => {
      if (!cleanupFunctionsRef.current.has(interaction.interactionId)) {
        subscribeToInteractionEvents(interaction);
      }
    });
  }, [interactions, subscribeToInteractionEvents]);

  // Tear every subscription down on unmount.
  useEffect(() => {
    const cleanups = cleanupFunctionsRef.current;
    return () => {
      cleanups.forEach((cleanup) => cleanup());
      cleanups.clear();
    };
  }, []);

  /* ----- action handlers --------------------------------------------------- */

  const handleSelectInteraction = useCallback(
    (interaction: Interaction) => {
      // A still-ringing interaction has no detail view to show.
      if (interaction.currentStatus === InteractionStatus.PENDING) {
        logger.debug('Interaction selection skipped', {
          interactionId: interaction.interactionId,
          currentStatus: interaction.currentStatus,
        });
        return;
      }
      logger.info('Interaction selected', { interactionId: interaction.interactionId });
      setSelectedInteractionId(interaction.interactionId);
    },
    [setSelectedInteractionId],
  );

  const handleAcceptIncoming = useCallback(
    async (interaction: Interaction) => {
      logger.info('Interaction accept requested', { interactionId: interaction.interactionId });
      await interaction.accept();
      triggerRerender();
      setSelectedInteractionId(interaction.interactionId);
    },
    [setSelectedInteractionId, triggerRerender],
  );

  const handleRejectIncoming = useCallback(async (interaction: Interaction) => {
    logger.info('Interaction reject requested', { interactionId: interaction.interactionId });
    await interaction.reject();
  }, []);

  const handleHold = useCallback(async (interaction: Interaction) => {
    if (interaction.isHold) {
      await interaction.resumeCall();
    } else {
      await interaction.holdCall();
    }
  }, []);

  const handleMute = useCallback(async (interaction: Interaction) => {
    if (interaction.isMuted) {
      await interaction.unmute();
    } else {
      await interaction.mute();
    }
  }, []);

  const handleTransfer = useCallback(() => setShowTransferPanel((prev) => !prev), []);

  const handleEndCall = useCallback(async (interaction: Interaction) => {
    logger.info('Interaction disconnect requested', { interactionId: interaction.interactionId });
    await interaction.disconnectCall();
  }, []);

  const handleClosedResolved = useCallback(async (interaction: Interaction) => {
    await interaction.close(ResolutionStatus.RESOLVED);
  }, []);

  const handleClosedUnresolved = useCallback(async (interaction: Interaction) => {
    await interaction.close(ResolutionStatus.UNRESOLVED);
  }, []);

  const handleWrapUp = useCallback(async (interaction: Interaction) => {
    await interaction.complete();
  }, []);

  const handleExtendWrapUp = useCallback(async (interaction: Interaction) => {
    await interaction.extendWrapUp();
  }, []);

  /**
   * Sends a message with an optimistic feed entry so the composer clears instantly.
   * The pending entry is reconciled when the server echoes the message back.
   */
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!selectedInteraction) return;
      const interactionId = selectedInteraction.interactionId;

      const optimistic: Message = {
        messageId: `optimistic-${Date.now()}`,
        type: MessageType.CHAT,
        author: { type: MessageAuthorType.AGENT, details: { userId: user.userId, displayName: 'You' } },
        body: { text: { content: text } },
        createdAt: new Date(),
        isPrivate: true,
        pending: true,
      };

      setMessagesByInteractionId((prev) => ({
        ...prev,
        [interactionId]: [...(prev[interactionId] ?? []), optimistic],
      }));

      try {
        await selectedInteraction.sendMessage({
          content: text,
          visibility: ChatMessageVisibility.PRIVATE,
        });
      } catch (error) {
        logger.error('Message send failed', { interactionId, ...getErrorDetails(error) });
        setMessagesByInteractionId((prev) => ({
          ...prev,
          [interactionId]: (prev[interactionId] ?? []).filter(
            (item) => item.messageId !== optimistic.messageId,
          ),
        }));
        addNotification({
          id: `message-send-failed-${Date.now()}`,
          level: 'error',
          title: strings.interactions.messages.sendErrorTitle,
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [addNotification, selectedInteraction, user.userId],
  );

  /* ----- render ------------------------------------------------------------ */

  if (selectedInteraction) {
    const transfersTabAvailable =
      showTransferPanel || selectedInteraction.currentStatus === InteractionStatus.ATTENDED_TRANSFER;

    return (
      <View style={styles.container}>
        <InteractionDetail
          interaction={selectedInteraction}
          messages={messagesByInteractionId[selectedInteraction.interactionId] ?? []}
          currentUserId={user.userId}
          showTransferTab={transfersTabAvailable}
          onBack={() => setSelectedInteractionId(undefined)}
          onSendMessage={handleSendMessage}
          onHold={handleHold}
          onMute={handleMute}
          onTransfer={handleTransfer}
          onEndCall={handleEndCall}
          onClosedResolved={handleClosedResolved}
          onClosedUnresolved={handleClosedUnresolved}
          onWrapUp={handleWrapUp}
          onExtendWrapUp={handleExtendWrapUp}
          onTransferClose={() => setShowTransferPanel(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <InteractionListPanel
        user={user}
        interactions={interactions}
        disableAcceptIncoming={isAudioPermissionDenied}
        selectedInteractionId={selectedInteractionId}
        onSelectInteraction={handleSelectInteraction}
        onAcceptIncoming={handleAcceptIncoming}
        onRejectIncoming={handleRejectIncoming}
        isUserLoggedIn={isUserLoggedIn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
});
