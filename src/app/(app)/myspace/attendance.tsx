import { FontAwesome6 } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Heading, KV, Page, Panel, useEss } from '@/components/ess/kit';
import { colors, T } from '@/components/ui';

interface Month {
  year: number; month: number; days: number; weekdays: number[]; holidays: Record<string, string>;
  me: { cells: Record<string, string>; summary: Record<string, number> } | null;
}
const LOOK: Record<string, [string, string, string]> = {
  P: ['Present', colors.successBg, colors.successFg], A: ['Absent', '#FEE2E2', '#991B1B'], H: ['Half day', '#FEF3C7', '#92400E'], L: ['Leave', colors.infoBg, colors.infoFg],
  LOP: ['Unpaid leave', '#FFEDD5', '#9A3412'], WO: ['Week off', colors.neutralBg, colors.neutralFg], HD: ['Holiday', '#F3E8FF', '#6B21A8'],
};
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function Attendance() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
  const q = useEss<Month>('/ess/attendance', { year: ym.y, month: ym.m });
  const step = (d: number) => setYm((s) => { const t = new Date(s.y, s.m - 1 + d, 1); return { y: t.getFullYear(), m: t.getMonth() + 1 }; });
  const title = new Date(ym.y, ym.m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const d = q.data;
  const sum = d?.me?.summary;
  const lead = d ? d.weekdays[0] : 0;
  const cells: (number | null)[] = d ? [...Array(lead).fill(null), ...Array.from({ length: d.days }, (_x, i) => i + 1)] : [];
  const holidays = d ? Object.entries(d.holidays) : [];

  return (
    <Page q={q}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => step(-1)} hitSlop={12} style={{ padding: 8 }}><FontAwesome6 name="chevron-left" size={16} color={colors.text} /></Pressable>
        <T bold style={{ fontSize: 17 }}>{title}</T>
        <Pressable onPress={() => step(1)} hitSlop={12} style={{ padding: 8 }}><FontAwesome6 name="chevron-right" size={16} color={colors.text} /></Pressable>
      </View>
      {d && !d.me ? <T muted style={{ textAlign: 'center', marginTop: 30 }}>No attendance for this month.</T> : null}
      {d?.me && sum ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[['Present', sum.present + 0.5 * sum.half_day], ['Absent', sum.absent], ['Leave', sum.leave + sum.unpaid_leave], ['Paid days', sum.payable_days]].map(([k, v]) => (
              <View key={String(k)} style={{ flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 10, alignItems: 'center' }}>
                <T bold style={{ fontSize: 20 }}>{String(v)}</T>
                <T small muted>{String(k)}</T>
              </View>
            ))}
          </View>
          <Panel>
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              {WEEK.map((w, i) => <View key={i} style={{ width: `${100 / 7}%`, alignItems: 'center' }}><T small muted bold>{w}</T></View>)}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {cells.map((n, i) => {
                const code = n ? d.me!.cells[String(n)] : '';
                const look = code ? LOOK[code] : undefined;
                return (
                  <View key={i} style={{ width: `${100 / 7}%`, padding: 2 }}>
                    {n ? (
                      <View style={{ height: 44, borderRadius: 8, backgroundColor: look?.[1] ?? 'transparent', borderWidth: look ? 0 : 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: look?.[2] ?? colors.muted }}>{n}</Text>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: look?.[2] ?? colors.muted }}>{code}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </Panel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(LOOK).map(([c, [name, bg, fg]]) => (
              <View key={c} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: bg, borderWidth: 1, borderColor: fg }} />
                <T small muted>{c} {name}</T>
              </View>
            ))}
          </View>
          {sum.late_days || sum.overtime_minutes || sum.unmarked ? (
            <Panel>
              {sum.late_days ? <KV k="Days late" v={String(sum.late_days)} /> : null}
              {sum.overtime_minutes ? <KV k="Overtime" v={`${(sum.overtime_minutes / 60).toFixed(1)} h`} /> : null}
              {sum.unmarked ? <KV k="Days not marked yet" v={String(sum.unmarked)} /> : null}
            </Panel>
          ) : null}
          {holidays.length ? (
            <>
              <Heading>Holidays this month</Heading>
              <Panel>{holidays.map(([dd, name]) => <KV key={dd} k={`${dd} ${new Date(ym.y, ym.m - 1, 1).toLocaleDateString('en-IN', { month: 'short' })}`} v={name} />)}</Panel>
            </>
          ) : null}
        </>
      ) : null}
    </Page>
  );
}
