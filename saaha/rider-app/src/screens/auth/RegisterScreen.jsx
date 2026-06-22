import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

const VEHICLE_TYPES = ['bike', 'scooter', 'bicycle'];

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    vehicle_type: 'bike', vehicle_number: '', dl_number: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const data = await register(form);
      if (data.success) {
        setSuccess(data.message);
        setTimeout(() => navigation.navigate('Login'), 2500);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>🏍️ Join as a delivery partner</Text>
        <Text style={styles.sub}>Earn ₹30–35 per delivery, paid weekly</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <Field label="Full name" value={form.name} onChangeText={update('name')} />
        <Field label="Email" value={form.email} onChangeText={update('email')} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Phone number" value={form.phone} onChangeText={update('phone')} keyboardType="phone-pad" maxLength={10} />
        <Field label="Password" value={form.password} onChangeText={update('password')} secureTextEntry />

        <Text style={styles.label}>Vehicle type</Text>
        <View style={styles.chipRow}>
          {VEHICLE_TYPES.map((v) => (
            <TouchableOpacity key={v} style={[styles.chip, form.vehicle_type === v && styles.chipActive]} onPress={() => update('vehicle_type')(v)}>
              <Text style={[styles.chipText, form.vehicle_type === v && styles.chipTextActive]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="Vehicle number" value={form.vehicle_number} onChangeText={update('vehicle_number')} placeholder="KA-01-AB-1234" autoCapitalize="characters" />
        <Field label="Driving licence number" value={form.dl_number} onChangeText={update('dl_number')} autoCapitalize="characters" />

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Submit application</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Already registered? <Text style={styles.link}>Log in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={COLORS.textSecondary} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl },
  logo: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.primaryDark, textAlign: 'center' },
  sub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: SPACING.xl },
  error: { color: COLORS.danger, backgroundColor: COLORS.dangerLight, padding: SPACING.sm, borderRadius: RADIUS.sm, marginBottom: SPACING.md, fontSize: FONT_SIZE.sm },
  success: { color: COLORS.success, backgroundColor: COLORS.successLight, padding: SPACING.sm, borderRadius: RADIUS.sm, marginBottom: SPACING.md, fontSize: FONT_SIZE.sm },
  label: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 5 },
  input: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 12, fontSize: FONT_SIZE.base, color: COLORS.text },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: COLORS.white, fontWeight: '600' },
  btn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', marginTop: SPACING.lg },
  btnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.base },
  linkRow: { marginTop: SPACING.lg, alignItems: 'center', marginBottom: SPACING.xl },
  linkText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  link: { color: COLORS.primary, fontWeight: '600' },
});
