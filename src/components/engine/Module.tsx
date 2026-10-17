import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FormSheet, kindOf, type FormResult } from '@/components/engine/Form';
import { Button, Card, colors, T } from '@/components/ui';
import { callApi, fillPath } from '@/lib/api';
import { downloadAndOpen } from '@/lib/download';
import { amountOf, humanKey, idOf, isObj, sectionsOf, show, statusOf, subtitleOf, titleOf, type Row } from '@/lib/rows';
import { allowed, buildModule, headerOps, isFileOp, looseOps, opsForRows, OVERRIDES, type Field, type Op, type Param, type Resource } from '@/lib/schema';
import { useSession } from '@/lib/session';

// ---------------------------------------------------------------- small pieces
const GOOD = /^(approved|paid|active|completed|done|accepted|joined|verified|open|present|finalized|enrolled|received|ready|issued|sent|closed)$/;
const BAD = /^(rejected|cancelled|canceled|failed|overdue|absent|declined|dropped|inactive|expired|lost)$/;
const WARN = /^(pending|draft|waiting|submitted|in_progress|invited|changes_requested|partial|reviewed|self_submitted)$/;
function StatusPill({ value }: { value: string }) {
  const [bg, fg] = GOOD.test(value) ? [colors.successBg, colors.successFg] : BAD.test(value) ? ['#FEE2E2', '#991B1B'] : WARN.test(value) ? ['#FEF3C7', '#92400E'] : [colors.infoBg, colors.infoFg];
  return <View style={{ backgroundColor: bg, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 2, borderRadius: 999 }}><Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{humanKey(value)}</Text></View>;
}
function Pill({ title, onPress, danger, icon }: { title: string; onPress: () => void; danger?: boolean; icon?: React.ComponentProps<typeof FontAwesome6>['name'] }) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, danger && { borderColor: '#FCA5A5' }]}>
      {icon ? <FontAwesome6 name={icon} size={12} color={danger ? colors.danger : colors.primary} /> : null}
      <Text style={{ color: danger ? colors.danger : colors.primary, fontWeight: '600', fontSize: 13 }}>{title}</Text>
    </Pressable>
  );
}
const SHOWN_KEYS = ['name', 'title', 'label', 'candidate_name', 'employee_name', 'full_name', 'party_name', 'customer_name', 'vendor_name', 'number', 'doc_number', 'invoice_number', 'code', 'description', 'emp_code', 'email', 'phone', 'designation', 'department', 'branch', 'type', 'kind', 'date', 'from_date', 'start_date', 'due_date', 'created_at', 'total', 'grand_total', 'amount', 'net', 'net_pay', 'balance', 'principal', 'ctc_annual', 'outstanding'];
// payload wrappers that say nothing to the reader
const GENERIC = new Set(['items', 'rows', 'results', 'data', 'entries', 'records', 'list']);
const opLabel = (op: Op) => op.summary || `${op.method} ${op.path}`;
const fieldsOf = (op: Op): Field[] => OVERRIDES[`${op.method} ${op.path}`] ?? op.body ?? [];
const paramField = (p: Param): Field => ({ name: p.name, label: humanKey(p.name), required: p.required, type: p.enum ? 'select' : p.type === 'boolean' ? 'boolean' : p.type === 'integer' || p.type === 'number' ? 'number' : 'text', options: p.enum ?? undefined, default: p.default ?? undefined });
const NOW = new Date();
const dynamicDefault = (p: Param): unknown => (p.default !== null && p.default !== undefined ? p.default : p.name === 'year' ? NOW.getFullYear() : p.name === 'month' ? NOW.getMonth() + 1 : undefined);

