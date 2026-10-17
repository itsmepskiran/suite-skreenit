import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';

import { Credentials } from '@/components/staff/CompanySheet';
import { Button, colors, Field, Panel, T } from '@/components/ui';
import { callApi } from '@/lib/api';
import { AREA_LABEL, AREA_ORDER } from '@/lib/schema';

interface Pack { key: string; label: string; sub_types: { key: string; label: string }[]; modules: string[]; module_labels: string[] }
interface Pkg { key: string; label: string; modules: string[] }
interface Mod { key: string; label: string; area: string; built: boolean; always_on: boolean }

function Choice({ label, value, options, onChange }: { label: string; value: string; options: { key: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <T small bold>{label}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: value === o.key ? colors.primary : colors.border, backgroundColor: value === o.key ? colors.primary : colors.surface }}>
            <Text style={{ color: value === o.key ? '#fff' : colors.text, fontSize: 13, fontWeight: '600' }}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// Register a client company: industry, the modules it bought, its starting organisation structure, and its owner login.
export function RegisterCompany({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const packsQ = useQuery({ queryKey: ['staff', 'packs'], queryFn: async () => (await callApi('GET', '/packs')) as Pack[], enabled: visible });
  const pkgsQ = useQuery({ queryKey: ['staff', 'packages'], queryFn: async () => (await callApi('GET', '/packages')) as Pkg[], enabled: visible });
  const modsQ = useQuery({ queryKey: ['staff', 'catalogue'], queryFn: async () => (await callApi('GET', '/platform/modules')) as Mod[], enabled: visible });
  const [f, setF] = useState({ name: '', state: '', gstin: '', owner_name: '', owner_email: '', owner_password: '' });
  const [pack, setPack] = useState('');
  const [sub, setSub] = useState('');
  const [pkg, setPkg] = useState('');
  const [override, setOverride] = useState<Set<string> | null>(null); // the person's own ticks; null = follow the bundle / industry
  const [org, setOrg] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);

  const packs = packsQ.data ?? [];
  const current = packs.find((p) => p.key === (pack || packs[0]?.key));
  const catalogue = useMemo(() => (modsQ.data ?? []).filter((m) => m.built && !m.always_on), [modsQ.data]);

  // the module ticks follow the chosen bundle, or else the industry's usual modules, until the person changes one
  const packKey = pack || packs[0]?.key || '';
  const preset = pkg ? pkgsQ.data?.find((x) => x.key === pkg)?.modules : packs.find((p) => p.key === packKey)?.modules;
  const picked = override ?? new Set(preset ?? []);

  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const reset = () => { setF({ name: '', state: '', gstin: '', owner_name: '', owner_email: '', owner_password: '' }); setSub(''); setPkg(''); setOverride(null); setError(''); setOrg(true); };

  const submit = async () => {
    if (!f.name.trim() || !f.owner_name.trim() || !f.owner_email.trim()) return setError('Company name, owner name and owner email are required.');
    setBusy(true); setError('');
    try {
      const template = org ? await callApi('GET', '/platform/org-template', { query: { pack: packKey, sub_type: sub || undefined } }) : null;
      const res = (await callApi('POST', '/platform/companies', {
        json: { name: f.name.trim(), pack: packKey, sub_type: sub || null, state: f.state.trim() || null, gstin: f.gstin.trim() || null, owner_name: f.owner_name.trim(), owner_email: f.owner_email.trim(), owner_password: f.owner_password || null, modules: [...picked], org: template },
      })) as { owner: { email: string; password: string } };
      void qc.invalidateQueries({ queryKey: ['staff'] });
      reset();
      setCreds(res.owner);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not register the company');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Panel visible={visible && !creds} title="Register a company" onClose={onClose}>
        <Field label="Company name *" value={f.name} onChangeText={set('name')} />
        <Choice label="Industry" value={packKey} options={packs.map((p) => ({ key: p.key, label: p.label }))} onChange={(v) => { setPack(v); setSub(''); setOverride(null); }} />
        {current && current.sub_types.length ? <Choice label="Type" value={sub} options={[{ key: '', label: 'Any' }, ...current.sub_types]} onChange={setSub} /> : null}
        <Choice label="Bundle" value={pkg} options={[{ key: '', label: "Industry's usual" }, ...(pkgsQ.data ?? []).map((x) => ({ key: x.key, label: x.label }))]} onChange={(v) => { setPkg(v); setOverride(null); }} />
        <T small bold>Modules</T>
        {AREA_ORDER.map((area) => {
          const mods = catalogue.filter((m) => m.area === area);
          if (!mods.length) return null;
          return (
            <View key={area} style={{ gap: 4 }}>
              <T small muted>{AREA_LABEL[area] ?? area}</T>
              {mods.map((m) => (
                <View key={m.key} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <T small style={{ flex: 1 }}>{m.label}</T>
                  <Switch value={picked.has(m.key)} trackColor={{ true: colors.primary }} onValueChange={(on) => { const n = new Set(picked); if (on) n.add(m.key); else n.delete(m.key); setOverride(n); }} />
                </View>
              ))}
            </View>
          );
        })}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T small bold style={{ flex: 1 }}>Set up the starting organisation structure for this industry</T>
          <Switch value={org} onValueChange={setOrg} trackColor={{ true: colors.primary }} />
        </View>
        <Field label="State" value={f.state} onChangeText={set('state')} />
        <Field label="GSTIN" value={f.gstin} onChangeText={set('gstin')} autoCapitalize="characters" />
        <Field label="Owner name *" value={f.owner_name} onChangeText={set('owner_name')} />
        <Field label="Owner email *" value={f.owner_email} onChangeText={set('owner_email')} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Owner password (leave empty to generate)" value={f.owner_password} onChangeText={set('owner_password')} autoCapitalize="none" />
        {error ? <T small style={{ color: colors.danger }}>{error}</T> : null}
        <Button title="Register company" loading={busy} onPress={() => void submit()} />
      </Panel>
      <Credentials creds={creds} onClose={() => { setCreds(null); onClose(); Alert.alert('Registered', 'The company is ready. Share the owner login with them.'); }} title="Owner login" />
    </>
  );
}
