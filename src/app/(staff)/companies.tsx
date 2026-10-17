import { FontAwesome6 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { CompanySheet } from '@/components/staff/CompanySheet';
import { RegisterCompany } from '@/components/staff/RegisterCompany';
import type { CompanyRow } from '@/components/staff/types';
import { Badge, Button, Card, colors, T } from '@/components/ui';
import { callApi } from '@/lib/api';

export default function Companies() {
  const q = useQuery({ queryKey: ['staff', 'companies'], queryFn: async () => (await callApi('GET', '/platform/companies')) as CompanyRow[] });
  const [open, setOpen] = useState<CompanyRow | null>(null);
  const [registering, setRegistering] = useState(false);
  const rows = q.data ?? [];
  return (
    <>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={q.isFetching && !q.isLoading} onRefresh={() => void q.refetch()} />}>
        <Button title="Register a company" icon="plus" onPress={() => setRegistering(true)} />
        {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {q.error ? <T style={{ color: colors.danger }}>{(q.error as Error).message}</T> : null}
        {rows.map((c) => (
          <Pressable key={c.id} onPress={() => setOpen(c)}>
            <Card>
              <View style={styles.top}>
                <T bold style={{ flex: 1 }}>{c.name}</T>
                <FontAwesome6 name="chevron-right" size={13} color={colors.muted} />
              </View>
              <T small muted>{c.pack_label} · {c.user_count} users · {c.module_count} modules</T>
              <Badge value={c.status} />
            </Card>
          </Pressable>
        ))}
        {q.data && !rows.length ? <T muted>No companies are registered yet.</T> : null}
      </ScrollView>
      <CompanySheet company={open} onClose={() => setOpen(null)} />
      <RegisterCompany visible={registering} onClose={() => setRegistering(false)} />
    </>
  );
}

const styles = StyleSheet.create({ content: { padding: 16, gap: 12 }, top: { flexDirection: 'row', alignItems: 'center', gap: 8 } });
