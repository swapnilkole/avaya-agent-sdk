import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { colors, fontSize, radius } from '@/theme';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'accent'
  | 'destructive'
  | 'available'
  | 'busy'
  | 'away'
  | 'offline';

interface BadgeProps {
  children?: ReactNode;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

const variants: Record<BadgeVariant, { bg: string; fg: string }> = {
  default: { bg: colors.blue600, fg: colors.white },
  secondary: { bg: colors.gray100, fg: colors.gray800 },
  accent: { bg: colors.amber100, fg: colors.amber800 },
  destructive: { bg: colors.red600, fg: colors.white },
  available: { bg: colors.statusAvailable, fg: colors.white },
  busy: { bg: colors.statusBusy, fg: colors.white },
  away: { bg: colors.statusAway, fg: colors.white },
  offline: { bg: colors.statusOffline, fg: colors.white },
};

/** Badge — counterpart of demo-app's shadcn Badge, same variant vocabulary. */
export function Badge({
  children,
  variant = 'default',
  style,
  textStyle,
  accessibilityLabel,
}: BadgeProps) {
  const palette = variants[variant];

  return (
    <View
      style={[styles.container, { backgroundColor: palette.bg }, style]}
      accessibilityLabel={accessibilityLabel}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.text, { color: palette.fg }, textStyle]} numberOfLines={1}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 4,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
