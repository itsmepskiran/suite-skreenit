import { FontAwesome6 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/components/ui';
import { useSession } from '@/lib/session';

// Four tabs: Home, Modules (every module the company has, generated from the API), My space (employee self-service), Account.
// Shown while Skreenit staff work inside a company: everything they do is logged for the company as staff.
function SupportBanner() {
  const back = useSession((s) => s.supportBack);
  const company = useSession((s) => s.me?.company.name);
  const leave = useSession((s) => s.leaveSupport);
  const top = useSafeAreaInsets().top;
  if (!back) return null;
  return (
    <View style={{ backgroundColor: '#92400E', paddingTop: top + 6, paddingBottom: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ color: '#fff', flex: 1, fontSize: 13 }} numberOfLines={2}>Support session in {company}. Actions are logged as staff.</Text>
      <Pressable onPress={() => void leave()} style={{ backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
        <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 12 }}>Back to staff</Text>
      </Pressable>
    </View>
  );
}

export default function AppLayout() {
  const inSupport = useSession((s) => !!s.supportBack);
  const icon = (name: React.ComponentProps<typeof FontAwesome6>['name']) =>
    function TabIcon({ color, size }: { color: ColorValue; size: number }) {
      return <FontAwesome6 name={name} size={size * 0.8} color={color} />;
    };
  return (
    <View style={{ flex: 1 }}>
    <SupportBanner />
    <Tabs screenOptions={{ headerShown: true, headerStatusBarHeight: inSupport ? 0 : undefined, headerTitleStyle: { fontWeight: '700' }, tabBarActiveTintColor: colors.primary, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('house') }} />
      <Tabs.Screen name="modules" options={{ title: 'Modules', headerShown: false, tabBarIcon: icon('table-cells-large') }} />
      <Tabs.Screen name="myspace" options={{ title: 'My space', headerShown: false, tabBarIcon: icon('user-clock') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('circle-user') }} />
    </Tabs>
    </View>
  );
}
