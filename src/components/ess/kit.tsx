import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormSheet, type FormResult } from '@/components/engine/Form';
import { Button, colors, T } from '@/components/ui';
import { callApi } from '@/lib/api';
import { humanKey, money } from '@/lib/rows';
import { OPS, OVERRIDES, type Op } from '@/lib/schema';

// Small building blocks shared by the hand-built "My space" screens.

/** One of the employee's own self-service lists, kept fresh and refreshable. */
export function useEss<T = unknown>(path: string, query?: Record<string, unknown>) {
  const q = useQuery({ queryKey: ['ess', path, query ?? {}], queryFn: () => callApi('GET', path, { query }) as Promise<T> });
  return q;
}

/** Page frame: pull to refresh, spinner while loading, a plain message when something fails. */
export function Page({ q, children, fab }: { q: { isLoading: boolean; error: unknown; refetch: () => Promise<unknown>; isRefetching?: boolean }; children: ReactNode; fab?: ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.pad} refreshControl={<RefreshControl refreshing={!!q.isRefetching} onRefresh={() => void q.refetch()} />}>
        {q.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : q.error ? (
          <View style={styles.empty}>
            <FontAwesome6 name="circle-exclamation" size={28} color={colors.danger} />
            <T muted style={{ textAlign: 'center' }}>{q.error instanceof Error ? q.error.message : 'Something went wrong'}</T>
            <Button title="Try again" onPress={() => void q.refetch()} />
          </View>
        ) : children}
      </ScrollView>
      {fab}
    </View>
  );
}

export function Empty({ icon, text }: { icon: React.ComponentProps<typeof FontAwesome6>['name']; text: string }) {
  return (
    <View style={styles.empty}>
      <FontAwesome6 name={icon} size={30} color={colors.border} />
      <T muted style={{ textAlign: 'center' }}>{text}</T>
    </View>
  );
}

export function Heading({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
      <T bold muted small style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>{children}</T>
      {right}
    </View>
  );
}

export function Panel({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  const body = <View style={styles.card}>{children}</View>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>{body}</Pressable> : body;
}

export function KV({ k, v, bold, color }: { k: string; v: string; bold?: boolean; color?: string }) {
  return (
    <View style={styles.kv}>
      <T small muted style={{ flexShrink: 1 }}>{k}</T>
      <Text style={{ fontSize: bold ? 16 : 14, fontWeight: bold ? '700' : '500', color: color ?? colors.text, flexShrink: 1, textAlign: 'right' }}>{v}</Text>
    </View>
  );
}

const GOOD = /^(approved|paid|active|completed|finalized|enrolled|self_submitted)$/;
const BAD = /^(rejected|cancelled|dropped|failed)$/;
const WARN = /^(pending|draft|reviewed|in_progress)$/;
export function Pill({ value, label }: { value: string; label?: string }) {
  const [bg, fg] = GOOD.test(value) ? [colors.successBg, colors.successFg] : BAD.test(value) ? ['#FEE2E2', '#991B1B'] : WARN.test(value) ? ['#FEF3C7', '#92400E'] : [colors.infoBg, colors.infoFg];
  return <View style={{ backgroundColor: bg, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 2, borderRadius: 999 }}><Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{label ?? humanKey(value)}</Text></View>;
}

export function Bar({ pct, color = colors.primary }: { pct: number; color?: string }) {
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.neutralBg, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: 8, backgroundColor: color }} />
    </View>
  );
}

export function Fab({ onPress, icon = 'plus' }: { onPress: () => void; icon?: React.ComponentProps<typeof FontAwesome6>['name'] }) {
  return <Pressable onPress={onPress} style={styles.fab}><FontAwesome6 name={icon} size={20} color="#fff" /></Pressable>;
}

export const rupees = (n: unknown) => money(n);
export const day = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const shortDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

/**
 * A form for one of the self-service operations (apply for leave, submit a claim, update a goal...).
 * `submit` posts it, refreshes the My space lists and shows the server's own message if it is refused.
 */
export function useEssForm(method: Op['method'], path: string, title: string, submitLabel: string) {
  const qc = useQueryClient();
  const op = OPS.find((o) => o.method === method && o.path === path) ?? null;
  const fields = OVERRIDES[`${method} ${path}`] ?? op?.body ?? [];
  const [target, setTarget] = useState<{ params: Record<string, string>; initial?: Record<string, unknown> } | null>(null);
  const open = useCallback((params: Record<string, string> = {}, initial?: Record<string, unknown>) => setTarget({ params, initial }), []);
  const element = (
    <FormSheet
      visible={!!target}
      title={title}
      op={op}
      fields={fields}
      initial={target?.initial}
      submitLabel={submitLabel}
      onClose={() => setTarget(null)}
      onSubmit={async (r: FormResult) => {
        const p = path.replace(/\{([^}]+)\}/g, (_m, k) => encodeURIComponent(target?.params[k] ?? ''));
        try {
          await callApi(method, p, { json: r.json });
        } catch (e) {
          return e instanceof Error ? e.message : 'Something went wrong';
        }
        await qc.invalidateQueries({ queryKey: ['ess'] });
        setTarget(null);
      }}
    />
  );
  return { open, element };
}

/** Ask first, then run a one-tap self-service action (withdraw a request). */
export function confirmAction(title: string, message: string, run: () => Promise<unknown>, after: () => void) {
  Alert.alert(title, message, [
    { text: 'No', style: 'cancel' },
    { text: 'Yes', onPress: async () => { try { await run(); after(); } catch (e) { Alert.alert('Could not do that', e instanceof Error ? e.message : 'Something went wrong'); } } },
  ]);
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 12, paddingBottom: 96 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 48, paddingHorizontal: 24 },
  fab: { position: 'absolute', right: 18, bottom: 18, width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
});
