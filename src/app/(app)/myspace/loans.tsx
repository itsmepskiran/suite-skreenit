import { View } from 'react-native';

import { Bar, day, Empty, KV, Page, Panel, Pill, rupees, useEss } from '@/components/ess/kit';
import { T } from '@/components/ui';

interface Loan { id: string; kind: string; principal: number; total_repayable: number; installments: number; emi: number; start: string; issued_on: string; reason: string | null; status: string; repaid: number; outstanding: number }

export default function Loans() {
  const q = useEss<Loan[]>('/ess/loans');
  return (
    <Page q={q}>
      {q.data && !q.data.length ? <Empty icon="hand-holding-dollar" text="You have no loans or advances." /> : null}
      {q.data?.map((l) => (
        <Panel key={l.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T bold style={{ fontSize: 16 }}>{l.kind.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())} of {rupees(l.principal)}</T>
            <Pill value={l.status} />
          </View>
          <T small muted>Still to pay</T>
          <T bold style={{ fontSize: 24 }}>{rupees(l.outstanding)}</T>
          <Bar pct={l.total_repayable ? (l.repaid / l.total_repayable) * 100 : 0} />
          <KV k="Repaid so far" v={rupees(l.repaid)} />
          <KV k="Monthly deduction" v={`${rupees(l.emi)} × ${l.installments}`} />
          <KV k="Deductions start" v={l.start} />
          <KV k="Given on" v={day(l.issued_on)} />
          {l.reason ? <T small muted>{l.reason}</T> : null}
        </Panel>
      ))}
    </Page>
  );
}
