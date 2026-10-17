import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { SUITE_API } from '@/lib/config';
import { useSession } from '@/lib/session';

/** Fetch a protected file (Excel export, PDF) with the login token, then hand it to the phone's share/open sheet. */
export async function downloadAndOpen(path: string, query: Record<string, unknown> = {}): Promise<string | null> {
  const qs = Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
  const ext = /pdf/.test(path) ? 'pdf' : 'xlsx';
  const name = `${path.split('/').filter(Boolean).slice(-2).join('-').replace(/[^a-z0-9-]/gi, '')}-${Date.now()}.${ext}`;
  const target = `${FileSystem.cacheDirectory}${name}`;
  const res = await FileSystem.downloadAsync(`${SUITE_API}${path}${qs ? `?${qs}` : ''}`, target, { headers: { Authorization: `Bearer ${useSession.getState().token}` } });
  if (res.status !== 200) return `Could not download the file (${res.status})`;
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(res.uri);
  return null;
}
