import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { Badge, Card, colors, T } from '@/components/ui';
import { listUsers } from '@/lib/api';
import { useCan } from '@/lib/session';

// Read-only on the phone: creating users and editing rights is done on the website.
export default function TeamScreen() {
  const canView = useCan('users', 'view');
  const query = useQuery({ queryKey: ['users'], queryFn: listUsers, enabled: canView });

  if (!canView) return <T muted style={styles.empty}>You do not have access to the team list.</T>;
  if (query.isLoading) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {query.data?.data.map((u) => (
        <Card key={u.id}>
          <T bold>{u.name}</T>
          <T small muted>{u.email}</T>
          <Badge value={u.role} />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, gap: 12 },
  empty: { textAlign: 'center', padding: 40 },
});
