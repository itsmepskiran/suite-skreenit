import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Shows the real error instead of a blank white screen if something fails while the app starts.
export { ErrorBoundary } from 'expo-router';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

export default function RootLayout() {
  const status = useSession((s) => s.status);
  const isStaff = useSession((s) => !!s.staff);

  useEffect(() => {
    void useSession.getState().hydrate();
    // never wait forever: if reading the saved login stalls, fall back to the sign-in screen
    const t = setTimeout(() => { if (useSession.getState().status === 'loading') useSession.setState({ status: 'signedOut' }); }, 8000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync().catch(() => {});
    const t = setTimeout(() => void SplashScreen.hideAsync().catch(() => {}), 4000); // the splash must never cover the app
    return () => clearTimeout(t);
  }, [status]);

  if (status === 'loading')
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#4F46E5' }}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={{ color: '#fff', fontSize: 15 }}>Starting Skreenit Suite…</Text>
      </View>
    );

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === 'signedIn' && !isStaff}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'signedIn' && isStaff}>
          <Stack.Screen name="(staff)" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'signedOut'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}
