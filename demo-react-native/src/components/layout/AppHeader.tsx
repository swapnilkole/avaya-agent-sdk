import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ReasonCode, User } from '@/sdk';
import { ProfileChip } from '@/components/UserProfile/ProfileChip';
import { UserProfileSheet } from '@/components/UserProfile/UserProfileSheet';
import { colors, spacing } from '@/theme';

import { AvayaLogo } from './AvayaLogo';
import { WebRtcRegistrationIndicator, WebSocketConnectionIndicator } from './ConnectionIndicators';

interface AppHeaderProps {
  user: User;
  status: ReasonCode | null;
  isLoggedInToCx: boolean;
  onSignOut?: () => void;
}

/**
 * AppHeader — Avaya mark, connection indicators, and the profile chip.
 * Consistent across both tabs, matching demo-app's persistent header.
 */
export function AppHeader({ user, status, isLoggedInToCx, onSignOut }: AppHeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      <View style={styles.header}>
        <AvayaLogo />

        <View style={styles.right}>
          <WebRtcRegistrationIndicator user={user} />
          <WebSocketConnectionIndicator />
          <ProfileChip
            fullName={user.userFullName}
            email={user.email}
            status={status}
            isLoggedInToCx={isLoggedInToCx}
            onPress={() => setIsProfileOpen(true)}
          />
        </View>
      </View>

      <UserProfileSheet
        user={user}
        open={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSignOut={onSignOut}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray300,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
});
