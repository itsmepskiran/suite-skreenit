import { Pressable, View } from 'react-native';

import { Bar, day, Empty, Heading, KV, Page, Panel, Pill, useEss, useEssForm } from '@/components/ess/kit';
import { colors, T } from '@/components/ui';

interface Goal { id: string; title: string; description: string | null; weight: number; target: string | null; progress: number; due_date: string | null; status: string }
interface Review {
  id: string; cycle: string; cycle_status: string; status: string; reviewer: string | null; self_rating: number | null; self_comments: string | null;
  manager_rating: number | null; manager_comments: string | null; rating_label: string | null; goal_achievement: number | null; goals: Goal[];
}

export default function Performance() {
  const q = useEss<Review[]>('/ess/performance');
  const goal = useEssForm('PUT', '/ess/performance/goals/{goal_id}', 'Update progress', 'Save');
  const self = useEssForm('PUT', '/ess/performance/reviews/{review_id}/self', 'My self-review', 'Submit');
  return (
    <>
      <Page q={q}>
        {q.data && !q.data.length ? <Empty icon="bullseye" text="No review cycle includes you right now." /> : null}
        {q.data?.map((r) => (
          <View key={r.id} style={{ gap: 10 }}>
            <Heading>{r.cycle}</Heading>
            <Panel>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T bold>Review</T>
                <Pill value={r.status} />
              </View>
              {r.reviewer ? <KV k="Reviewer" v={r.reviewer} /> : null}
              {r.goal_achievement !== null ? <KV k="Goals achieved" v={`${Math.round(r.goal_achievement)}%`} /> : null}
              {r.self_rating ? <KV k="My rating" v={`${r.self_rating} of 5`} /> : null}
              {r.manager_rating ? <KV k="Manager's rating" v={`${r.manager_rating} of 5${r.rating_label ? ` · ${r.rating_label}` : ''}`} bold /> : null}
              {r.manager_comments ? <T small muted>{r.manager_comments}</T> : null}
              {r.status === 'pending' && r.cycle_status === 'active' ? (
                <Pressable onPress={() => self.open({ review_id: r.id })} hitSlop={8}><T small bold style={{ color: colors.primary }}>Write my self-review</T></Pressable>
              ) : null}
            </Panel>
            {r.goals.filter((g) => g.status === 'active').map((g) => (
              <Panel key={g.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <T bold style={{ flex: 1 }}>{g.title}</T>
                  <T bold style={{ color: colors.primary }}>{g.progress}%</T>
                </View>
                <Bar pct={g.progress} />
                {g.description ? <T small muted>{g.description}</T> : null}
                <T small muted>Weight {g.weight}%{g.target ? ` · Target ${g.target}` : ''}{g.due_date ? ` · Due ${day(g.due_date)}` : ''}</T>
                {r.status === 'pending' || r.status === 'self_submitted' ? (
                  <Pressable onPress={() => goal.open({ goal_id: g.id }, { progress: g.progress })} hitSlop={8}><T small bold style={{ color: colors.primary }}>Update progress</T></Pressable>
                ) : null}
              </Panel>
            ))}
          </View>
        ))}
      </Page>
      {goal.element}
      {self.element}
    </>
  );
}