/** Plain facts as label/value rows; a nested group becomes its own indented block instead of a long right-hand string. */
function Facts({ entries, counts }: { entries: [string, unknown][]; counts: boolean }) {
  const simple = entries.filter(([, v]) => !isObj(v));
  const groups = entries.filter(([, v]) => isObj(v)) as [string, Row][];
  return (
    <View style={{ gap: 10 }}>
      {simple.length ? (
        <Card>
          {simple.map(([k, v]) => (
            <View key={k} style={styles.kv}>
              <T small muted style={{ flex: 0.45 }}>{humanKey(k)}</T>
              <T small style={{ flex: 0.55, textAlign: 'right' }}>{show(k, v, counts)}</T>
            </View>
          ))}
        </Card>
      ) : null}
      {groups.map(([k, g]) => {
        const rows = Object.entries(g).filter(([a, b]) => a !== 'id' && !(a.endsWith('_id') && typeof b === 'string' && b.length >= 32));
        return rows.length ? (
          <View key={k} style={{ gap: 6 }}>
            <T bold small>{humanKey(k)}</T>
            <Card>
              {rows.map(([a, b]) => (
                <View key={a} style={styles.kv}>
                  <T small muted style={{ flex: 0.45 }}>{humanKey(a)}</T>
                  <T small style={{ flex: 0.55, textAlign: 'right' }}>{isObj(b) ? Object.entries(b).map(([x, y]) => `${humanKey(x)}: ${show(x, y)}`).join('\n') : show(a, b)}</T>
                </View>
              ))}
            </Card>
          </View>
        ) : null;
      })}
    </View>
  );
}

/** Facts and lists of any payload, drawn as cards. */
export function ObjectView({ data, onRow }: { data: unknown; onRow?: (row: Row, section: string) => void }) {
  const { facts, lists, empty } = sectionsOf(data);
  // Raw ids and empty groups are noise on a phone; a count called "total" is a number, not rupees.
  const counts = 'page' in facts || 'limit' in facts;
  const entries = Object.entries(facts).filter(([k, v]) => k !== 'id' && !(k.endsWith('_id') && typeof v === 'string' && v.length >= 32) && !(isObj(v) && !Object.keys(v).length));
  return (
    <View style={{ gap: 12 }}>
      {entries.length ? <Facts entries={entries} counts={counts} /> : null}
      {lists.map((l) => (
        <View key={l.name || 'rows'} style={{ gap: 8 }}>
          {l.name && !GENERIC.has(l.name) ? <T bold>{humanKey(l.name)}</T> : null}
          {l.rows.length ? l.rows.map((r, i) => <RowCard key={`${idOf(r, 'id')}-${i}`} row={r} onPress={onRow ? () => onRow(r, l.name) : undefined} />) : <T small muted>Nothing here yet.</T>}
        </View>
      ))}
      {empty ? <T muted>Nothing to show.</T> : null}
    </View>
  );
}

function RowCard({ row, onPress }: { row: Row; onPress?: () => void }) {
  const title = titleOf(row);
  const sub = subtitleOf(row, title);
  const status = statusOf(row);
  const amount = amountOf(row);
  // a few more facts so a row says something (balances, dates, quantities), never ids or what is already shown
  const shown = new Set([...SHOWN_KEYS, 'status', 'state']);
  const extras = Object.entries(row)
    .filter(([k, v]) => !shown.has(k) && k !== 'id' && !k.endsWith('_id') && (typeof v === 'number' || (typeof v === 'string' && v.length > 0 && v.length < 40 && v !== title)))
    .slice(0, 4);
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Card>
        <View style={styles.rowTop}>
          <T bold style={{ flex: 1 }}>{title}</T>
          {amount ? <T bold>{amount}</T> : null}
        </View>
        {sub ? <T small muted>{sub}</T> : null}
        {extras.map(([k, v]) => <T key={k} small muted>{humanKey(k)}: {show(k, v)}</T>)}
        {status ? <StatusPill value={status} /> : null}
      </Card>
    </Pressable>
  );
}

// ---------------------------------------------------------------- the module screen
interface Pending { op: Op; row?: Row; params: Record<string, string>; edit?: boolean }

