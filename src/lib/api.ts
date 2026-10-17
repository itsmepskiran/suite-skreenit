import { SUITE_API } from '@/lib/config';

// Client for Skreenit Suite (/api/v1/suite). Own login and 8-hour bearer token, no refresh token.
// The session store registers itself here so this file never imports it (avoids a require cycle).
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let getToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};
export function registerSession(handlers: { getToken: () => string | null; onUnauthorized: () => void }) {
  getToken = handlers.getToken;
  onUnauthorized = handlers.onUnauthorized;
}

export type Role = 'owner' | 'admin' | 'user' | 'platform_admin';
export type RightAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';
export type Rights = Record<string, Partial<Record<RightAction, boolean>>>;

export interface SuiteUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: 'active' | 'inactive';
}
export interface SuiteCompany {
  id: string;
  name: string;
  pack_label: string;
  sub_type_label: string | null;
  state: string | null;
  labels: Record<string, string>;
  wording_defaults: Record<string, string>;
}
export interface SuiteModule {
  key: string;
  label: string;
  area: string;
  enabled: boolean;
  available: boolean;
}
export interface SuiteMe {
  user: SuiteUser;
  company: SuiteCompany;
  modules: SuiteModule[];
  rights: Rights;
}
export interface Branch {
  id: string;
  name: string;
  address: string | null;
  state: string | null;
  gstin: string | null;
  status: 'active' | 'inactive';
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (auth) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  let res: Response;
  try {
    res = await fetch(`${SUITE_API}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection.');
  }
  const isJson = res.headers.get('content-type')?.includes('application/json') ?? false;
  const body = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    if (res.status === 401 && auth) onUnauthorized();
    // Errors arrive as {detail} (route errors) or {message} (the app-wide handler on the live backend).
    const msg = body?.detail ?? body?.message;
    throw new ApiError(res.status, typeof msg === 'string' ? msg : 'Request failed');
  }
  return body as T;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
type Envelope<T> = { ok: boolean; data: T };

export const login = (loginId: string, password: string) =>
  request<Envelope<{ access_token: string; user: SuiteUser }>>('/login', json('POST', { login_id: loginId, password }), false);
export const getMe = () => request<Envelope<SuiteMe>>('/me');
export const listBranches = () => request<Envelope<Branch[]>>('/branches');
export const createBranch = (b: { name: string; state?: string; gstin?: string }) =>
  request<Envelope<Branch>>('/branches', json('POST', b));
export const listUsers = () => request<Envelope<SuiteUser[]>>('/users');

/** Any Suite operation. Returns the `data` of the {ok, data} envelope. Used by the generated screens. */
export async function callApi(
  method: string,
  path: string,
  opts: { query?: Record<string, unknown>; json?: unknown; form?: FormData } = {},
): Promise<unknown> {
  const qs = Object.entries(opts.query ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const init: RequestInit = opts.form ? { method, body: opts.form } : opts.json !== undefined ? json(method, opts.json) : { method };
  const res = await request<{ ok?: boolean; data?: unknown }>(`${path}${qs ? `?${qs}` : ''}`, init);
  return res && typeof res === 'object' && 'data' in res ? res.data : res;
}

/** Fill {param} placeholders of an operation path. */
export const fillPath = (path: string, params: Record<string, string>) => path.replace(/\{([^}]+)\}/g, (_m, k) => encodeURIComponent(params[k] ?? ''));
