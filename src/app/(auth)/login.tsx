import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, colors, Field, T } from '@/components/ui';
import { ApiError, login } from '@/lib/api';
import { WEBSITE_URL } from '@/lib/config';
import { useSession } from '@/lib/session';

export default function LoginScreen() {
  const signIn = useSession((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return setError('Enter your email and password');
    setError(null);
    setBusy(true);
    try {
      const res = await login(email.trim(), password);
      if (res.data.user.role === 'platform_admin') {
        // Skreenit staff register companies on the website; there is nothing for them on the phone.
        setError(`Staff accounts sign in on the website (${WEBSITE_URL}).`);
        return;
      }
      await signIn(res.data.access_token); // navigation follows the guard in app/_layout.tsx
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Image source={require('../../../assets/images/logo.webp')} style={styles.logo} resizeMode="contain" />
            <T title>Skreenit Suite</T>
            <T muted>Sign in to your company workspace</T>
            <Field label="Email" placeholder="you@company.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
            <Field label="Password" placeholder="••••••••" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} onSubmitEditing={submit} />
            {error ? <T small style={{ color: colors.danger }}>{error}</T> : null}
            <Button title="Sign in" icon="right-to-bracket" onPress={submit} loading={busy} />
            <T small muted style={{ textAlign: 'center' }}>Your login is created when Skreenit registers your company.</T>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 22, gap: 14 },
  logo: { width: 160, height: 44, alignSelf: 'center' },
});
