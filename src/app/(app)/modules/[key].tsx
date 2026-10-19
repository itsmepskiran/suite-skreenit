import { Stack, useLocalSearchParams } from 'expo-router';

import { ModuleScreen } from '@/components/engine/Module';
import { HR_SCREENS } from '@/components/hr';
import { buildModule } from '@/lib/schema';

export default function ModuleRoute() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const Custom = HR_SCREENS[String(key)];
  return (
    <>
      <Stack.Screen options={{ title: buildModule(String(key)).label }} />
      {Custom ? <Custom /> : <ModuleScreen moduleKey={String(key)} />}
    </>
  );
}
