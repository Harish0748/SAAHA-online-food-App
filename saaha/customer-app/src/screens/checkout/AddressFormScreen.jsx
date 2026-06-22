import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import Geolocation from '@react-native-community/geolocation';
import api from '../../api/client';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

export default function AddressFormScreen({ navigation, route }) {
  const onSaved = route.params?.onSaved;
  const [form, setForm] = useState({
    label: 'Home', flat: '', street: '', landmark: '', city: '', state: '', pincode: '',
  });
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const useCurrentLocation = () => {
    setLocating(true);
    Geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setError('Could not get location. Please enable location services.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const save = async () => {
    if (!form.flat || !form.street || !form.city || !form.pincode) {
      setError('Please fill flat/house, street, city and pincode.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/auth/customer/address', {
        ...form,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        is_default: true,
      });
      if (onSaved) onSaved(data.address);
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add delivery address</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.locationBtn} onPress={useCurrentLocation} disabled={locating}>
          {locating ? <ActivityIndicator color={COLORS.primary} /> : <Icon name="crosshair" size={16} color={COLORS.primary} />}
          <Text style={styles.locationBtnText}>{coords ? 'Location captured ✓' : 'Use current location'}</Text>
        </TouchableOpacity>

        <View style={styles.labelRow}>
          {['Home', 'Work', 'Other'].map((l) => (
            <TouchableOpacity key={l} style={[styles.labelChip, form.label === l && styles.labelChipActive]} onPress={() => update('label')(l)}>
              <Text style={[styles.labelChipText, form.label === l && styles.labelChipTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="Flat / House no." value={form.flat} onChangeText={update('flat')} />
        <Field label="Street / Area" value={form.street} onChangeText={update('street')} />
        <Field label="Landmark (optional)" value={form.landmark} onChangeText={update('landmark')} />
        <Field label="City" value={form.city} onChangeText={update('city')} />
        <Field label="State" value={form.state} onChangeText={update('state')} />
        <Field label="Pincode" value={form.pincode} onChangeText={update('pincode')} keyboardType="number-pad" maxLength={6} />

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save address'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={COLORS.textSecondary} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  error: { color: COLORS.danger, backgroundColor: COLORS.dangerLight, padding: SPACING.sm, borderRadius: RADIUS.sm, marginBottom: SPACING.md, fontSize: FONT_SIZE.sm },
  locationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.primary,
    borderRadius: RADIUS.md, padding: SPACING.md, justifyContent: 'center', marginBottom: SPACING.lg,
  },
  locationBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: FONT_SIZE.sm },
  labelRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.lg },
  labelChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  labelChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  labelChipText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  labelChipTextActive: { color: COLORS.white, fontWeight: '600' },
  field: { marginBottom: SPACING.md },
  fieldLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 5 },
  input: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 12, fontSize: FONT_SIZE.base, color: COLORS.text },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', marginTop: SPACING.md },
  saveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.base },
});
