import { FontAwesome6 } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

export const colors = {
  primary: '#4F46E5',
  bg: '#F4F6F9',
  surface: '#FFFFFF',
  border: '#E2E6ED',
  text: '#1C2333',
  muted: '#6B7280',
  danger: '#B91C1C',
  successBg: '#DCFCE7',
  successFg: '#166534',
  neutralBg: '#F1F5F9',
  neutralFg: '#475569',
  infoBg: '#E0E7FF',
  infoFg: '#3730A3',
};

export function T({ children, style, bold, small, muted, title, selectable }: { children: ReactNode; style?: object; bold?: boolean; small?: boolean; muted?: boolean; title?: boolean; selectable?: boolean }) {
  return (
    <Text
      selectable={selectable}
      style={[
        { color: muted ? colors.muted : colors.text, fontSize: small ? 13 : 15 },
        bold && { fontWeight: '600' },
        title && { fontSize: 22, fontWeight: '700' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Button({ title, onPress, loading, icon }: { title: string; onPress: () => void; loading?: boolean; icon?: React.ComponentProps<typeof FontAwesome6>['name'] }) {
  return (
    <Pressable onPress={onPress} disabled={loading} style={[styles.button, loading && { opacity: 0.7 }]}>
      {loading ? <ActivityIndicator color="#fff" /> : icon ? <FontAwesome6 name={icon} size={14} color="#fff" /> : null}
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, error, ...input }: { label: string; error?: string } & TextInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <T small bold>{label}</T>
      <TextInput placeholderTextColor={colors.muted} {...input} style={[styles.input, error ? { borderColor: colors.danger } : null]} />
      {error ? <T small style={{ color: colors.danger }}>{error}</T> : null}
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const BADGE: Record<string, [string, string]> = {
  active: [colors.successBg, colors.successFg],
  inactive: [colors.neutralBg, colors.neutralFg],
  owner: [colors.infoBg, colors.infoFg],
  admin: [colors.infoBg, colors.infoFg],
  user: [colors.neutralBg, colors.neutralFg],
};
export function Badge({ value }: { value: string }) {
  const [bg, fg] = BADGE[value] ?? BADGE.user;
  return (
    <View style={{ backgroundColor: bg, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{value.replace(/^./, (c) => c.toUpperCase())}</Text>
    </View>
  );
}

export function Sheet({ visible, title, onClose, onSubmit, submitLabel, submitting, error, children }: { visible: boolean; title: string; onClose: () => void; onSubmit: () => void; submitLabel: string; submitting?: boolean; error?: string | null; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <T title>{title}</T>
            <Pressable onPress={onClose} hitSlop={12}><FontAwesome6 name="xmark" size={18} color={colors.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
            {children}
            {error ? <T small style={{ color: colors.danger }}>{error}</T> : null}
            <Button title={submitLabel} onPress={onSubmit} loading={submitting} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: colors.text, backgroundColor: colors.surface },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18 },
});

/** A bottom sheet with a title and scrolling content (no built-in submit button). */
export function Panel({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <T title style={{ flex: 1, fontSize: 18 }}>{title}</T>
            <Pressable onPress={onClose} hitSlop={12}><FontAwesome6 name="xmark" size={18} color={colors.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}
