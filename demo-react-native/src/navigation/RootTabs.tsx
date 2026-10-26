import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ListOrdered, MessageSquare } from 'lucide-react-native';

import { InteractionsPage } from '@/components/interactions/InteractionsPage';
import { useInteractionsContext } from '@/components/layout/interactions-context';
import { QueuesPage } from '@/components/queues/QueuesPage';
import { strings } from '@/locales/en';
import { colors } from '@/theme';

const Tab = createBottomTabNavigator();

/** Interactions tab — pulls shared state from MainLayout's context. */
function InteractionsTabScreen() {
  const {
    user,
    interactions,
    selectedInteractionId,
    isUserLoggedIn,
    setInteractions,
    setSelectedInteractionId,
  } = useInteractionsContext();

  return (
    <InteractionsPage
      user={user}
      interactions={interactions}
      selectedInteractionId={selectedInteractionId}
      isUserLoggedIn={isUserLoggedIn}
      setInteractions={setInteractions}
      setSelectedInteractionId={setSelectedInteractionId}
    />
  );
}

function QueuesTabScreen() {
  const { user } = useInteractionsContext();
  return <QueuesPage user={user} />;
}

interface RootTabsProps {
  /** Shown as a badge on the Interactions tab, mirroring demo-app's sidebar count. */
  interactionCount: number;
}

/**
 * RootTabs — bottom tab navigation.
 *
 * demo-app uses a 64px icon rail on the left; the same two destinations become a
 * bottom tab bar here, which is the platform-correct placement on phones.
 */
export function RootTabs({ interactionCount }: RootTabsProps) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue600,
        tabBarInactiveTintColor: colors.gray500,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.gray200,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Interactions"
        component={InteractionsTabScreen}
        options={{
          title: strings.nav.interactions,
          tabBarBadge: interactionCount > 0 ? interactionCount : undefined,
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Queues"
        component={QueuesTabScreen}
        options={{
          title: strings.nav.queues,
          tabBarIcon: ({ color, size }) => <ListOrdered size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
