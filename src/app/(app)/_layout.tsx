import { FontAwesome6 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { colors } from '@/components/ui';

// Phone shell for Skreenit Suite. Field-work modules (attendance, approvals, collections, visits) are added as
// their phases ship. Branches and Team are light on the phone: setup and rights are done on the website.
export default function AppLayout() {
  const icon = (name: React.ComponentProps<typeof FontAwesome6>['name']) =>
    function TabIcon({ color, size }: { color: ColorValue; size: number }) {
      return <FontAwesome6 name={name} size={size * 0.8} color={color} />;
    };
  return (
    <Tabs screenOptions={{ headerShown: true, headerTitleStyle: { fontWeight: '700' }, tabBarActiveTintColor: colors.primary, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('house') }} />
      <Tabs.Screen name="branches" options={{ title: 'Branches', tabBarIcon: icon('building') }} />
      <Tabs.Screen name="team" options={{ title: 'Team', tabBarIcon: icon('users') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('circle-user') }} />
    </Tabs>
  );
}
