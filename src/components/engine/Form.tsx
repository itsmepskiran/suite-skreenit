import { FontAwesome6 } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button, colors, Sheet, T } from '@/components/ui';
import { callApi } from '@/lib/api';
import { DATE_NAME, LOOKUPS, type Field, type Op } from '@/lib/schema';
import { humanKey, idOf, isObj, sectionsOf, titleOf, type Row } from '@/lib/rows';

type Values = Record<string, unknown>;

// ---------------------------------------------------------------- pick lists
function PickList({ visible, title, onClose, items, onPick }: { visible: boolean; title: string; onClose: () => void; items: { id: string; label: string }[] | null; onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const shown = (items ?? []).filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.pick}>
          <View style={styles.pickHead}>
            <T bold>{title}</T>
            <Pressable onPress={onClose} hitSlop={12}><FontAwesome6 name="xmark" size={18} color={colors.text} /></Pressable>
          </View>
          <TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={colors.muted} style={styles.search} />
          {items === null ? <ActivityIndicator style={{ margin: 24 }} color={colors.primary} /> : null}
          <FlatList
            data={shown}
            keyExtractor={(i) => i.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={items ? <T muted style={{ padding: 20 }}>Nothing to choose from.</T> : null}
            renderItem={({ item }) => (
              <Pressable style={styles.pickRow} onPress={() => { onPick(item.id); onClose(); setQ(''); }}>
                <T>{item.label}</T>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

function Lookup({ field, value, onChange }: { field: Field; value: unknown; onChange: (v: string) => void }) {
  const spec = field.lookup ?? LOOKUPS[field.name];
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ['lookup', spec.path, spec.key ?? ''],
    queryFn: async () => {
      const payload = await callApi('GET', spec.path);
      const lists = sectionsOf(payload).lists;
      const rows = (spec.key ? lists.find((l) => l.name === spec.key) : lists[0])?.rows ?? [];
      return rows.map((r) => ({ id: String(r.id ?? ''), label: [titleOf(r), typeof r.emp_code === 'string' ? r.emp_code : ''].filter(Boolean).join(' · ') })).filter((r) => r.id);
    },
    enabled: open || !!value,
    staleTime: 60_000,
  });
  const label = q.data?.find((i) => i.id === value)?.label ?? (value ? String(value) : '');
  return (
    <>
      <Pressable style={styles.input} onPress={() => setOpen(true)}>
        <Text style={{ color: label ? colors.text : colors.muted, fontSize: 15 }}>{label || `Choose ${field.label.toLowerCase()}`}</Text>
      </Pressable>
      <PickList visible={open} title={field.label} onClose={() => setOpen(false)} items={q.data ?? null} onPick={onChange} />
    </>
  );
}

function Select({ field, value, onChange }: { field: Field; value: unknown; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const items = (field.options ?? []).map((o) => ({ id: String(o), label: humanKey(String(o)) }));
  return (
    <>
      <Pressable style={styles.input} onPress={() => setOpen(true)}>
        <Text style={{ color: value ? colors.text : colors.muted, fontSize: 15 }}>{value ? humanKey(String(value)) : `Choose ${field.label.toLowerCase()}`}</Text>
      </Pressable>
      <PickList visible={open} title={field.label} onClose={() => setOpen(false)} items={items} onPick={onChange} />
    </>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function DateInput({ value, onChange }: { value: unknown; onChange: (v: string) => void }) {
  const [iosOpen, setIosOpen] = useState(false);
  const current = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date();
  const open = () => {
    if (Platform.OS === 'android') DateTimePickerAndroid.open({ value: current, mode: 'date', onChange: (_e, d) => d && onChange(iso(d)) });
    else setIosOpen((v) => !v);
  };
  return (
    <>
      <Pressable style={[styles.input, styles.dateRow]} onPress={open}>
        <Text style={{ color: value ? colors.text : colors.muted, fontSize: 15 }}>{value ? String(value) : 'Choose a date'}</Text>
        <FontAwesome6 name="calendar" size={14} color={colors.muted} />
      </Pressable>
      {iosOpen ? <DateTimePicker value={current} mode="date" display="inline" onChange={(_e, d) => d && onChange(iso(d))} /> : null}
    </>
  );
}

// ---------------------------------------------------------------- one field
export const kindOf = (f: Field): Field['type'] => (f.type === 'text' && DATE_NAME.test(f.name) && !f.name.endsWith('_id') ? 'date' : f.type);

function FieldInput({ field, value, onChange, error }: { field: Field; value: unknown; onChange: (v: unknown) => void; error?: string }) {
  const type = kindOf(field);
  const lookup = !!(field.lookup ?? LOOKUPS[field.name]) && (type === 'text' || type === 'select');
  const label = `${field.label}${field.required ? ' *' : ''}`;
  let input: React.ReactNode;
  if (type === 'boolean') {
    return (
      <View style={styles.switchRow}>
        <T small bold style={{ flex: 1 }}>{field.label}</T>
        <Switch value={!!value} onValueChange={onChange} trackColor={{ true: colors.primary }} />
      </View>
    );
  }
  if (lookup) input = <Lookup field={field} value={value} onChange={onChange} />;
  else if (type === 'select') input = <Select field={field} value={value} onChange={onChange} />;
  else if (type === 'date') input = <DateInput value={value} onChange={onChange} />;
  else if (type === 'file') input = <FilePick value={value as { name: string } | undefined} onChange={onChange} />;
  else if (type === 'rows') input = <RowsInput field={field} value={(value as Values[]) ?? []} onChange={onChange} />;
  else
    input = (
      <TextInput
        value={value === undefined || value === null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)}
        onChangeText={onChange}
        placeholder={type === 'list' ? 'Separate with commas' : type === 'json' ? '{ }' : ''}
        placeholderTextColor={colors.muted}
        keyboardType={type === 'number' ? 'decimal-pad' : 'default'}
        multiline={type === 'json'}
        style={[styles.input, type === 'json' && { minHeight: 90, textAlignVertical: 'top' }, error ? { borderColor: colors.danger } : null]}
      />
    );
  return (
    <View style={{ gap: 6 }}>
      <T small bold>{label}</T>
      {input}
      {error ? <T small style={{ color: colors.danger }}>{error}</T> : null}
    </View>
  );
}

function FilePick({ value, onChange }: { value?: { name: string }; onChange: (v: unknown) => void }) {
  return (
    <Pressable
      style={[styles.input, styles.dateRow]}
      onPress={async () => {
        const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
        if (!r.canceled && r.assets[0]) onChange({ uri: r.assets[0].uri, name: r.assets[0].name, type: r.assets[0].mimeType ?? 'application/octet-stream' });
      }}
    >
      <Text style={{ color: value ? colors.text : colors.muted, fontSize: 15 }}>{value ? value.name : 'Choose a file'}</Text>
      <FontAwesome6 name="paperclip" size={14} color={colors.muted} />
    </Pressable>
  );
}

function RowsInput({ field, value, onChange }: { field: Field; value: Values[]; onChange: (v: unknown) => void }) {
  const rows = value.length ? value : [{}];
  const set = (i: number, name: string, v: unknown) => onChange(rows.map((r, n) => (n === i ? { ...r, [name]: v } : r)));
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r, i) => (
        <View key={i} style={styles.rowBox}>
          <View style={styles.rowHead}>
            <T small bold>{field.label} {i + 1}</T>
            {rows.length > 1 ? <Pressable onPress={() => onChange(rows.filter((_x, n) => n !== i))} hitSlop={10}><FontAwesome6 name="trash" size={13} color={colors.danger} /></Pressable> : null}
          </View>
          {(field.fields ?? []).map((f) => <FieldInput key={f.name} field={f} value={r[f.name]} onChange={(v) => set(i, f.name, v)} />)}
        </View>
      ))}
      <Pressable onPress={() => onChange([...rows, {}])}><T small bold style={{ color: colors.primary }}>+ Add another</T></Pressable>
    </View>
  );
}

