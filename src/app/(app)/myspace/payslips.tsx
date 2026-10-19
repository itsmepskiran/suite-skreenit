import { FontAwesome6 } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { View } from 'react-native';

import { Empty, KV, Page, Panel, rupees, useEss } from '@/components/ess/kit';
import { colors, T } from '@/components/ui';

export default function Payslips() {
  const router = useRouter();
  const q = useEss<{ run_id: string; label: string; gross: number; total_deductions: number; net: number }[]>('/ess/payslips');
  return (
    <Page q={q}>
      {q.data && !q.data.length ? <Empty icon="file-invoice-dollar" text="No payslips yet. They appear here once your company finalises the month's payroll." /> : null}
      {q.data?.map((p) => (
        <Panel key={p.run_id} onPress={() => router.push(`/myspace/payslip/${p.run_id}` as Href)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T bold style={{ fontSize: 16 }}>{p.label}</T>
            <FontAwesome6 name="chevron-right" size={13} color={colors.muted} />
          </View>
          <KV k="Take-home" v={rupees(p.net)} bold color={colors.successFg} />
          <KV k="Gross" v={rupees(p.gross)} />
          <KV k="Deductions" v={rupees(p.total_deductions)} />
        </Panel>
      ))}
    </Page>
  );
}
