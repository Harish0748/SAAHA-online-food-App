import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  const menuItems = [
    { icon: 'map-pin', label: 'Saved addresses', onPress: () => navigation.navigate('HomeTab', { screen: 'AddressForm' }) },
    { icon: 'list', label: 'Order history', onPress: () => navigation.navigate('Orders') },
    { icon: 'help-circle', label: 'Help & support', onPress: () => Alert.alert('Help', 'Contact support@saaha.in') },
    { icon: 'file-text', label: 'Terms & privacy policy', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Icon name="user" size={28} color={COLORS.primary} /></View>
          <Text style={styles.name}>{user?.name || 'SAAHA User'}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
        </View>

        <View style={styles.menuCard}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.menuItem} onPress={item.onPress}>
              <Icon name={item.icon} size={18} color={COLORS.textSecondary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Icon name="chevron-right" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <Icon name="log-out" size={18} color={COLORS.danger} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>SAAHA Customer App v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  profileCard: { alignItems: 'center', padding: SPACING.xl, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  name: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  phone: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  menuCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: SPACING.lg },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuLabel: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.text },
  logoutBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', padding: SPACING.md, borderWidth: 1, borderColor: COLORS.danger, borderRadius: RADIUS.md },
  logoutText: { color: COLORS.danger, fontWeight: '600', fontSize: FONT_SIZE.base },
  version: { textAlign: 'center', fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: SPACING.xl },
});