// ---------------------------------------------------------------- building the request body
function clean(fields: Field[], values: Values, errors: Record<string, string>, prefix = ''): Values {
  const out: Values = {};
  for (const f of fields) {
    const type = kindOf(f);
    const v = values[f.name];
    const key = prefix + f.name;
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
    if (type === 'boolean') { out[f.name] = !!v; continue; }
    if (empty) { if (f.required) errors[key] = `${f.label} is required`; continue; }
    if (type === 'number') { const n = Number(v); if (isNaN(n)) errors[key] = `${f.label} must be a number`; else out[f.name] = n; }
    else if (type === 'list') out[f.name] = String(v).split(',').map((s) => s.trim()).filter(Boolean);
    else if (type === 'json') { try { out[f.name] = typeof v === 'string' ? JSON.parse(v) : v; } catch { errors[key] = `${f.label} is not valid`; } }
    else if (type === 'rows') {
      const rows = (v as Values[]).map((r, i) => clean(f.fields ?? [], r, errors, `${key}.${i}.`)).filter((r) => Object.keys(r).length);
      if (!rows.length && f.required) errors[key] = `Add at least one ${f.label.toLowerCase()}`;
      out[f.name] = rows;
    } else out[f.name] = typeof v === 'string' ? v.trim() : v;
  }
  return out;
}

