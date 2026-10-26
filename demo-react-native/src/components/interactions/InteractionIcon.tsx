import { StyleSheet, View } from 'react-native';
import { MessageSquare, Phone } from 'lucide-react-native';

import { InteractionCommType } from '@/sdk';
import { colors, radius } from '@/theme';

interface InteractionIconProps {
  communicationType: InteractionCommType;
  size?: number;
}

const channelConfig: Record<string, { Icon: typeof Phone; bgColor: string }> = {
  phone: { Icon: Phone, bgColor: colors.blue600 },
  messaging: { Icon: MessageSquare, bgColor: colors.purple600 },
};

/** InteractionIcon — channel-specific icon bubble used in interaction cards. */
export function InteractionIcon({ communicationType, size = 36 }: InteractionIconProps) {
  const config = channelConfig[String(communicationType)] ?? channelConfig.phone;
  const { Icon } = config;

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, backgroundColor: config.bgColor },
      ]}
    >
      <Icon size={size * 0.45} color={colors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
});
