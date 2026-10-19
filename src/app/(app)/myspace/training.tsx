import { Empty, KV, Page, Panel, Pill, day, useEss } from '@/components/ess/kit';
import { T } from '@/components/ui';

interface Enrol { id: string; training: string; status: string; start_date: string; end_date: string; mode: string | null; location: string | null; trainer: string | null; score: number | null; feedback: string | null; certificate_no: string | null; valid_until: string | null }

export default function Training() {
  const q = useEss<Enrol[]>('/ess/training');
  return (
    <Page q={q}>
      {q.data && !q.data.length ? <Empty icon="graduation-cap" text="You have not been enrolled in any training." /> : null}
      {q.data?.map((t) => (
        <Panel key={t.id}>
          <T bold style={{ fontSize: 16 }}>{t.training}</T>
          <Pill value={t.status} />
          <KV k="When" v={t.start_date === t.end_date ? day(t.start_date) : `${day(t.start_date)} to ${day(t.end_date)}`} />
          {t.mode ? <KV k="Mode" v={t.mode.replace(/_/g, ' ')} /> : null}
          {t.location ? <KV k="Where" v={t.location} /> : null}
          {t.trainer ? <KV k="Trainer" v={t.trainer} /> : null}
          {t.score !== null ? <KV k="Score" v={String(t.score)} /> : null}
          {t.certificate_no ? <KV k="Certificate" v={t.certificate_no} /> : null}
          {t.valid_until ? <KV k="Valid until" v={day(t.valid_until)} /> : null}
          {t.feedback ? <T small muted>{t.feedback}</T> : null}
        </Panel>
      ))}
    </Page>
  );
}