export function ModuleScreen({ moduleKey }: { moduleKey: string }) {
  const rights = useSession((s) => s.me?.rights ?? {});
  const model = useMemo(() => buildModule(moduleKey), [moduleKey]);
  const resources = useMemo(() => model.resources.filter((r) => allowed(r.list, rights)), [model, rights]);
  const [active, setActive] = useState(0);
  const resource = resources[Math.min(active, resources.length - 1)];
  const loose = useMemo(() => looseOps(model).filter((o) => allowed(o, rights)), [model, rights]);
  const files = useMemo(() => model.files.filter((o) => allowed(o, rights)), [model, rights]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [result, setResult] = useState<{ title: string; data: unknown } | null>(null);
  const [more, setMore] = useState(false);

  if (!resource && !loose.length && !files.length) return <View style={styles.pad}><T muted>There is nothing to show for you here.</T></View>;
  return (
    <View style={{ flex: 1 }}>
      {resources.length > 1 ? (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {resources.map((r, i) => (
              <Pressable key={r.path} onPress={() => setActive(i)} style={[styles.chip, i === active && styles.chipOn]}>
                <Text style={{ color: i === active ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>{r.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      {resource ? <ResourceView key={resource.path} model={model} resource={resource} setPending={setPending} setResult={setResult} /> : <View style={styles.pad} />}
      {loose.length || files.length ? (
        <Pressable style={styles.fab} onPress={() => setMore(true)}><FontAwesome6 name="ellipsis" size={18} color="#fff" /></Pressable>
      ) : null}
      <MoreMenu visible={more} onClose={() => setMore(false)} loose={loose} files={files} run={(op) => { setMore(false); setPending({ op, params: {} }); }} />
      <Runner pending={pending} onClose={() => setPending(null)} setResult={setResult} />
      <ResultSheet result={result} onClose={() => setResult(null)} />
    </View>
  );
}

function MoreMenu({ visible, onClose, loose, files, run }: { visible: boolean; onClose: () => void; loose: Op[]; files: Op[]; run: (op: Op) => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { maxHeight: '75%' }]} onPress={() => undefined}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
            {loose.length ? <T bold>Actions</T> : null}
            {loose.map((o) => <Pill key={o.method + o.path} title={opLabel(o)} onPress={() => run(o)} />)}
            {files.length ? <T bold style={{ marginTop: 8 }}>Downloads</T> : null}
            {files.map((o) => <Pill key={o.path} title={humanKey(o.path.split('/').filter(Boolean).slice(-1)[0] ?? o.path)} icon="download" onPress={() => run(o)} />)}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ResourceView({ model, resource, setPending, setResult }: { model: ReturnType<typeof buildModule>; resource: Resource; setPending: (p: Pending) => void; setResult: (r: { title: string; data: unknown }) => void }) {
  const rights = useSession((s) => s.me?.rights ?? {});
  const qParams = resource.list.query;
  const [filters, setFilters] = useState<Record<string, string>>(() => Object.fromEntries(qParams.map((p) => [p.name, resource.path === '/approvals' && p.name === 'status' ? 'pending' : dynamicDefault(p) === undefined ? '' : String(dynamicDefault(p))])));
  const [applied, setApplied] = useState(filters);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const q = useQuery({ queryKey: ['res', resource.path, applied], queryFn: () => callApi('GET', resource.path, { query: applied }) });
  const header = useMemo(() => headerOps(model, resource).filter((o) => allowed(o, rights)), [model, resource, rights]);
  const [item, setItem] = useState<{ row: Row; section: string } | null>(null);

  const payload = useMemo(() => {
    if (!search.trim()) return q.data;
    const s = search.toLowerCase();
    const filter = (rows: Row[]) => rows.filter((r) => JSON.stringify(r).toLowerCase().includes(s));
    if (Array.isArray(q.data)) return filter(q.data as Row[]);
    if (isObj(q.data)) return Object.fromEntries(Object.entries(q.data).map(([k, v]) => [k, Array.isArray(v) && v.every(isObj) ? filter(v as Row[]) : v]));
    return q.data;
  }, [q.data, search]);
  const hasRows = sectionsOf(q.data).lists.some((l) => l.rows.length > 5);

  return (
    <ScrollView contentContainerStyle={styles.pad} refreshControl={<RefreshControl refreshing={q.isFetching && !q.isLoading} onRefresh={() => void q.refetch()} />} keyboardShouldPersistTaps="handled">
      {header.length ? (
        <View style={styles.actions}>
          {header.map((o) => <Pill key={o.method + o.path} icon={o.method === 'POST' ? 'plus' : 'pen'} title={opLabel(o)} onPress={() => setPending({ op: o, params: {} })} />)}
        </View>
      ) : null}
      {qParams.length ? (
        <View style={{ gap: 8 }}>
          <Pressable onPress={() => setOpen((v) => !v)} style={styles.filterHead}>
            <FontAwesome6 name="sliders" size={13} color={colors.primary} />
            <T small bold style={{ color: colors.primary }}>Filters</T>
          </Pressable>
          {open ? (
            <Card>
              {qParams.map((p) => (
                <View key={p.name} style={{ gap: 4 }}>
                  <T small muted>{humanKey(p.name)}</T>
                  <TextInput value={filters[p.name] ?? ''} onChangeText={(v) => setFilters((s) => ({ ...s, [p.name]: v }))} placeholder={p.enum ? p.enum.join(' / ') : ''} placeholderTextColor={colors.muted} style={styles.filter} autoCapitalize="none" />
                </View>
              ))}
              <Button title="Apply" onPress={() => { setApplied(filters); setOpen(false); }} />
            </Card>
          ) : null}
        </View>
      ) : null}
      {hasRows || search ? <TextInput value={search} onChangeText={setSearch} placeholder="Search this list" placeholderTextColor={colors.muted} style={styles.filter} /> : null}
      {q.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
      {q.error ? <T style={{ color: colors.danger }}>{(q.error as Error).message}</T> : null}
      {q.data !== undefined ? <ObjectView data={payload} onRow={(row, section) => setItem({ row, section })} /> : null}
      <ItemSheet model={model} resource={resource} item={item} onClose={() => setItem(null)} setPending={(p) => { setItem(null); setPending(p); }} setResult={setResult} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------- a row: details and what can be done with it
function ItemSheet({ model, resource, item, onClose, setPending, setResult }: { model: ReturnType<typeof buildModule>; resource: Resource; item: { row: Row; section: string } | null; onClose: () => void; setPending: (p: Pending) => void; setResult: (r: { title: string; data: unknown }) => void }) {
  const rights = useSession((s) => s.me?.rights ?? {});
  const ops = useMemo(() => (item ? opsForRows(model, resource, item.section) : null), [model, resource, item]);
  const detailOp = ops?.detail && allowed(ops.detail, rights) ? ops.detail : null;
  const detail = useQuery({
    queryKey: ['item', detailOp?.path, item?.row.id],
    queryFn: () => callApi('GET', fillPath(detailOp!.path, { [detailOp!.path_params[0].name]: idOf(item!.row, detailOp!.path_params[0].name) })),
    enabled: !!item && !!detailOp,
  });
  const runItemOp = (o: Op, row: Row) => {
    if (o.method === 'GET') { setResult({ title: opLabel(o), data: null }); void openGet(o, row, setResult); return; }
    setPending({ op: o, row, params: { [o.path_params[0].name]: idOf(row, o.path_params[0].name) }, edit: o.method === 'PUT' || o.method === 'PATCH' });
  };
  if (!item || !ops) return null;
  const actions = ops.items.filter((o) => o !== ops.detail && allowed(o, rights));
  const data = detail.data !== undefined ? detail.data : item.row;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <T title style={{ flex: 1, fontSize: 18 }} >{titleOf(item.row)}</T>
            <Pressable onPress={onClose} hitSlop={12}><FontAwesome6 name="xmark" size={18} color={colors.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            {actions.length ? (
              <View style={styles.actions}>
                {actions.map((o) => <Pill key={o.method + o.path} danger={o.method === 'DELETE'} title={o.method === 'PUT' || o.method === 'PATCH' ? `Edit${o.path.endsWith('}') ? '' : ` · ${humanKey(o.path.split('/').pop() ?? '')}`}` : opLabel(o)} onPress={() => runItemOp(o, item.row)} />)}
              </View>
            ) : null}
            {detail.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
            <ObjectView data={data} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

async function openGet(op: Op, row: Row, setResult: (r: { title: string; data: unknown }) => void) {
  const p = op.path_params[0];
  const path = fillPath(op.path, { [p.name]: idOf(row, p.name) });
  if (isFileOp(op)) { const e = await downloadAndOpen(path); if (e) Alert.alert('Download', e); setResult({ title: '', data: undefined }); return; }
  try { setResult({ title: opLabel(op), data: await callApi('GET', path) }); } catch (e) { Alert.alert('Could not load', e instanceof Error ? e.message : 'Try again'); }
}

// ---------------------------------------------------------------- running an operation
function Runner({ pending, onClose, setResult }: { pending: Pending | null; onClose: () => void; setResult: (r: { title: string; data: unknown }) => void }) {
  const qc = useQueryClient();
  const op = pending?.op ?? null;
  const fields = op ? fieldsOf(op) : [];
  const queryFields = op && (op.method !== 'GET' || isFileOp(op)) ? op.query.map(paramField) : op ? op.query.map(paramField) : [];
  const needsForm = !!op && (fields.length > 0 || queryFields.length > 0);
  const run = useMutation({
    mutationFn: async (r: FormResult) => {
      const path = fillPath(op!.path, pending!.params);
      if (isFileOp(op!)) { const e = await downloadAndOpen(path, r.query ?? {}); return e ? { error: e } : { downloaded: true }; }
      return { data: await callApi(op!.method, path, { query: op!.method === 'GET' ? r.query : r.query, json: r.json, form: r.form }) };
    },
  });
  // dangerous or form-less operations are confirmed in a dialog instead of an empty sheet
  const [asked, setAsked] = useState<string | null>(null);
  const key = op ? `${op.method} ${op.path}` : null;
  if (pending && op && !needsForm && asked !== key) {
    setAsked(key);
    setTimeout(() => {
      Alert.alert(opLabel(op), op.method === 'DELETE' ? 'This cannot be undone. Continue?' : 'Do this now?', [
        { text: 'Cancel', style: 'cancel', onPress: onClose },
        { text: op.method === 'DELETE' ? 'Delete' : 'Yes', style: op.method === 'DELETE' ? 'destructive' : 'default', onPress: () => void submit({}) },
      ]);
    }, 0);
  }
  if (!pending && asked) setAsked(null);

  const submit = async (r: FormResult): Promise<string | void> => {
    if (!op) return;
    try {
      const out = await run.mutateAsync(r);
      if ('error' in out && out.error) return out.error;
      if ('downloaded' in out) { onClose(); return; }
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'res' || q.queryKey[0] === 'item' || q.queryKey[0] === 'home' });
      onClose();
      if (op.method === 'GET') setResult({ title: opLabel(op), data: (out as { data: unknown }).data });
      else Alert.alert('Done', opLabel(op) + ' went through.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      if (!needsForm) Alert.alert('Could not do that', msg);
      return msg;
    }
  };

  return (
    <FormSheet
      visible={!!pending && needsForm}
      title={op ? opLabel(op) : ''}
      op={op}
      fields={fields}
      queryFields={queryFields}
      initial={pending?.edit ? pending.row : undefined}
      submitLabel={op && isFileOp(op) ? 'Download' : op?.method === 'GET' ? 'Show' : 'Save'}
      onClose={onClose}
      onSubmit={submit}
    />
  );
}

function ResultSheet({ result, onClose }: { result: { title: string; data: unknown } | null; onClose: () => void }) {
  if (!result || result.data === undefined || (result.data === null && !result.title)) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <T title style={{ flex: 1, fontSize: 18 }}>{result.title}</T>
            <Pressable onPress={onClose} hitSlop={12}><FontAwesome6 name="xmark" size={18} color={colors.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>{result.data === null ? <ActivityIndicator color={colors.primary} /> : <ObjectView data={result.data} />}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export { kindOf };

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 12, paddingBottom: 90 },
  chips: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  kv: { flexDirection: 'row', gap: 10, paddingVertical: 3, justifyContent: 'space-between' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filter: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: colors.text, backgroundColor: colors.surface },
  fab: { position: 'absolute', right: 18, bottom: 18, width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, paddingBottom: 0 },
});