export interface FormResult { json?: Values; form?: FormData; query?: Values }

/** A sheet that asks for the body fields (and query values) of one operation, validates, and hands back the request parts. */
export function FormSheet({ visible, title, op, fields, queryFields, initial, submitLabel, onClose, onSubmit }: {
  visible: boolean; title: string; op: Op | null; fields: Field[]; queryFields?: Field[]; initial?: Row; submitLabel: string; onClose: () => void; onSubmit: (r: FormResult) => Promise<string | void>;
}) {
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [seeded, setSeeded] = useState<string | null>(null);

  // (re)seed whenever the sheet opens for a different operation or row
  const seed = `${op?.method} ${op?.path} ${visible} ${initial?.id ?? ''}`;
  if (visible && seeded !== seed) {
    const v: Values = {};
    [...fields, ...(queryFields ?? [])].forEach((f) => {
      const given = initial?.[f.name];
      v[f.name] = given !== undefined && given !== null ? (isObj(given) ? JSON.stringify(given) : given) : f.default;
    });
    setSeeded(seed); setValues(v); setErrors({}); setProblem('');
  }
  if (!visible && seeded !== null) setSeeded(null);

  const submit = async () => {
    const errs: Record<string, string> = {};
    const body = clean(fields, values, errs);
    const query = clean(queryFields ?? [], values, errs);
    setErrors(errs);
    if (Object.keys(errs).length) return setProblem('Please check the highlighted fields.');
    setBusy(true); setProblem('');
    try {
      let result: FormResult;
      if (op?.multipart) {
        const form = new FormData();
        Object.entries(body).forEach(([k, v]) => {
          if (v && typeof v === 'object' && 'uri' in (v as object)) form.append(k, v as unknown as Blob);
          else if (v !== undefined) form.append(k, String(v));
        });
        result = { form, query };
      } else result = { json: fields.length ? body : undefined, query };
      const err = await onSubmit(result);
      if (err) setProblem(err);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} title={title} onClose={onClose} onSubmit={() => void submit()} submitLabel={submitLabel} submitting={busy} error={problem}>
      {[...(queryFields ?? []), ...fields].map((f) => (
        <FieldInput key={f.name} field={op?.multipart && f.name === 'file' ? { ...f, type: 'file' } : f} value={values[f.name]} onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))} error={errors[f.name]} />
      ))}
      {!fields.length && !(queryFields ?? []).length ? <T muted>This will be done straight away. Press the button to confirm.</T> : null}
    </Sheet>
  );
}

export { Button, idOf };

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: colors.text, backgroundColor: colors.surface },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pick: { maxHeight: '75%', backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 12 },
  pickHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  search: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: colors.text },
  pickRow: { paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, gap: 10, backgroundColor: colors.bg },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
