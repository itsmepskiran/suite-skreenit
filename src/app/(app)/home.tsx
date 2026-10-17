import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Card, colors, T } from '@/components/ui';
import { callApi } from '@/lib/api';
import { isRows } from '@/lib/rows';
import { useSession } from '@/lib/session';

function Tile({ icon, title, sub, onPress }: { icon: React.ComponentProps<typeof FontAwesome6>['name']; title: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: '48%' }}>
      <Card>
        <FontAwesome6 name={icon} size={18} color={colors.primary} />
        <T bold>{title}</T>
        {sub ? <T small muted>{sub}</T> : null}
      </Card>
    </Pressable>
  );
}

export default function HomeScreen() {
  const me = useSession((s) => s.me);
  const canApprove = !!me?.rights?.approvals?.view;
  const pending = useQuery({ queryKey: ['home', 'approvals'], queryFn: () => callApi('GET', '/approvals', { query: { status: 'pending' } }), enabled: canApprove });
  const alerts = useQuery({ queryKey: ['home', 'alerts'], queryFn: () => callApi('GET', '/notifications', { query: { unread: true } }) });
  if (!me) return null;
  const count = (d: unknown) => (isRows(d) ? d.length : Array.isArray(d) ? 0 : isRows((d as { items?: unknown })?.items) ? (d as { items: unknown[] }).items.length : 0);
  const refresh = () => { void pending.refetch(); void alerts.refetch(); };

  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}>
      <View style={{ gap: 4 }}>
        <T title>Hello, {me.user.name.split(' ')[0]}</T>
        <T muted>{me.company.name}{me.company.sub_type_label ? ` · ${me.company.sub_type_label}` : ''}</T>
      </View>
      <View style={styles.grid}>
        <Tile icon="user-clock" title="My space" sub="Leave, payslips, claims" onPress={() => router.push('/myspace' as never)} />
        {canApprove ? <Tile icon="circle-check" title="Approvals" sub={`${count(pending.data)} waiting`} onPress={() => router.push('/modules/approvals' as never)} /> : null}
        <Tile icon="bell" title="Notifications" sub={`${count(alerts.data)} unread`} onPress={() => router.push('/modules/notifications' as never)} />
        <Tile icon="table-cells-large" title="All modules" sub={`${me.modules.filter((m) => m.enabled).length} switched on`} onPress={() => router.push('/modules' as never)} />
      </View>
      <T small muted>Pull down to refresh. Setting up modules and rights is done on the website.</T>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: 16, gap: 16 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } });
