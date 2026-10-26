import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { updateCustomerField, type Interaction } from '@/sdk';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { strings } from '@/locales/en';
import { colors, fontSize, spacing } from '@/theme';
import { createLogger, getErrorDetails } from '@/utils/logger';

const logger = createLogger('CustomerDetailsPanel');

interface CustomerDetailsPanelProps {
  interaction: Interaction;
}

type EditableField = 'name' | 'phone' | 'email' | 'languageCode';

interface FieldConfig {
  key: EditableField;
  label: string;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
}

const FIELDS: FieldConfig[] = [
  { key: 'name', label: strings.interactions.customer.name },
  { key: 'phone', label: strings.interactions.customer.phone, keyboardType: 'phone-pad' },
  { key: 'email', label: strings.interactions.customer.email, keyboardType: 'email-address' },
  {
    key: 'languageCode',
    label: strings.interactions.customer.language,
    placeholder: strings.interactions.customer.languagePlaceholder,
  },
];

/**
 * CustomerDetailsPanel — view and edit the caller's contact record.
 *
 * Reads/writes go through `updateCustomerField`, which routes to the real SDK's
 * customer setters on web, and through the bridge on native.
 */
export function CustomerDetailsPanel({ interaction }: CustomerDetailsPanelProps) {
  const { addNotification } = useNotifications();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: interaction.customer.name ?? '',
    phone: interaction.customer.phone ?? '',
    email: interaction.customer.email ?? '',
    languageCode: interaction.customer.languageCode ?? '',
  });

  // Re-seed the draft whenever the selected interaction changes, so edits never
  // leak from one caller's record onto another's.
  useEffect(() => {
    setIsEditing(false);
    setDraft({
      name: interaction.customer.name ?? '',
      phone: interaction.customer.phone ?? '',
      email: interaction.customer.email ?? '',
      languageCode: interaction.customer.languageCode ?? '',
    });
  }, [interaction.interactionId, interaction.customer]);

  const canEdit = interaction.canSetSubject();

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const field of FIELDS) {
        const next = draft[field.key];
        const current = (interaction.customer[field.key] ?? '') as string;
        if (next !== current) {
          await updateCustomerField(interaction, field.key, next);
        }
      }
      setIsEditing(false);
    } catch (error) {
      logger.error('Customer update failed', {
        interactionId: interaction.interactionId,
        ...getErrorDetails(error),
      });
      addNotification({
        id: `customer-update-failed-${Date.now()}`,
        level: 'error',
        title: strings.interactions.customer.updateFailed('details'),
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={strings.interactions.customer.contactInformation}>
      {isEditing ? (
        <>
          {FIELDS.map((field) => (
            <TextField
              key={field.key}
              label={field.label}
              value={draft[field.key]}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, [field.key]: value }))}
              placeholder={field.placeholder}
              keyboardType={field.keyboardType}
              autoCapitalize={field.key === 'name' ? 'words' : 'none'}
            />
          ))}

          <View style={styles.actions}>
            <Button variant="outline" size="sm" onPress={() => setIsEditing(false)} disabled={saving}>
              {strings.interactions.customer.cancel}
            </Button>
            <Button size="sm" onPress={handleSave} loading={saving}>
              {strings.interactions.customer.save}
            </Button>
          </View>
        </>
      ) : (
        <>
          {FIELDS.map((field) => (
            <View key={field.key} style={styles.readRow}>
              <Text style={styles.readLabel}>{field.label}</Text>
              <Text style={styles.readValue} numberOfLines={1}>
                {draft[field.key] || '--'}
              </Text>
            </View>
          ))}

          <Pressable
            onPress={canEdit ? () => setIsEditing(true) : undefined}
            disabled={!canEdit}
            accessibilityRole="button"
            accessibilityLabel={strings.interactions.customer.edit}
            style={styles.editLink}
          >
            <Text style={[styles.editText, !canEdit && styles.editDisabled]}>
              {strings.interactions.customer.edit}
            </Text>
          </Pressable>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  readRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  readLabel: {
    fontSize: fontSize.xs,
    color: colors.gray500,
  },
  readValue: {
    flexShrink: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray900,
  },
  editLink: {
    marginTop: spacing.md,
  },
  editText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.blue600,
  },
  editDisabled: {
    color: colors.gray400,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
