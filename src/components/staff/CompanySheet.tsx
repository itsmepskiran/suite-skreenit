import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, Switch, Text, View } from 'react-native';

import type { CompanyRow } from '@/components/staff/types';
import { Badge, Button, Card, colors, Panel, T } from '@/components/ui';
import { callApi } from '@/lib/api';
import { AREA_LABEL, AREA_ORDER } from '@/lib/schema';
import { useSession } from '@/lib/session';

interface Detail {
  company: { id: string; name: string; pack_label: string; sub_type_label: string | null; state: string | null; gstin: string | null; status: string };
  users: { id: string; name: string; email: string; role: string; status: string }[];
  modules: { key: string; label: string; area: string; always_on: boolean; enabled: boolean; available: boolean }[];
}

export function Credentials({ creds, onClose, title }: { creds: { email: string; password: string } | null; onClose: () => void; title: string }) {
  return (
    <Panel visible={!!creds} title={title} onClose={onClose}>
      <T muted>This password is shown only now. Share it with the person securely.</T>
      <Card>
        <T small muted>Email</T>
        <T bold selectable>{creds?.email}</T>
        <T small muted style={{ marginTop: 8 }}>Password</T>
        <T bold selectable style={{ fontSize: 18 }}>{creds?.password}</T>
      </Card>
      <Button title="Share" icon="share-nodes" onPress={() => void Share.share({ message: `Skreenit Suite login\nEmail: ${creds?.email}\nPassword: ${creds?.password}` })} />
    </Panel>
  );
}

export function CompanySheet({ company, onClose }: { company: CompanyRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const enterCompany = useSession((s) => s.enterCompany);
  const [editMods, setEditMods] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const q = useQuery({ queryKey: ['staff', 'company', company?.id], queryFn: async () => (await callApi('GET', `/platform/companies/${company!.id}`)) as Detail, enabled: !!company });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['staff'] }); };
  const fail = (e: unknown) => Alert.alert('Could not do that', e instanceof Error ? e.message : 'Try again');

  const enter = useMutation({
    mutationFn: async () => (await callApi('POST', `/platform/companies/${company!.id}/enter`)) as { access_token: string },
    onSuccess: async (r) => { onClose(); await enterCompany(r.access_token); },
    onError: fail,
  });
  const toggle = useMutation({
    mutationFn: async (status: string) => callApi('PATCH', `/platform/companies/${company!.id}`, { json: { status } }),
    onSuccess: refresh, onError: fail,
  });
  const reset = useMutation({
    mutationFn: async (uid: string) => (await callApi('POST', `/platform/companies/${company!.id}/users/${uid}/reset-password`)) as { email: string; password: string },
    onSuccess: (r) => setCreds(r), onError: fail,
  });
  const saveMods = useMutation({
    mutationFn: async () => callApi('PUT', `/platform/companies/${company!.id}/modules`, { json: { modules: [...picked] } }),
    onSuccess: () => { setEditMods(false); refresh(); Alert.alert('Saved', 'The modules were updated. The company sees them next time it opens the app.'); },
    onError: fail,
  });

  const d = q.data;
  const choosable = (d?.modules ?? []).filter((m) => !m.always_on && m.available);
  const startEdit = () => { setPicked(new Set(choosable.filter((m) => m.enabled).map((m) => m.key))); setEditMods(true); };
  const confirmReset = (u: Detail['users'][number]) =>
    Alert.alert('Reset password?', `A new password is made for ${u.email}. The old one stops working.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: () => reset.mutate(u.id) }]);

  return (
    <>
      <Panel visible={!!company && !editMods} title={company?.name ?? ''} onClose={onClose}>
        {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {d ? (
          <>
            <Card>
              <T small muted>{d.company.pack_label}{d.company.sub_type_label ? ` · ${d.company.sub_type_label}` : ''}</T>
              {d.company.state ? <T small>State: {d.company.state}</T> : null}
              {d.company.gstin ? <T small>GSTIN: {d.company.gstin}</T> : null}
              <Badge value={d.company.status} />
            </Card>
            <Button title="Enter this company (support)" icon="right-to-bracket" loading={enter.isPending} onPress={() => enter.mutate()} />
            <Button title={d.company.status === 'active' ? 'Deactivate company' : 'Activate company'} icon="power-off" loading={toggle.isPending} onPress={() => toggle.mutate(d.company.status === 'active' ? 'inactive' : 'active')} />
            <T bold style={{ marginTop: 6 }}>Users</T>
            {d.users.map((u) => (
              <Card key={u.id}>
                <T bold>{u.name} <Text style={{ color: colors.muted, fontWeight: '400' }}>· {u.role}</Text></T>
                <T small muted>{u.email}{u.status !== 'active' ? ' · inactive' : ''}</T>
                <Pressable onPress={() => confirmReset(u)}><T small bold style={{ color: colors.primary }}>Reset password</T></Pressable>
              </Card>
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <T bold style={{ flex: 1 }}>Modules ({d.modules.filter((m) => m.enabled && !m.always_on).length} switched on)</T>
              <Pressable onPress={startEdit}><T small bold style={{ color: colors.primary }}>Change</T></Pressable>
            </View>
            <T small muted>{d.modules.filter((m) => m.enabled && !m.always_on).map((m) => m.label).join(', ') || 'Only the always-on modules.'}</T>
          </>
        ) : null}
      </Panel>
      <Panel visible={editMods} title="Modules" onClose={() => setEditMods(false)}>
        <T muted>Choose what this company can use. Modules a choice depends on are added automatically.</T>
        {AREA_ORDER.map((area) => {
          const mods = choosable.filter((m) => m.area === area);
          if (!mods.length) return null;
          return (
            <View key={area} style={{ gap: 6 }}>
              <T bold muted small>{(AREA_LABEL[area] ?? area).toUpperCase()}</T>
              {mods.map((m) => (
                <View key={m.key} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <T style={{ flex: 1 }}>{m.label}</T>
                  <Switch value={picked.has(m.key)} trackColor={{ true: colors.primary }} onValueChange={(on) => setPicked((s) => { const n = new Set(s); if (on) n.add(m.key); else n.delete(m.key); return n; })} />
                </View>
              ))}
            </View>
          );
        })}
        <Button title="Save modules" loading={saveMods.isPending} onPress={() => saveMods.mutate()} />
      </Panel>
      <Credentials creds={creds} onClose={() => setCreds(null)} title="New password" />
    </>
  );
}
