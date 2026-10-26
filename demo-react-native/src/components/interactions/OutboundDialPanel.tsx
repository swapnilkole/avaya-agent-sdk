import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { QueueType, type Queue, type User } from '@/sdk';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Select, type SelectOption } from '@/components/ui/Select';
import { TextField } from '@/components/ui/TextField';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { strings } from '@/locales/en';
import { colors, fontSize, spacing } from '@/theme';
import { createLogger, getErrorDetails } from '@/utils/logger';

const logger = createLogger('OutboundDialPanel');

interface OutboundDialPanelProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
}

/**
 * OutboundDialPanel — "Create Outbound Interaction" dialog.
 *
 * Only queues the agent is currently logged into can originate a call, matching the
 * platform rule, so the queue list is filtered to those (personal queues excluded).
 */
export function OutboundDialPanel({ user, open, onOpenChange, disabled = false }: OutboundDialPanelProps) {
  const { addNotification } = useNotifications();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [queueId, setQueueId] = useState<string | undefined>(undefined);
  const [customerName, setCustomerName] = useState('');
  const [subject, setSubject] = useState('');
  const [dialing, setDialing] = useState(false);
  const [queues, setQueues] = useState<Queue[]>([]);

  useEffect(() => {
    if (!open) return;
    const available = user
      .getAssignedQueues()
      .filter((queue) => queue.isLoggedIn && queue.queueType !== QueueType.PERSONAL);
    setQueues(available);
    setQueueId((current) => current ?? available[0]?.queueId);
  }, [open, user]);

  const resetForm = () => {
    setPhoneNumber('');
    setCustomerName('');
    setSubject('');
  };

  const handleDial = async () => {
    if (!phoneNumber.trim()) {
      addNotification({
        id: `outbound-missing-number-${Date.now()}`,
        level: 'warning',
        title: strings.interactions.outboundDial.enterNumber,
      });
      return;
    }

    setDialing(true);
    try {
      await user.createOutboundVoiceInteraction({
        phoneNumber: phoneNumber.trim(),
        queueId,
        customer: customerName.trim() ? { name: customerName.trim() } : undefined,
        subject: subject.trim() || undefined,
      });
      logger.info('Outbound interaction created');
      resetForm();
      onOpenChange(false);
    } catch (error) {
      logger.error('Outbound interaction creation failed', getErrorDetails(error));
      addNotification({
        id: `outbound-failed-${Date.now()}`,
        level: 'error',
        title: strings.interactions.outboundDial.title,
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setDialing(false);
    }
  };

  const queueOptions: SelectOption[] = queues.map((queue) => ({
    value: queue.queueId,
    label: queue.queueName,
  }));

  return (
    <Dialog
      open={open}
      title={strings.interactions.outboundDial.title}
      onClose={() => onOpenChange(false)}
      footer={
        <>
          <Button variant="outline" size="sm" onPress={() => onOpenChange(false)} disabled={dialing}>
            {strings.common.cancel}
          </Button>
          <Button size="sm" onPress={handleDial} loading={dialing} disabled={disabled}>
            {dialing ? strings.interactions.outboundDial.dialing : strings.interactions.outboundDial.dial}
          </Button>
        </>
      }
    >
      <TextField
        label={strings.interactions.outboundDial.phoneNumber}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        placeholder="+1 555 000 0000"
        keyboardType="phone-pad"
      />

      <Select
        label={strings.interactions.outboundDial.queue}
        value={queueId}
        options={queueOptions}
        placeholder={strings.interactions.outboundDial.selectQueue}
        emptyMessage={strings.interactions.outboundDial.noQueuesLoggedIn}
        onChange={setQueueId}
        style={styles.field}
      />

      <Text style={styles.sectionLabel}>
        {strings.interactions.outboundDial.optionalSectionLabel}
      </Text>

      <TextField
        label={strings.interactions.outboundDial.customerName}
        value={customerName}
        onChangeText={setCustomerName}
        autoCapitalize="words"
      />

      <TextField
        label={strings.interactions.outboundDial.subject}
        value={subject}
        onChangeText={setSubject}
        autoCapitalize="sentences"
      />

      {disabled && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>{strings.workspace.statusHint}</Text>
        </View>
      )}
    </Dialog>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  warning: {
    padding: spacing.md,
    backgroundColor: colors.amber50,
    borderRadius: 8,
  },
  warningText: {
    fontSize: fontSize.xs,
    color: colors.amber800,
  },
});
