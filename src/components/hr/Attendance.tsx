import { FontAwesome6 } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Bar, Empty, Heading, KV, Panel, Pill } from '@/components/ess/kit';
import { Button, colors, T } from '@/components/ui';
import { callApi } from '@/lib/api';
import { useSession } from '@/lib/session';

// Attendance for HR and managers: mark a day person by person, read the month register, see holidays and shifts.
type Status = 'present' | 'absent' | 'half_day' | 'leave' | 'unpaid_leave';
const CHIPS: { s: Status; code: string; label: string; bg: string; fg: string }[] = [
  { s: 'present', code: 'P', label: 'Present', bg: colors.successBg, fg: colors.successFg },
  { s: 'absent', code: 'A', label: 'Absent', bg: '#FEE2E2', fg: '#991B1B' },
  { s: 'half_day', code: 'H', label: 'Half day', bg: '#FEF3C7', fg: '#92400E' },
  { s: 'leave', code: 'L', label: 'Leave', bg: colors.infoBg, fg: colors.infoFg },
  { s: 'unpaid_leave', code: 'U', label: 'Unpaid leave', bg: '#FFEDD5', fg: '#9A3412' },
];
const CODE_LOOK: Record<string, [string, string]> = {
  P: [colors.successBg, colors.successFg], A: ['#FEE2E2', '#991B1B'], H: ['#FEF3C7', '#92400E'], L: [colors.infoBg, colors.infoFg],
  LOP: ['#FFEDD5', '#9A3412'], WO: [colors.neutralBg, colors.neutralFg], HD: ['#F3E8FF', '#6B21A8'],
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const pretty = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const hhmm = (m: number | null) => (m ? `${Math.floor(m / 60)}h ${m % 60}m` : '');

interface DayItem {
  employee_id: string; emp_code: string; name: string; designation: string | null; shift: string | null; shift_start: string | null; implicit: string | null;
  record: { status: Status | 'week_off' | 'holiday'; check_in: string | null; check_out: string | null; late_minutes: number; overtime_minutes: number } | null;
}
interface Day { date: string; holiday: string | null; items: DayItem[]; summary: { total: number; marked: number; unmarked: number } }
interface Month {
  year: number; month: number; days: number; weekdays: number[]; holidays: Record<string, string>;
  employees: { employee_id: string; emp_code: string; name: string; cells: Record<string, string>; summary: Record<string, number> }[];
}

function Tabs({ tabs, value, onChange }: { tabs: string[]; value: string; onChange: (t: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 4 }}>
      {tabs.map((t) => (
        <Pressable key={t} onPress={() => onChange(t)} style={[s.chip, t === value && s.chipOn]}>
          <Text style={{ color: t === value ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>{t}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------- one day
function DayTab({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const todayIso = iso(new Date());
  const [date, setDate] = useState(todayIso);
  const [edits, setEdits] = useState<Record<string, Status>>({});
  const [find, setFind] = useState('');
  const q = useQuery({ queryKey: ['att-day', date], queryFn: () => callApi('GET', '/attendance/day', { query: { date } }) as Promise<Day> });
  const move = (n: number) => { const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() + n); const v = iso(d); if (v <= todayIso) { setDate(v); setEdits({}); } };
  const save = useMutation({
    mutationFn: () => callApi('PUT', '/attendance/day', { json: { date, entries: Object.entries(edits).map(([employee_id, status]) => ({ employee_id, status })) } }) as Promise<{ saved: number; errors: { name?: string; error: string }[] }>,
    onSuccess: (r) => {
      setEdits({});
      void qc.invalidateQueries({ queryKey: ['att-day'] });
      void qc.invalidateQueries({ queryKey: ['att-month'] });
      if (r.errors.length) Alert.alert(`Saved ${r.saved}`, r.errors.map((e) => `${e.name ?? 'Someone'}: ${e.error}`).join('\n'));
    },
    onError: (e) => Alert.alert('Could not save', e instanceof Error ? e.message : 'Something went wrong'),
  });
  const items = useMemo(() => (q.data?.items ?? []).filter((i) => !find || `${i.name} ${i.emp_code}`.toLowerCase().includes(find.toLowerCase())), [q.data, find]);
  const pending = Object.keys(edits).length;
  const markAll = () => {
    const next = { ...edits };
    (q.data?.items ?? []).forEach((i) => { if (!i.record && !i.implicit && !next[i.employee_id]) next[i.employee_id] = 'present'; });
    setEdits(next);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.dateRow}>
        <Pressable onPress={() => move(-1)} hitSlop={12} style={{ padding: 8 }}><FontAwesome6 name="chevron-left" size={16} color={colors.text} /></Pressable>
        <View style={{ alignItems: 'center' }}>
          <T bold style={{ fontSize: 16 }}>{pretty(date)}</T>
          {date === todayIso ? <T small muted>Today</T> : <Pressable onPress={() => { setDate(todayIso); setEdits({}); }}><T small bold style={{ color: colors.primary }}>Go to today</T></Pressable>}
        </View>
        <Pressable onPress={() => move(1)} hitSlop={12} style={{ padding: 8, opacity: date >= todayIso ? 0.3 : 1 }}><FontAwesome6 name="chevron-right" size={16} color={colors.text} /></Pressable>
      </View>
      {q.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} /> : q.error ? (
        <View style={{ padding: 24, gap: 12 }}><T muted style={{ textAlign: 'center' }}>{q.error instanceof Error ? q.error.message : 'Something went wrong'}</T><Button title="Try again" onPress={() => void q.refetch()} /></View>
      ) : q.data ? (
        <>
          <View style={{ paddingHorizontal: 12, gap: 8 }}>
            {q.data.holiday ? <Pill value="holiday" label={`Holiday: ${q.data.holiday}`} /> : null}
            <Panel>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T small muted>{q.data.summary.marked} of {q.data.summary.total} marked</T>
                {q.data.summary.unmarked && canEdit ? <Pressable onPress={markAll} hitSlop={8}><T small bold style={{ color: colors.primary }}>Mark all unmarked present</T></Pressable> : null}
              </View>
              <Bar pct={q.data.summary.total ? (q.data.summary.marked / q.data.summary.total) * 100 : 0} />
            </Panel>
            <TextInput value={find} onChangeText={setFind} placeholder="Find a person" placeholderTextColor={colors.muted} style={s.search} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: pending ? 100 : 40 }} keyboardShouldPersistTaps="handled">
            {!items.length ? <Empty icon="users" text="Nobody is employed on this date." /> : null}
            {items.map((i) => {
              const cur = edits[i.employee_id] ?? (i.record && CHIPS.some((c) => c.s === i.record!.status) ? (i.record.status as Status) : null);
              const note = i.record
                ? [i.record.check_in && `In ${i.record.check_in}`, i.record.check_out && `Out ${i.record.check_out}`, i.record.late_minutes ? `Late ${hhmm(i.record.late_minutes)}` : '', i.record.overtime_minutes ? `OT ${hhmm(i.record.overtime_minutes)}` : ''].filter(Boolean).join(' · ')
                : i.implicit ? (i.implicit === 'week_off' ? 'Week off' : 'Holiday') : '';
              return (
                <Panel key={i.employee_id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <T bold>{i.name}</T>
                      <T small muted>{[i.emp_code, i.designation, i.shift && `${i.shift} ${i.shift_start ?? ''}`].filter(Boolean).join(' · ')}</T>
                    </View>
                    {!i.record && !edits[i.employee_id] ? <Pill value={i.implicit ?? 'pending'} label={i.implicit ? (i.implicit === 'week_off' ? 'Week off' : 'Holiday') : 'Not marked'} /> : null}
                  </View>
                  {note ? <T small muted>{note}</T> : null}
                  {canEdit ? (
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {CHIPS.map((c) => {
                        const on = cur === c.s;
                        return (
                          <Pressable key={c.s} onPress={() => setEdits((e) => ({ ...e, [i.employee_id]: c.s }))} style={[s.status, { backgroundColor: on ? c.fg : c.bg }]}>
                            <Text style={{ color: on ? '#fff' : c.fg, fontWeight: '700', fontSize: 12 }}>{c.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </Panel>
              );
            })}
          </ScrollView>
          {pending ? (
            <View style={s.saveBar}>
              <Pressable onPress={() => setEdits({})} hitSlop={8}><T bold muted>Clear</T></Pressable>
              <View style={{ flex: 1 }}><Button title={`Save ${pending} ${pending === 1 ? 'change' : 'changes'}`} onPress={() => save.mutate()} loading={save.isPending} /></View>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- the month register
function MonthTab() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
  const [open, setOpen] = useState<string | null>(null);
  const [find, setFind] = useState('');
  const q = useQuery({ queryKey: ['att-month', ym], queryFn: () => callApi('GET', '/attendance/month', { query: { year: ym.y, month: ym.m } }) as Promise<Month> });
  const step = (d: number) => setYm((x) => { const t = new Date(x.y, x.m - 1 + d, 1); return { y: t.getFullYear(), m: t.getMonth() + 1 }; });
  const title = new Date(ym.y, ym.m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const emps = (q.data?.employees ?? []).filter((e) => !find || `${e.name} ${e.emp_code}`.toLowerCase().includes(find.toLowerCase()));
  const lead = q.data ? q.data.weekdays[0] : 0;

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={s.dateRow}>
        <Pressable onPress={() => step(-1)} hitSlop={12} style={{ padding: 8 }}><FontAwesome6 name="chevron-left" size={16} color={colors.text} /></Pressable>
        <T bold style={{ fontSize: 16 }}>{title}</T>
        <Pressable onPress={() => step(1)} hitSlop={12} style={{ padding: 8 }}><FontAwesome6 name="chevron-right" size={16} color={colors.text} /></Pressable>
      </View>
      <TextInput value={find} onChangeText={setFind} placeholder="Find a person" placeholderTextColor={colors.muted} style={s.search} />
      {q.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} /> : q.error ? <T muted>{q.error instanceof Error ? q.error.message : 'Something went wrong'}</T> : null}
      {q.data && !emps.length ? <Empty icon="calendar" text="No one to show for this month." /> : null}
      {emps.map((e) => {
        const sm = e.summary;
        const isOpen = open === e.employee_id;
        return (
          <Panel key={e.employee_id} onPress={() => setOpen(isOpen ? null : e.employee_id)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <View style={{ flex: 1 }}><T bold>{e.name}</T><T small muted>{e.emp_code}</T></View>
              <View style={{ alignItems: 'flex-end' }}><T bold style={{ fontSize: 18, color: colors.primary }}>{sm.payable_days}</T><T small muted>paid days</T></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <T small>P {sm.present}</T><T small>A {sm.absent}</T><T small>L {sm.leave}</T>
              {sm.half_day ? <T small>H {sm.half_day}</T> : null}{sm.unpaid_leave ? <T small>U {sm.unpaid_leave}</T> : null}
              {sm.late_days ? <T small muted>{sm.late_days} late</T> : null}{sm.overtime_minutes ? <T small muted>OT {hhmm(sm.overtime_minutes)}</T> : null}
              {sm.unmarked ? <T small style={{ color: '#92400E' }}>{sm.unmarked} unmarked</T> : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
              {Array.from({ length: q.data!.days }, (_x, i) => String(i + 1)).map((n) => {
                const c = e.cells[n]; const look = c ? CODE_LOOK[c] : undefined;
                return <View key={n} style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: look?.[0] ?? colors.neutralBg, borderWidth: look ? 0 : StyleSheet.hairlineWidth, borderColor: colors.border }} />;
              })}
            </View>
            {isOpen ? (
              <View style={{ marginTop: 6 }}>
                <View style={{ flexDirection: 'row' }}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => <View key={i} style={{ width: `${100 / 7}%`, alignItems: 'center' }}><T small muted bold>{w}</T></View>)}</View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {[...Array(lead).fill(null), ...Array.from({ length: q.data!.days }, (_x, i) => i + 1)].map((n: number | null, i) => {
                    const c = n ? e.cells[String(n)] : ''; const look = c ? CODE_LOOK[c] : undefined;
                    return (
                      <View key={i} style={{ width: `${100 / 7}%`, padding: 2 }}>
                        {n ? <View style={{ height: 38, borderRadius: 7, backgroundColor: look?.[0] ?? 'transparent', borderWidth: look ? 0 : 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: look?.[1] ?? colors.muted }}>{n}</Text>
                          <Text style={{ fontSize: 8, fontWeight: '700', color: look?.[1] ?? colors.muted }}>{c}</Text>
                        </View> : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </Panel>
        );
      })}
      {q.data ? <T small muted>P present · A absent · H half day · L leave · U unpaid · WO week off · HD holiday. Tap a person for their calendar.</T> : null}
    </ScrollView>
  );
}

// ---------------------------------------------------------------- holidays and shifts (read-only on the phone)
function SetupTab() {
  const year = new Date().getFullYear();
  const hol = useQuery({ queryKey: ['att-holidays', year], queryFn: () => callApi('GET', '/holidays', { query: { year } }) as Promise<{ id: string; date: string; name: string }[]> });
  const shifts = useQuery({ queryKey: ['att-shifts'], queryFn: () => callApi('GET', '/shifts') as Promise<{ id: string; name: string; start_time: string; end_time: string; grace_minutes: number; week_off: number[]; is_default: boolean; employees?: number }[]> });
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}>
      <Heading>Shifts</Heading>
      {shifts.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {shifts.data?.map((sh) => (
        <Panel key={sh.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T bold>{sh.name}</T>{sh.is_default ? <Pill value="active" label="Default" /> : null}</View>
          <KV k="Hours" v={`${sh.start_time} to ${sh.end_time}`} />
          <KV k="Grace" v={`${sh.grace_minutes} min`} />
          <KV k="Weekly off" v={sh.week_off.length ? sh.week_off.map((d) => days[d]).join(', ') : 'None'} />
        </Panel>
      ))}
      <Heading>Holidays {year}</Heading>
      {hol.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {hol.data && !hol.data.length ? <T muted>No holidays added for this year.</T> : null}
      {hol.data ? <Panel>{hol.data.map((h) => <KV key={h.id} k={pretty(h.date)} v={h.name} />)}</Panel> : null}
      <T small muted>Adding shifts and holidays, importing a month and exporting the register are on the website for now.</T>
    </ScrollView>
  );
}

export default function AttendanceScreen() {
  const canEdit = useSession((x) => !!x.me?.rights?.attendance?.edit);
  const [tab, setTab] = useState('Day');
  return (
    <View style={{ flex: 1 }}>
      <Tabs tabs={['Day', 'Month', 'Shifts and holidays']} value={tab} onChange={setTab} />
      {tab === 'Day' ? <DayTab canEdit={canEdit} /> : tab === 'Month' ? <MonthTab /> : <SetupTab />}
    </View>
  );
}

const s = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6 },
  search: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: colors.text, backgroundColor: colors.surface },
  status: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  saveBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 16, padding: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
