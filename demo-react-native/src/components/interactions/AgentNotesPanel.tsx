import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { InteractionEventType, type Interaction } from '@/sdk';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { strings } from '@/locales/en';
import { spacing } from '@/theme';
import { createLogger, getErrorDetails } from '@/utils/logger';

const logger = createLogger('AgentNotesPanel');

interface AgentNotesPanelProps {
  interaction: Interaction;
}

/**
 * AgentNotesPanel — free-text notes attached to the interaction.
 *
 * Saves explicitly rather than on every keystroke; a NOTES_UPDATED subscription
 * keeps the field in step when another participant edits the same interaction.
 */
export function AgentNotesPanel({ interaction }: AgentNotesPanelProps) {
  const { addNotification } = useNotifications();
  const [notes, setNotes] = useState(interaction.notes ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(interaction.notes ?? '');

    const handlerId = interaction.subscribe(
      InteractionEventType.INTERACTION_NOTES_UPDATED,
      () => setNotes(interaction.notes ?? ''),
    );

    return () => {
      interaction.unsubscribe(InteractionEventType.INTERACTION_NOTES_UPDATED, handlerId);
    };
  }, [interaction]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await interaction.setNotes(notes);
      addNotification({
        id: `notes-saved-${interaction.interactionId}`,
        level: 'success',
        title: strings.interactions.notes.saveSuccess,
      });
    } catch (error) {
      logger.error('Notes save failed', {
        interactionId: interaction.interactionId,
        ...getErrorDetails(error),
      });
      addNotification({
        id: `notes-save-failed-${Date.now()}`,
        level: 'error',
        title: strings.interactions.notes.saveError,
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={strings.interactions.notes.title}>
      <TextField
        value={notes}
        onChangeText={setNotes}
        placeholder={strings.interactions.notes.placeholder}
        editable={interaction.canSetNotes()}
        multiline
        autoCapitalize="sentences"
        accessibilityLabel={strings.interactions.notes.title}
      />

      <View style={styles.actions}>
        <Button
          size="sm"
          onPress={handleSave}
          loading={saving}
          disabled={!interaction.canSetNotes()}
        >
          {strings.interactions.notes.save}
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
});
