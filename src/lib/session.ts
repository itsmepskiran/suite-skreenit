import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { callApi, getMe, registerSession, type RightAction, type SuiteMe, type SuiteUser } from '@/lib/api';

const TOKEN_KEY = 'skreenit_suite_token';
const STAFF_KEY = 'skreenit_suite_staff_user'; // present only while the stored token belongs to Skreenit staff
const BACK_KEY = 'skreenit_suite_support_back'; // staff session kept aside while a staff member works inside a company

type Status = 'loading' | 'signedOut' | 'signedIn';
interface Back { token: string; user: SuiteUser }
interface SessionState {
  status: Status;
  token: string | null;
  me: SuiteMe | null;
  /** set when the signed-in login is Skreenit staff (no company workspace of their own) */
  staff: SuiteUser | null;
  /** set while staff are inside a company in an audited support session: how to get back */
  supportBack: Back | null;
  hydrate: () => Promise<void>;
  signIn: (token: string) => Promise<void>;
  signInStaff: (token: string, user: SuiteUser) => Promise<void>;
  enterCompany: (token: string) => Promise<void>;
  leaveSupport: () => Promise<void>;
  signOut: () => Promise<void>;
}

// Reading the phone's secure storage should be instant; if it ever stalls, treat it as empty rather than hanging the app.
const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> => Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

const forget = async () => {
  for (const k of [TOKEN_KEY, STAFF_KEY, BACK_KEY]) await SecureStore.deleteItemAsync(k).catch(() => {});
};
const read = async <T,>(key: string): Promise<T | null> => {
  const raw = await withTimeout(SecureStore.getItemAsync(key).catch(() => null), 4000, null);
  try { return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
};

export const useSession = create<SessionState>((set, get) => ({
  status: 'loading',
  token: null,
  me: null,
  staff: null,
  supportBack: null,

  // No refresh token: every cold start re-validates the stored token (company: /me, staff: a staff-only call).
  hydrate: async () => {
    const token = await withTimeout(SecureStore.getItemAsync(TOKEN_KEY).catch(() => null), 4000, null);
    if (!token) return set({ status: 'signedOut', token: null, me: null, staff: null, supportBack: null });
    const staff = await read<SuiteUser>(STAFF_KEY);
    const back = await read<Back>(BACK_KEY);
    set({ token });
    try {
      if (staff) {
        await callApi('GET', '/platform/modules');
        set({ status: 'signedIn', staff, me: null, supportBack: null });
      } else {
        set({ status: 'signedIn', me: (await getMe()).data, staff: null, supportBack: back });
      }
    } catch {
      await forget();
      set({ status: 'signedOut', token: null, me: null, staff: null, supportBack: null });
    }
  },

  signIn: async (token) => {
    set({ token });
    try {
      const me = (await getMe()).data;
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.deleteItemAsync(STAFF_KEY).catch(() => {});
      set({ status: 'signedIn', me, staff: null, supportBack: null });
    } catch (err) {
      set({ token: null });
      throw err;
    }
  },

  signInStaff: async (token, user) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(STAFF_KEY, JSON.stringify(user));
    set({ token, status: 'signedIn', staff: user, me: null, supportBack: null });
  },

  // Staff step into a company with the short-lived token from the server; everything they do is logged there as staff.
  enterCompany: async (companyToken) => {
    const { token, staff } = get();
    if (!token || !staff) return;
    const back: Back = { token, user: staff };
    set({ token: companyToken });
    try {
      const me = (await getMe()).data;
      await SecureStore.setItemAsync(BACK_KEY, JSON.stringify(back));
      await SecureStore.setItemAsync(TOKEN_KEY, companyToken);
      await SecureStore.deleteItemAsync(STAFF_KEY).catch(() => {});
      set({ me, staff: null, supportBack: back });
    } catch (err) {
      set({ token });
      throw err;
    }
  },

  leaveSupport: async () => {
    const back = get().supportBack;
    if (!back) return;
    await SecureStore.setItemAsync(TOKEN_KEY, back.token);
    await SecureStore.setItemAsync(STAFF_KEY, JSON.stringify(back.user));
    await SecureStore.deleteItemAsync(BACK_KEY).catch(() => {});
    set({ token: back.token, staff: back.user, me: null, supportBack: null });
  },

  signOut: async () => {
    await forget();
    set({ status: 'signedOut', token: null, me: null, staff: null, supportBack: null });
  },
}));

registerSession({
  getToken: () => useSession.getState().token,
  onUnauthorized: () => void useSession.getState().signOut(),
});

/** UI-only rights check; the API enforces rights again. The server already limits `rights` to modules the company has on. */
export const useCan = (module: string, action: RightAction = 'view') =>
  useSession((s) => !!s.me?.rights?.[module]?.[action]);
