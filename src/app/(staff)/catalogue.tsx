import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Card, colors, T } from '@/components/ui';
import { callApi } from '@/lib/api';
import { AREA_LABEL, AREA_ORDER } from '@/lib/schema';

interface Mod { key: string; label: string; area: string; built: boolean; always_on: boolean; companies: { id: string; name: string }[] }

// Every module in the Suite, whether it is built, and which companies have it on.
export default function Catalogue() {
  const q = useQuery({ queryKey: ['staff', 'catalogue'], queryFn: async () => (await callApi('GET', '/platform/modules')) as Mod[] });
  const rows = q.data ?? [];
  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={q.isFetching && !q.isLoading} onRefresh={() => void q.refetch()} />}>
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {AREA_ORDER.map((area) => {
        const mods = rows.filter((m) => m.area === area);
        if (!mods.length) return null;
        return (
          <View key={area} style={{ gap: 8 }}>
            <T bold muted small>{(AREA_LABEL[area] ?? area).toUpperCase()}</T>
            {mods.map((m) => (
              <Card key={m.key}>
                <T bold>{m.label}</T>
                <T small muted>
                  {m.always_on ? 'Included for every company' : m.built ? `${m.companies.length} ${m.companies.length === 1 ? 'company' : 'companies'}${m.companies.length ? ': ' + m.companies.map((c) => c.name).join(', ') : ''}` : 'Not built yet'}
                </T>
              </Card>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: 16, gap: 16 } });
