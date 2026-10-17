import { Stack, useLocalSearchParams } from 'expo-router';

import { ModuleScreen } from '@/components/engine/Module';
import { buildModule } from '@/lib/schema';

export default function ModuleRoute() {
  const { key } = useLocalSearchParams<{ key: string }>();
  return (
    <>
      <Stack.Screen options={{ title: buildModule(String(key)).label }} />
      <ModuleScreen moduleKey={String(key)} />
    </>
  );
}
