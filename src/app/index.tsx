import { Redirect } from 'expo-router';

import { useSession } from '@/lib/session';

// Initial route: send people to the screen group their session allows (see the guards in _layout.tsx).
export default function Index() {
  const status = useSession((s) => s.status);
  return <Redirect href={status === 'signedIn' ? '/(app)/home' : '/(auth)/login'} />;
}
