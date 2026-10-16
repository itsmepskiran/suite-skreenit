import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, colors, Field, Sheet, T } from '@/components/ui';
import { ApiError, createBranch, listBranches } from '@/lib/api';
import { useCan } from '@/lib/session';

export default function BranchesScreen() {
  const queryClient = useQueryClient();
  const canView = useCan('branches', 'view');
  const canCreate = useCan('branches', 'create');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [gstin, setGstin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({ queryKey: ['branches'], queryFn: listBranches, enabled: canView });
  const create = useMutation({
    mutationFn: () => createBranch({ name: name.trim(), state: state.trim() || undefined, gstin: gstin.trim() || undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['branches'] });
      setOpen(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to save'),
  });

  if (!canView) return <T muted style={styles.empty}>You do not have access to branches.</T>;

  const submit = () => {
    if (!name.trim()) return setError('Name is required');
    setError(null);
    create.mutate();
  };

  return (
    <View style={{ flex: 1 }}>
      {canCreate ? (
        <View style={{ padding: 20, paddingBottom: 0 }}>
          <Button title="Add branch" icon="plus" onPress={() => { setName(''); setState(''); setGstin(''); setError(null); setOpen(true); }} />
        </View>
      ) : null}
      {query.isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {(query.data?.data ?? []).length === 0 ? <T muted style={styles.empty}>No branches yet.</T> : null}
          {query.data?.data.map((b) => (
            <Card key={b.id}>
              <T bold>{b.name}</T>
              <T small muted>{[b.state, b.gstin].filter(Boolean).join(' · ') || '—'}</T>
              <Badge value={b.status} />
            </Card>
          ))}
        </ScrollView>
      )}
      <Sheet visible={open} title="New branch" onClose={() => setOpen(false)} onSubmit={submit} submitLabel="Save branch" submitting={create.isPending} error={error}>
        <Field label="Name" placeholder="e.g. Hyderabad HQ" value={name} onChangeText={setName} />
        <Field label="State" placeholder="e.g. Telangana" value={state} onChangeText={setState} />
        <Field label="GSTIN" autoCapitalize="characters" maxLength={15} value={gstin} onChangeText={setGstin} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, gap: 12 },
  empty: { textAlign: 'center', padding: 40 },
});
