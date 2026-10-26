import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fontSize, radius } from '@/theme';
import { getUserInitials } from '@/utils/userUtils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

interface AvatarProps {
  fullName: string | undefined;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
  /** Overrides the default Avaya navy, used for message-author chips. */
  backgroundColor?: string;
}

const sizes: Record<AvatarSize, { box: number; text: number }> = {
  xs: { box: 20, text: fontSize.xxs },
  sm: { box: 32, text: fontSize.xs },
  md: { box: 38, text: fontSize.sm },
  lg: { box: 48, text: fontSize.base },
};

/** Avatar — initials bubble, counterpart of demo-app's shadcn Avatar fallback. */
export function Avatar({ fullName, size = 'md', style, backgroundColor }: AvatarProps) {
  const dimensions = sizes[size];
  const initials = getUserInitials(fullName);

  return (
    <View
      style={[
        styles.container,
        {
          width: dimensions.box,
          height: dimensions.box,
          borderRadius: radius.full,
          backgroundColor: backgroundColor ?? colors.avayaNavy,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize: dimensions.text }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.white,
    fontWeight: '700',
  },
});
