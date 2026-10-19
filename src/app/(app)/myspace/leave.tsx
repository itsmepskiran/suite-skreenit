import { Pressable, View } from 'react-native';

import { Bar, confirmAction, day, Empty, Fab, Heading, KV, Page, Panel, Pill, shortDay, useEss, useEssForm } from '@/components/ess/kit';
import { colors, T } from '@/components/ui';
import { callApi } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface LType { id: string; name: string; paid: boolean; entitled: number | null; carried_forward: number; adjustments: number; taken: number; pending: number; available: number | null }
interface Req { id: string; leave_type: string; from_date: string; to_date: string; half_day: boolean; days: number; reason: string | null; status: string; decision_note: string | null; decided_by: string | null }

export default function Leave() {
  const qc = useQueryClient();
  const q = useEss<{ year: number; types: LType[]; requests: Req[] }>('/ess/leave');
  const apply = useEssForm('POST', '/ess/leave/requests', 'Apply for leave', 'Send for approval');
  const withdraw = (r: Req) => confirmAction('Withdraw request?', `${r.leave_type}, ${shortDay(r.from_date)} to ${shortDay(r.to_date)}`, () => callApi('POST', `/ess/leave/requests/${r.id}/cancel`), () => void qc.invalidateQueries({ queryKey: ['ess'] }));
  return (
    <>
      <Page q={q} fab={<Fab onPress={() => apply.open()} />}>
        {q.data ? (
          <>
            <Heading>Balance for {q.data.year}</Heading>
            {q.data.types.map((t) => {
              const total = (t.entitled ?? 0) + t.carried_forward + t.adjustments;
              const used = t.taken + t.pending;
              return (
                <Panel key={t.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <T bold style={{ fontSize: 16 }}>{t.name}</T>
                    <T bold style={{ fontSize: 18, color: colors.primary }}>{t.available === null ? 'No limit' : `${t.available} left`}</T>
                  </View>
                  {t.available !== null ? <Bar pct={total ? (used / total) * 100 : 0} /> : null}
                  <T small muted>
                    {t.available !== null ? `${total} in total` : 'Unlimited'} · {t.taken} taken{t.pending ? ` · ${t.pending} waiting` : ''}{t.paid ? '' : ' · unpaid'}
                  </T>
                </Panel>
              );
            })}
            <Heading>My requests</Heading>
            {!q.data.requests.length ? <Empty icon="umbrella-beach" text="You have not applied for leave yet. Tap + to apply." /> : null}
            {q.data.requests.map((r) => (
              <Panel key={r.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <T bold>{r.leave_type}</T>
                  <Pill value={r.status} />
                </View>
                <KV k={r.from_date === r.to_date ? 'On' : 'From to'} v={r.from_date === r.to_date ? day(r.from_date) : `${shortDay(r.from_date)} to ${day(r.to_date)}`} />
                <KV k="Days" v={`${r.days}${r.half_day ? ' (half day)' : ''}`} />
                {r.reason ? <T small muted>{r.reason}</T> : null}
                {r.decision_note ? <T small>{r.decided_by ? `${r.decided_by}: ` : ''}{r.decision_note}</T> : null}
                {r.status === 'pending' ? <Pressable onPress={() => withdraw(r)} hitSlop={8}><T small bold style={{ color: colors.danger }}>Withdraw request</T></Pressable> : null}
              </Panel>
            ))}
          </>
        ) : null}
      </Page>
      {apply.element}
    </>
  );
}
