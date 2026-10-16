import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { getMe, registerSession, type RightAction, type SuiteMe } from '@/lib/api';

const TOKEN_KEY = 'skreenit_suite_token';

type Status = 'loading' | 'signedOut' | 'signedIn';
interface SessionState {
  status: Status;
  token: string | null;
  me: SuiteMe | null;
  hydrate: () => Promise<void>;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  token: null,
  me: null,

  // No refresh token: every cold start re-validates the stored token by loading /me.
  hydrate: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
    if (!token) return set({ status: 'signedOut', token: null, me: null });
    set({ token });
    try {
      set({ status: 'signedIn', me: (await getMe()).data });
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      set({ status: 'signedOut', token: null, me: null });
    }
  },

  signIn: async (token) => {
    set({ token });
    try {
      const me = (await getMe()).data;
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      set({ status: 'signedIn', me });
    } catch (err) {
      set({ token: null });
      throw err;
    }
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    set({ status: 'signedOut', token: null, me: null });
  },
}));

registerSession({
  getToken: () => useSession.getState().token,
  onUnauthorized: () => void useSession.getState().signOut(),
});

/** UI-only rights check; the API enforces rights again. The server already limits `rights` to modules the company has on. */
export const useCan = (module: string, action: RightAction = 'view') =>
  useSession((s) => !!s.me?.rights?.[module]?.[action]);
