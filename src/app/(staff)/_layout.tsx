import { FontAwesome6 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { colors } from '@/components/ui';

// Skreenit staff workspace: register and manage client companies, assign modules, and step into a company for support.
export default function StaffLayout() {
  const icon = (name: React.ComponentProps<typeof FontAwesome6>['name']) =>
    function TabIcon({ color, size }: { color: ColorValue; size: number }) {
      return <FontAwesome6 name={name} size={size * 0.8} color={color} />;
    };
  return (
    <Tabs screenOptions={{ headerTitleStyle: { fontWeight: '700' }, tabBarActiveTintColor: colors.primary, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="companies" options={{ title: 'Companies', tabBarIcon: icon('building') }} />
      <Tabs.Screen name="catalogue" options={{ title: 'All modules', tabBarIcon: icon('table-cells-large') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('circle-user') }} />
    </Tabs>
  );
}
