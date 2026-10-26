import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { InteractionEventType, type ClassificationCode, type Interaction } from '@/sdk';
import { Card } from '@/components/ui/Card';
import { Select, type SelectOption } from '@/components/ui/Select';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { strings } from '@/locales/en';
import { colors, fontSize, spacing } from '@/theme';
import { createLogger, getErrorDetails } from '@/utils/logger';

const logger = createLogger('ClassificationPanel');

interface ClassificationPanelProps {
  interaction: Interaction;
}

const toOptions = (codes: ClassificationCode[]): SelectOption[] =>
  codes.map((code) => ({ value: code.id, label: code.name }));

/**
 * ClassificationPanel — interaction type and end-result pickers.
 *
 * Results depend on the selected type, so choosing a type reloads the result list
 * and clears any stale result, matching the platform's own cascade.
 */
export function ClassificationPanel({ interaction }: ClassificationPanelProps) {
  const { addNotification } = useNotifications();
  const [types, setTypes] = useState<ClassificationCode[]>([]);
  const [results, setResults] = useState<ClassificationCode[]>([]);
  const [selectedType, setSelectedType] = useState<string | undefined>(
    interaction.classificationType?.id,
  );
  const [selectedResult, setSelectedResult] = useState<string | undefined>(
    interaction.classificationResult?.id,
  );

  const loadResults = useCallback(
    async (typeId: string) => {
      try {
        setResults(await interaction.getClassificationResults(typeId));
      } catch (error) {
        logger.warn('Classification results load failed', getErrorDetails(error));
        setResults([]);
      }
    },
    [interaction],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const loaded = await interaction.getClassificationTypes();
        if (!cancelled) setTypes(loaded);
      } catch (error) {
        logger.warn('Classification types load failed', getErrorDetails(error));
      }
    };

    void load();
    if (interaction.classificationType?.id) {
      void loadResults(interaction.classificationType.id);
    }

    // Keep local selection in step with server-side classification changes.
    const handlerId = interaction.subscribe(
      InteractionEventType.INTERACTION_CLASSIFICATION_UPDATED,
      () => {
        setSelectedType(interaction.classificationType?.id);
        setSelectedResult(interaction.classificationResult?.id);
      },
    );

    return () => {
      cancelled = true;
      interaction.unsubscribe(InteractionEventType.INTERACTION_CLASSIFICATION_UPDATED, handlerId);
    };
  }, [interaction, loadResults]);

  const handleTypeChange = async (typeId: string) => {
    const code = types.find((type) => type.id === typeId);
    if (!code) return;

    setSelectedType(typeId);
    setSelectedResult(undefined);
    setResults([]);

    try {
      await interaction.setClassificationType(code);
      await loadResults(typeId);
    } catch (error) {
      logger.error('Classification type save failed', getErrorDetails(error));
      addNotification({
        id: `classification-type-failed-${Date.now()}`,
        level: 'error',
        title: strings.interactions.classification.saveTypeError,
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleResultChange = async (resultId: string) => {
    const code = results.find((result) => result.id === resultId);
    if (!code) return;

    setSelectedResult(resultId);

    try {
      await interaction.setClassificationResult(code);
    } catch (error) {
      logger.error('Classification result save failed', getErrorDetails(error));
      addNotification({
        id: `classification-result-failed-${Date.now()}`,
        level: 'error',
        title: strings.interactions.classification.saveResultError,
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  if (types.length === 0) {
    return (
      <Card title={strings.interactions.classification.title}>
        <Text style={styles.empty}>{strings.interactions.classification.noOptions}</Text>
      </Card>
    );
  }

  return (
    <Card title={strings.interactions.classification.title}>
      <Select
        label={strings.interactions.classification.interactionType}
        value={selectedType}
        options={toOptions(types)}
        placeholder={strings.interactions.classification.selectType}
        onChange={handleTypeChange}
        style={styles.field}
      />

      <Select
        label={strings.interactions.classification.endResult}
        value={selectedResult}
        options={toOptions(results)}
        placeholder={strings.interactions.classification.selectResult}
        onChange={handleResultChange}
        disabled={!selectedType}
        emptyMessage={strings.interactions.classification.selectType}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.lg,
  },
  empty: {
    fontSize: fontSize.sm,
    color: colors.gray500,
  },
});
