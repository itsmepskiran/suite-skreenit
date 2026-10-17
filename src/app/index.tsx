import { Redirect } from 'expo-router';

import { useSession } from '@/lib/session';

// Initial route: send people to the screen group their session allows (see the guards in _layout.tsx).
// Staff have their own workspace; sending a restored staff session to the company home left a blank screen.
export default function Index() {
  const status = useSession((s) => s.status);
  const isStaff = useSession((s) => !!s.staff);
  if (status !== 'signedIn') return <Redirect href="/(auth)/login" />;
  return <Redirect href={isStaff ? '/(staff)/companies' : '/(app)/home'} />;
}
