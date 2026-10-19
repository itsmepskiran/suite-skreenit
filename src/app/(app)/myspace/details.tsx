import { Page, KV, Panel, day, useEss, Heading } from '@/components/ess/kit';

interface Home {
  company: string;
  employee: { name: string; emp_code: string; designation: string | null; department: string | null; branch: string | null; manager: string | null; doj: string | null; email: string | null; phone: string | null; employment_type: string | null };
}

export default function Details() {
  const q = useEss<Home>('/ess/home');
  const e = q.data?.employee;
  return (
    <Page q={q}>
      {e ? (
        <>
          <Heading>Job</Heading>
          <Panel>
            <KV k="Employee code" v={e.emp_code} />
            <KV k="Designation" v={e.designation ?? '—'} />
            <KV k="Department" v={e.department ?? '—'} />
            <KV k="Branch" v={e.branch ?? '—'} />
            <KV k="Reports to" v={e.manager ?? '—'} />
            <KV k="Employment type" v={e.employment_type ? e.employment_type.replace(/_/g, ' ') : '—'} />
            <KV k="Joined on" v={day(e.doj)} />
            <KV k="Company" v={q.data?.company ?? '—'} />
          </Panel>
          <Heading>Contact</Heading>
          <Panel>
            <KV k="Email" v={e.email ?? '—'} />
            <KV k="Phone" v={e.phone ?? '—'} />
          </Panel>
        </>
      ) : null}
    </Page>
  );
}
