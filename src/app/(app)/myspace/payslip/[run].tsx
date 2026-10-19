import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Heading, KV, Page, Panel, rupees, useEss } from '@/components/ess/kit';
import { colors, T } from '@/components/ui';

interface Line { code?: string; name: string; amount: number }
interface Slip {
  gross: number; total_deductions: number; net: number; payable_days: number; days_divisor: number; overtime_minutes: number;
  earnings: Line[]; deductions: Line[]; employer_contributions: Line[];
  run: { label: string }; company: { name: string; address: string | null; gstin: string | null };
}

export default function Payslip() {
  const { run } = useLocalSearchParams<{ run: string }>();
  const q = useEss<Slip>(`/ess/payslips/${run}`);
  const s = q.data;
  return (
    <Page q={q}>
      <Stack.Screen options={{ title: s ? `Payslip, ${s.run.label}` : 'Payslip' }} />
      {s ? (
        <>
          <View style={{ backgroundColor: colors.primary, borderRadius: 18, padding: 18, gap: 4 }}>
            <T small style={{ color: 'rgba(255,255,255,0.8)' }}>Take-home for {s.run.label}</T>
            <T style={{ color: '#fff', fontSize: 30, fontWeight: '700' }}>{rupees(s.net)}</T>
            <T small style={{ color: 'rgba(255,255,255,0.8)' }}>{s.company.name}</T>
          </View>
          <Panel>
            <KV k="Days paid" v={`${s.payable_days} of ${s.days_divisor}`} />
            {s.overtime_minutes ? <KV k="Overtime" v={`${(s.overtime_minutes / 60).toFixed(1)} h`} /> : null}
          </Panel>
          <Heading>Earnings</Heading>
          <Panel>
            {s.earnings.map((l, i) => <KV key={i} k={l.name} v={rupees(l.amount)} />)}
            <KV k="Gross pay" v={rupees(s.gross)} bold />
          </Panel>
          <Heading>Deductions</Heading>
          <Panel>
            {s.deductions.length ? s.deductions.map((l, i) => <KV key={i} k={l.name} v={rupees(l.amount)} />) : <T small muted>None this month.</T>}
            <KV k="Total deductions" v={rupees(s.total_deductions)} bold />
          </Panel>
          {s.employer_contributions.length ? (
            <>
              <Heading>Paid by your employer</Heading>
              <Panel>{s.employer_contributions.map((l, i) => <KV key={i} k={l.name} v={rupees(l.amount)} />)}</Panel>
            </>
          ) : null}
        </>
      ) : null}
    </Page>
  );
}
