import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import type { Interaction, Message } from '@/sdk';
import { strings } from '@/locales/en';
import { colors, fontSize, radius, spacing } from '@/theme';

import { AgentNotesPanel } from './AgentNotesPanel';
import { CallControlsBar } from './CallControlsBar';
import { ClassificationPanel } from './ClassificationPanel';
import { CustomerDetailsPanel } from './CustomerDetailsPanel';
import { MessagePanel } from './MessagePanel';
import { TransferPanel } from './TransferPanel';

type DetailTab = 'details' | 'messages' | 'transfers';

interface InteractionDetailProps {
  interaction: Interaction;
  messages: Message[];
  currentUserId: string;
  showTransferTab: boolean;
  onBack: () => void;
  onSendMessage: (text: string) => void;
  onHold: (interaction: Interaction) => void | Promise<void>;
  onMute: (interaction: Interaction) => void | Promise<void>;
  onTransfer: (interaction: Interaction) => void;
  onEndCall: (interaction: Interaction) => void | Promise<void>;
  onClosedResolved: (interaction: Interaction) => void | Promise<void>;
  onClosedUnresolved: (interaction: Interaction) => void | Promise<void>;
  onWrapUp: (interaction: Interaction) => void | Promise<void>;
  onExtendWrapUp: (interaction: Interaction) => void | Promise<void>;
  onTransferClose: () => void;
}

/**
 * InteractionDetail — everything about one interaction.
 *
 * demo-app spreads this across a centre column and a right panel; a phone has room
 * for neither, so the same surfaces become tabs under a shared control bar:
 *   Details   -> customer record, classification, notes
 *   Messages  -> message feed + composer
 *   Transfers -> appears only while a transfer is requested or in progress
 *
 * The Transfers tab auto-selects when it becomes available and falls back to
 * Messages when it goes away, preserving demo-app's behaviour.
 */
export function InteractionDetail({
  interaction,
  messages,
  currentUserId,
  showTransferTab,
  onBack,
  onSendMessage,
  onHold,
  onMute,
  onTransfer,
  onEndCall,
  onClosedResolved,
  onClosedUnresolved,
  onWrapUp,
  onExtendWrapUp,
  onTransferClose,
}: InteractionDetailProps) {
  const [tab, setTab] = useState<DetailTab>('details');

  // Follow transfer availability the way the web right-panel does.
  const activeTab: DetailTab = showTransferTab ? 'transfers' : tab === 'transfers' ? 'messages' : tab;

  const tabs: Array<{ key: DetailTab; label: string }> = [
    { key: 'details', label: 'Details' },
    { key: 'messages', label: strings.interactions.messages.tabLabel },
    ...(showTransferTab
      ? [{ key: 'transfers' as DetailTab, label: strings.interactions.messages.transfersTabLabel }]
      : []),
  ];

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back to interactions"
        style={styles.backRow}
      >
        <ChevronLeft size={18} color={colors.blue600} />
        <Text style={styles.backText}>{strings.interactions.myInteractions}</Text>
      </Pressable>

      <View style={styles.controlsWrapper}>
        <CallControlsBar
          interaction={interaction}
          onHold={onHold}
          onMute={onMute}
          onTransfer={onTransfer}
          onEndCall={onEndCall}
          onClosedResolved={onClosedResolved}
          onClosedUnresolved={onClosedUnresolved}
          onWrapUp={onWrapUp}
          onExtendWrapUp={onExtendWrapUp}
        />
      </View>

      <View style={styles.tabStrip} accessibilityRole="tablist">
        {tabs.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setTab(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === item.key }}
            style={[styles.tab, activeTab === item.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === item.key && styles.tabTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.body}>
        {activeTab === 'details' && (
          <ScrollView
            contentContainerStyle={styles.detailsContent}
            keyboardShouldPersistTaps="handled"
          >
            <CustomerDetailsPanel interaction={interaction} />
            <ClassificationPanel interaction={interaction} />
            <AgentNotesPanel interaction={interaction} />
          </ScrollView>
        )}

        {activeTab === 'messages' && (
          <MessagePanel
            interaction={interaction}
            messages={messages}
            currentUserId={currentUserId}
            onSendMessage={onSendMessage}
          />
        )}

        {activeTab === 'transfers' && (
          <TransferPanel interaction={interaction} onClose={onTransferClose} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.blue600,
  },
  controlsWrapper: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  tabStrip: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    padding: spacing.xs,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.white,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray500,
  },
  tabTextActive: {
    color: colors.gray900,
  },
  body: {
    flex: 1,
    marginTop: spacing.md,
  },
  detailsContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
});
