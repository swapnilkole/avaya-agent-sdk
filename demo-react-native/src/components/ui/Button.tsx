import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';

export type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'outline'
  | 'ghost';

export type ButtonSize = 'sm' | 'default' | 'icon';

interface ButtonProps {
  children?: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Mirrors aria-pressed on the web app's toggle buttons. */
  selected?: boolean;
}

const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: { color: string } }> = {
  default: {
    container: { backgroundColor: colors.blue600 },
    text: { color: colors.white },
  },
  secondary: {
    container: { backgroundColor: colors.gray100 },
    text: { color: colors.gray800 },
  },
  destructive: {
    container: { backgroundColor: colors.red600 },
    text: { color: colors.white },
  },
  success: {
    container: { backgroundColor: colors.green600 },
    text: { color: colors.white },
  },
  outline: {
    container: {
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.gray300,
    },
    text: { color: colors.gray900 },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.gray700 },
  },
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: { height: 34, paddingHorizontal: spacing.md },
  default: { height: 42, paddingHorizontal: spacing.lg },
  icon: { height: 44, width: 44, paddingHorizontal: 0 },
};

/**
 * Button — the React Native counterpart of demo-app's shadcn Button.
 *
 * Variant and size names are kept identical to the web component so the two
 * codebases stay diff-able.
 */
export function Button({
  children,
  onPress,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
  selected,
}: ButtonProps) {
  const isInactive = disabled || loading;
  const palette = variantStyles[variant];

  return (
    <Pressable
      onPress={isInactive ? undefined : onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isInactive, selected }}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        palette.container,
        pressed && !isInactive && styles.pressed,
        isInactive && styles.disabled,
        style,
      ]}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={palette.text.color}
          style={children ? styles.spinnerWithLabel : undefined}
        />
      )}
      {typeof children === 'string' ? (
        <Text style={[styles.label, palette.text]} numberOfLines={1}>
          {children}
        </Text>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.5,
  },
  spinnerWithLabel: {
    marginRight: spacing.xs,
  },
});
