import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      if (!data.success) setError(data.message || 'Login failed');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={styles.logo}>🏍️ SAAHA Partner</Text>
          <Text style={styles.sub}>Log in to start accepting deliveries</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={COLORS.textSecondary}
          />

          <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Log in</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>New partner? <Text style={styles.link}>Register here</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, justifyContent: 'center', padding: SPACING.xl },
  logo: { fontSize: FONT_SIZE.xxl, fontWeight: '700', color: COLORS.primaryDark, textAlign: 'center' },
  sub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: SPACING.xl },
  error: { color: COLORS.danger, backgroundColor: COLORS.dangerLight, padding: SPACING.sm, borderRadius: RADIUS.sm, marginBottom: SPACING.md, fontSize: FONT_SIZE.sm, textAlign: 'center' },
  label: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 5, marginTop: SPACING.md },
  input: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 12, fontSize: FONT_SIZE.base, color: COLORS.text },
  btn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', marginTop: SPACING.xl },
  btnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.base },
  linkRow: { marginTop: SPACING.lg, alignItems: 'center' },
  linkText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  link: { color: COLORS.primary, fontWeight: '600' },
});
