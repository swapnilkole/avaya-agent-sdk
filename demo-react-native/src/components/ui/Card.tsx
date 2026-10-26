import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fontSize, radius, shadow, spacing } from '@/theme';

interface CardProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Optional heading rendered in the card's uppercase section-title style. */
  title?: string;
}

/** Card — white rounded surface used across panels, matching demo-app's shadow-sm cards. */
export function Card({ children, style, title }: CardProps) {
  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.sm,
  },
  title: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.md,
  },
});
