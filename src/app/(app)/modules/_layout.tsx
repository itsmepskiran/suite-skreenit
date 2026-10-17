import { Stack } from 'expo-router';

import { colors } from '@/components/ui';

export default function ModulesLayout() {
  return (
    <Stack screenOptions={{ headerTitleStyle: { fontWeight: '700' }, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" options={{ title: 'Modules' }} />
      <Stack.Screen name="[key]" options={{ title: '' }} />
    </Stack>
  );
}
