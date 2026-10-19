import { useQueryClient } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';

import { confirmAction, day, Empty, Fab, KV, Page, Panel, Pill, rupees, useEss, useEssForm } from '@/components/ess/kit';
import { colors, T } from '@/components/ui';
import { callApi } from '@/lib/api';

interface Claim { id: string; title: string; total: number; status: string; items: number; decision_note: string | null; paid_on: string | null; paid_ref: string | null; created_at: string | null }

export default function Expenses() {
  const qc = useQueryClient();
  const q = useEss<{ claims: Claim[] }>('/ess/expenses');
  const submit = useEssForm('POST', '/ess/expenses/claims', 'New expense claim', 'Submit claim');
  const withdraw = (c: Claim) => confirmAction('Withdraw claim?', `${c.title}, ${rupees(c.total)}`, () => callApi('POST', `/ess/expenses/claims/${c.id}/cancel`), () => void qc.invalidateQueries({ queryKey: ['ess'] }));
  return (
    <>
      <Page q={q} fab={<Fab onPress={() => submit.open()} />}>
        {q.data && !q.data.claims.length ? <Empty icon="receipt" text="No claims yet. Tap + to claim an expense." /> : null}
        {q.data?.claims.map((c) => (
          <Panel key={c.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <T bold style={{ flex: 1 }}>{c.title}</T>
              <Pill value={c.status} />
            </View>
            <KV k="Amount" v={rupees(c.total)} bold />
            <KV k="Submitted" v={day(c.created_at)} />
            {c.items ? <KV k="Expenses in claim" v={String(c.items)} /> : null}
            {c.paid_on ? <KV k="Paid on" v={`${day(c.paid_on)}${c.paid_ref ? ` · ${c.paid_ref}` : ''}`} /> : null}
            {c.decision_note ? <T small muted>{c.decision_note}</T> : null}
            {c.status === 'pending' ? <Pressable onPress={() => withdraw(c)} hitSlop={8}><T small bold style={{ color: colors.danger }}>Withdraw claim</T></Pressable> : null}
          </Panel>
        ))}
      </Page>
      {submit.element}
    </>
  );
}
