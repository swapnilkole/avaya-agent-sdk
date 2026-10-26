import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';

import { colors, fontSize, radius, shadow, spacing } from '@/theme';

export interface SelectOption {
  value: string;
  label: string;
  /** Optional secondary line, used for reason-code type hints. */
  description?: string;
}

interface SelectProps {
  label?: string;
  value: string | undefined;
  options: SelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  emptyMessage?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Select — trigger plus bottom-sheet option list.
 *
 * Replaces demo-app's Radix Select. A sheet is used instead of an inline dropdown
 * because it is the platform-correct pattern on phones and avoids the overlay
 * clipping problems a floating list hits inside scroll containers.
 */
export function Select({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  emptyMessage,
  style,
  accessibilityLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const isEmpty = options.length === 0;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        onPress={disabled || isEmpty ? undefined : () => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
        accessibilityState={{ disabled: disabled || isEmpty, expanded: open }}
        style={[styles.trigger, (disabled || isEmpty) && styles.triggerDisabled]}
      >
        <Text
          style={[styles.triggerText, !selected && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {isEmpty ? emptyMessage ?? placeholder : selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={16} color={colors.gray500} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.sheetHandle} />
            {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    onPress={() => handleSelect(item.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.option,
                      pressed && styles.optionPressed,
                      isSelected && styles.optionSelected,
                    ]}
                  >
                    <View style={styles.optionText}>
                      <Text style={styles.optionLabel}>{item.label}</Text>
                      {item.description ? (
                        <Text style={styles.optionDescription}>{item.description}</Text>
                      ) : null}
                    </View>
                    {isSelected && <Check size={18} color={colors.blue600} />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: spacing.sm,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 42,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  triggerDisabled: {
    backgroundColor: colors.gray50,
    opacity: 0.7,
  },
  triggerText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.gray900,
  },
  triggerPlaceholder: {
    color: colors.gray400,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
    ...shadow.lg,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.gray300,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.gray900,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  optionPressed: {
    backgroundColor: colors.gray100,
  },
  optionSelected: {
    backgroundColor: colors.blue50,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: fontSize.base,
    color: colors.gray900,
  },
  optionDescription: {
    fontSize: fontSize.xs,
    color: colors.gray500,
    marginTop: 2,
  },
});
