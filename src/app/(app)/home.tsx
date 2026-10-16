import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, T } from '@/components/ui';
import { WEBSITE_URL } from '@/lib/config';
import { useSession } from '@/lib/session';

export default function HomeScreen() {
  const me = useSession((s) => s.me);
  if (!me) return null;
  const enabled = me.modules.filter((m) => m.enabled);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={{ gap: 4 }}>
        <T title>Welcome, {me.user.name}</T>
        <T muted>
          {me.company.name} · {me.company.pack_label}
          {me.company.sub_type_label ? ` · ${me.company.sub_type_label}` : ''}
        </T>
      </View>
      <T bold>Your modules</T>
      <View style={styles.grid}>
        {enabled.map((m) => (
          <View key={m.key} style={styles.cell}>
            <Card>
              <T bold small>{m.label}</T>
              <T small muted>{m.available ? 'Ready' : 'Coming soon'}</T>
            </Card>
          </View>
        ))}
      </View>
      <T small muted>Switch modules on or off from the website: {WEBSITE_URL}</T>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47%' },
});
