import { createContext, useContext } from 'react';

import type { Interaction, User } from '@/sdk';

export interface InteractionsContextType {
  user: User;
  interactions: Interaction[];
  selectedInteractionId: string | undefined;
  isUserLoggedIn: boolean;
  setInteractions: React.Dispatch<React.SetStateAction<Interaction[]>>;
  setSelectedInteractionId: React.Dispatch<React.SetStateAction<string | undefined>>;
}

/**
 * Shared interaction state, owned by MainLayout and read by the tab screens.
 *
 * This lives in its own module rather than in MainLayout because MainLayout renders
 * RootTabs while RootTabs needs the context — importing the hook from MainLayout
 * created a require cycle (MainLayout -> RootTabs -> MainLayout), which Metro warns
 * about and which can yield uninitialized values depending on evaluation order.
 * A leaf module both sides import breaks the cycle.
 */
export const InteractionsContext = createContext<InteractionsContextType | undefined>(undefined);

/** Access the shared interaction state owned by MainLayout. */
export function useInteractionsContext(): InteractionsContextType {
  const context = useContext(InteractionsContext);
  if (!context) {
    throw new Error('useInteractionsContext must be used within MainLayout');
  }
  return context;
}
