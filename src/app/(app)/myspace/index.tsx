import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Heading, initials, KV, Page, Panel, rupees, useEss } from '@/components/ess/kit';
import { colors, T } from '@/components/ui';
import { callApi } from '@/lib/api';

interface Home {
  company: string;
  employee: { id: string; name: string; emp_code: string; designation: string | null; department: string | null; branch: string | null; manager: string | null; doj: string | null };
  sections: Record<string, boolean>;
}
type Icon = React.ComponentProps<typeof FontAwesome6>['name'];
const TILES: { key: string; label: string; hint: string; icon: Icon; href: string }[] = [
  { key: 'payroll', label: 'Payslips', hint: 'Monthly salary slips', icon: 'file-invoice-dollar', href: '/myspace/payslips' },
  { key: 'leave', label: 'Leave', hint: 'Balance and requests', icon: 'umbrella-beach', href: '/myspace/leave' },
  { key: 'attendance', label: 'Attendance', hint: 'This month at a glance', icon: 'calendar-check', href: '/myspace/attendance' },
  { key: 'expense_claims', label: 'Expense claims', hint: 'Claim and track', icon: 'receipt', href: '/myspace/expenses' },
  { key: 'loans', label: 'Loans', hint: 'Balance and EMI', icon: 'hand-holding-dollar', href: '/myspace/loans' },
  { key: 'performance', label: 'Performance', hint: 'Goals and reviews', icon: 'bullseye', href: '/myspace/performance' },
  { key: 'training', label: 'Training', hint: 'Sessions and certificates', icon: 'graduation-cap', href: '/myspace/training' },
];

export default function MySpaceHome() {
  const router = useRouter();
  const q = useEss<Home>('/ess/home');
  const shown = TILES.filter((t) => q.data?.sections?.[t.key]);
  // Two small look-aheads for the cards below the header; they only run for sections that are switched on.
  const slips = useQuery({ queryKey: ['ess', 'summary-payslips'], enabled: !!q.data?.sections?.payroll, queryFn: () => callApi('GET', '/ess/payslips') as Promise<{ run_id: string; label: string; net: number }[]> });
  const leave = useQuery({ queryKey: ['ess', 'summary-leave'], enabled: !!q.data?.sections?.leave, queryFn: () => callApi('GET', '/ess/leave') as Promise<{ types: { id: string; name: string; available: number | null }[]; requests: { status: string }[] }> });
  const e = q.data?.employee;
  const latest = slips.data?.[0];
  const waiting = leave.data?.requests.filter((r) => r.status === 'pending').length ?? 0;

  return (
    <Page q={q}>
      {e ? (
        <>
          <Pressable onPress={() => router.push('/myspace/details' as Href)} style={{ backgroundColor: colors.primary, borderRadius: 18, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 21, fontWeight: '700' }}>{initials(e.name)}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: '#fff', fontSize: 19, fontWeight: '700' }} numberOfLines={1}>{e.name}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }} numberOfLines={1}>{[e.designation, e.department].filter(Boolean).join(' · ') || q.data?.company}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{e.emp_code} · {q.data?.company}</Text>
            </View>
            <FontAwesome6 name="chevron-right" size={14} color="rgba(255,255,255,0.7)" />
          </Pressable>

          {latest || waiting ? (
            <Panel>
              {latest ? <KV k={`Latest payslip, ${latest.label}`} v={rupees(latest.net)} bold /> : null}
              {waiting ? <KV k="Leave waiting for approval" v={String(waiting)} /> : null}
              {leave.data?.types.filter((t) => t.available !== null).slice(0, 3).map((t) => <KV key={t.id} k={`${t.name} left`} v={`${t.available} days`} />)}
            </Panel>
          ) : null}

          <Heading>Everything about me</Heading>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {shown.map((t) => (
              <Pressable key={t.key} onPress={() => router.push(t.href as Href)} style={({ pressed }) => [{ width: '48%', flexGrow: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 }, pressed && { opacity: 0.7 }]}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.infoBg, alignItems: 'center', justifyContent: 'center' }}>
                  <FontAwesome6 name={t.icon} size={17} color={colors.primary} />
                </View>
                <T bold>{t.label}</T>
                <T small muted>{t.hint}</T>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </Page>
  );
}
