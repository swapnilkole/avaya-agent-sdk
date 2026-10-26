import { NavigationContainer } from '@react-navigation/native';

import type { User } from '@/sdk';
import { MainLayout } from '@/components/layout/MainLayout';

interface AgentProps {
  user: User;
  onSignOut?: () => void;
}

/**
 * Agent — the authenticated shell.
 *
 * Counterpart of demo-app's Agent component: it wraps the authenticated surface in
 * the navigation container the way the web app wraps it in a RouterProvider.
 * NotificationProvider sits above this (in App) so sign-in errors can raise toasts
 * before a user object exists.
 */
export default function Agent({ user, onSignOut }: AgentProps) {
  return (
    <NavigationContainer>
      <MainLayout user={user} onSignOut={onSignOut} />
    </NavigationContainer>
  );
}
