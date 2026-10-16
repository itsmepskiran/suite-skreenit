import { FontAwesome6 } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { colors, T } from '@/components/ui';
import { useSession } from '@/lib/session';

export default function AccountScreen() {
  const me = useSession((s) => s.me);
  const signOut = useSession((s) => s.signOut);

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You will need to sign in again to use Skreenit Suite.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <View style={styles.content}>
      <View style={{ gap: 4 }}>
        <T title>{me?.user.name}</T>
        <T muted>{me?.user.email}</T>
        <T muted>{me?.company.name} · {me?.user.role}</T>
      </View>
      <Pressable style={styles.logout} onPress={confirmLogout}>
        <FontAwesome6 name="right-from-bracket" size={14} color={colors.danger} />
        <T style={{ color: colors.danger }}>Log out</T>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 24 },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 14, backgroundColor: '#fff' },
});
