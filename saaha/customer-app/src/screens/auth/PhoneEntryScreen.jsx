import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

export default function PhoneEntryScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { sendOtp } = useAuth();

  const handleContinue = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number');
      return;
    }
    setLoading(true);
    try {
      const result = await sendOtp(phone);
      navigation.navigate('OtpVerify', { phone, devOtp: result.dev_otp });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.content}>
          <Text style={styles.logo}>🍽️ SAAHA</Text>
          <Text style={styles.tagline}>Honest food delivery. Low fees, fast delivery.</Text>

          <Text style={styles.label}>Enter your mobile number</Text>
          <View style={styles.phoneRow}>
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
              style={styles.input}
              placeholder="98765 43210"
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (!phone || loading) && styles.buttonDisabled]}
            disabled={!phone || loading}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>{loading ? 'Sending OTP…' : 'Continue'}</Text>
          </TouchableOpacity>

          <Text style={styles.terms}>
            By continuing, you agree to SAAHA's Terms of Service and Privacy Policy.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: SPACING.xl, justifyContent: 'center' },
  logo: { fontSize: FONT_SIZE.xxl, fontWeight: '700', color: COLORS.primaryDark, textAlign: 'center' },
  tagline: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs, marginBottom: SPACING.xxl },
  label: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md,
  },
  countryCode: { fontSize: FONT_SIZE.md, color: COLORS.text, marginRight: SPACING.sm, fontWeight: '500' },
  input: { flex: 1, paddingVertical: SPACING.md, fontSize: FONT_SIZE.md, color: COLORS.text },
  button: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: SPACING.md,
    alignItems: 'center', marginTop: SPACING.xl,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: COLORS.white, fontSize: FONT_SIZE.md, fontWeight: '600' },
  terms: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.lg, lineHeight: 16 },
});
