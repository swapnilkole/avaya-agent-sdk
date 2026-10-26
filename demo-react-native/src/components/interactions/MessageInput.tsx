import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Info, Send, VenetianMask } from 'lucide-react-native';

import type { Interaction } from '@/sdk';
import { strings } from '@/locales/en';
import { colors, fontSize, radius, spacing } from '@/theme';

interface MessageInputProps {
  interaction: Interaction;
  /**
   * Submits the trimmed text. The parent owns the optimistic-UI handling and the
   * actual SDK call — the input clears as soon as it fires.
   */
  onSend: (text: string) => void;
}

/**
 * MessageInput — composes and submits chat messages.
 *
 * The input does NOT call the SDK. It bubbles the trimmed text up so the parent can
 * append an optimistic feed entry immediately; errors and confirmations surface
 * through the feed (spinner -> tick) and global notifications, never through input
 * state. Messages are private-only here, matching demo-app's locked privacy toggle.
 */
export function MessageInput({ interaction, onSend }: MessageInputProps) {
  const [text, setText] = useState('');

  const canSend = interaction.canSendMessage();
  const trimmed = text.trim();
  const canSubmit = canSend && trimmed.length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputShell}>
        <View style={styles.banner}>
          <Info size={13} color={colors.purple700} />
          <Text style={styles.bannerText}>{strings.interactions.messages.privateBanner}</Text>
        </View>

        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          editable={canSend}
          returnKeyType="send"
          placeholder={
            canSend
              ? strings.interactions.messages.inputPlaceholder
              : strings.interactions.messages.disabledPlaceholder
          }
          placeholderTextColor={colors.gray400}
          accessibilityLabel={strings.interactions.messages.inputPlaceholder}
          style={[styles.input, !canSend && styles.inputDisabled]}
        />
      </View>

      <View style={styles.actionRow}>
        <View style={styles.actionGroup}>
          <View
            style={styles.privacyButton}
            accessibilityLabel={strings.interactions.messages.privateToggle}
          >
            <VenetianMask size={16} color={colors.purple700} />
          </View>
          <View style={styles.divider} />
          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel={strings.interactions.messages.send}
            style={({ pressed }) => [
              styles.sendButton,
              pressed && canSubmit && styles.sendPressed,
              !canSubmit && styles.sendDisabled,
            ]}
          >
            <Send size={16} color={colors.purple700} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.sm,
  },
  inputShell: {
    borderWidth: 1,
    borderColor: colors.purpleBrand,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.purple50,
    borderBottomWidth: 1,
    borderBottomColor: colors.purpleBrand,
  },
  bannerText: {
    fontSize: fontSize.xs,
    fontStyle: 'italic',
    color: colors.purple700,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.sm,
    color: colors.gray900,
    backgroundColor: colors.white,
  },
  inputDisabled: {
    backgroundColor: colors.gray50,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: colors.purpleBrand,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  privacyButton: {
    width: 36,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple100,
  },
  divider: {
    width: 1,
    backgroundColor: colors.purpleBrand,
  },
  sendButton: {
    width: 36,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple50,
  },
  sendPressed: {
    backgroundColor: colors.purple100,
  },
  sendDisabled: {
    opacity: 0.5,
  },
});
