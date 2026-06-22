import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

export default function OtpVerifyScreen({ route, navigation }) {
  const { phone, devOtp } = route.params;
  const [otp, setOtp] = useState(devOtp || '');
  const [name, setName] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const { verifyOtp, sendOtp } = useAuth();

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit code sent to your phone');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOtp(phone, otp, name || undefined);
      if (!result.success) {
        Alert.alert('Verification failed', result.message || 'Invalid OTP');
      }
      // On success, AuthContext updates isAuthed and RootNavigator switches automatically
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed';
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        Alert.alert('Invalid or expired OTP', 'Please request a new code');
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await sendOtp(phone);
      setResendTimer(30);
      Alert.alert('OTP sent', 'A new code has been sent to your phone');
    } catch (err) {
      Alert.alert('Error', 'Could not resend OTP');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Verify your number</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code sent to +91 {phone}</Text>

        <TextInput
          style={styles.otpInput}
          placeholder="••••••"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
          autoFocus
        />

        {devOtp && (
          <Text style={styles.devHint}>Dev mode — OTP is pre-filled: {devOtp}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, (otp.length !== 6 || loading) && styles.buttonDisabled]}
          disabled={otp.length !== 6 || loading}
          onPress={handleVerify}
        >
          <Text style={styles.buttonText}>{loading ? 'Verifying…' : 'Verify & Continue'}</Text>
        </TouchableOpacity>

        <TouchableOpacity disabled={resendTimer > 0} onPress={handleResend} style={styles.resendRow}>
          <Text style={[styles.resendText, resendTimer > 0 && styles.resendDisabled]}>
            {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, paddingHorizontal: SPACING.xl, justifyContent: 'center' },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs, marginBottom: SPACING.xl },
  otpInput: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, fontSize: 24, textAlign: 'center', letterSpacing: 8, color: COLORS.text,
  },
  devHint: { fontSize: FONT_SIZE.xs, color: COLORS.warning, textAlign: 'center', marginTop: SPACING.sm },
  button: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: SPACING.md,
    alignItems: 'center', marginTop: SPACING.xl,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: COLORS.white, fontSize: FONT_SIZE.md, fontWeight: '600' },
  resendRow: { alignItems: 'center', marginTop: SPACING.lg },
  resendText: { color: COLORS.primary, fontSize: FONT_SIZE.base, fontWeight: '500' },
  resendDisabled: { color: COLORS.textSecondary },
});
