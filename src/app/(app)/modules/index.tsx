import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card, colors, T } from '@/components/ui';
import { allowed, AREA_LABEL, AREA_ORDER, buildModule, MODULE_INFO } from '@/lib/schema';
import { useSession } from '@/lib/session';

// Every module the company has switched on and this login may view, grouped like the website's menu.
export default function ModulesIndex() {
  const me = useSession((s) => s.me);
  const groups = useMemo(() => {
    if (!me) return [];
    const rights = me.rights;
    const usable = me.modules
      .filter((m) => m.enabled && rights[m.key]?.view)
      .map((m) => ({ key: m.key, label: m.label, area: MODULE_INFO[m.key]?.area ?? m.area, model: buildModule(m.key) }))
      .filter((m) => m.model.resources.some((r) => allowed(r.list, rights)) || m.model.files.length);
    return AREA_ORDER.map((area) => ({ area, items: usable.filter((m) => m.area === area) })).filter((g) => g.items.length);
  }, [me]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {groups.map((g) => (
        <View key={g.area} style={{ gap: 8 }}>
          <T bold muted small>{(AREA_LABEL[g.area] ?? g.area).toUpperCase()}</T>
          {g.items.map((m) => (
            <Pressable key={m.key} onPress={() => router.push(`/modules/${m.key}` as never)}>
              <Card>
                <View style={styles.row}>
                  <T bold style={{ flex: 1 }}>{m.label}</T>
                  <FontAwesome6 name="chevron-right" size={13} color={colors.muted} />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      ))}
      {!groups.length ? <T muted>No modules are available for this login yet. Ask your company owner to give you access.</T> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: 16, gap: 18 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 } });
