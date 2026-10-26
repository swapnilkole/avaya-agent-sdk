import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { CheckCircle2, LayoutList, XCircle } from 'lucide-react-native';

import { colors, fontSize, radius, shadow, spacing } from '@/theme';

type CardVariant = 'default' | 'success' | 'danger';

interface QueueStatsCardProps {
  label: string;
  value: number;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
}

const variantStyles: Record<CardVariant, { bg: string; border: string; fg: string }> = {
  default: { bg: colors.white, border: colors.gray200, fg: colors.gray900 },
  success: { bg: colors.green50, border: colors.green600, fg: colors.green600 },
  danger: { bg: colors.red50, border: colors.red500, fg: colors.red500 },
};

const variantIcons: Record<CardVariant, typeof LayoutList> = {
  default: LayoutList,
  success: CheckCircle2,
  danger: XCircle,
};

/**
 * QueueStatsCard — a single queue statistic.
 *
 * Each variant carries an icon as well as a colour so the state is distinguishable
 * without relying on colour alone (WCAG 2.2 AA), matching demo-app.
 */
export function QueueStatsCard({ label, value, variant = 'default', style }: QueueStatsCardProps) {
  const palette = variantStyles[variant];
  const Icon = variantIcons[variant];

  return (
    <View
      style={[styles.card, { backgroundColor: palette.bg, borderColor: palette.border }, style]}
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={styles.header}>
        <Icon size={16} color={palette.fg} />
        <Text style={[styles.label, { color: palette.fg }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.value, { color: palette.fg }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 100,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.xs,
    flexShrink: 1,
  },
  value: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
});
