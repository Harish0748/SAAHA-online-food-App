import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import api from '../../api/client';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

export default function EarningsScreen() {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/rider/earnings');
      setEarnings(data.earnings);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading || !earnings) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACING.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        <View style={styles.walletCard}>
          <Text style={styles.walletLabel}>Wallet balance</Text>
          <Text style={styles.walletValue}>₹{earnings.wallet_balance.toLocaleString('en-IN')}</Text>
          <Text style={styles.walletSub}>Paid out weekly to your bank account</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Icon name="calendar" size={18} color={COLORS.primary} />
            <Text style={styles.statValue}>₹{earnings.today_earnings}</Text>
            <Text style={styles.statLabel}>Today's earnings</Text>
            <Text style={styles.statSub}>{earnings.today_deliveries} deliveries</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="trending-up" size={18} color={COLORS.primary} />
            <Text style={styles.statValue}>₹{earnings.week_earnings}</Text>
            <Text style={styles.statLabel}>This week</Text>
            <Text style={styles.statSub}>{earnings.week_deliveries} deliveries</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Icon name="package" size={18} color={COLORS.primary} />
            <Text style={styles.statValue}>{earnings.total_deliveries}</Text>
            <Text style={styles.statLabel}>Total deliveries</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="star" size={18} color="#F5A623" />
            <Text style={styles.statValue}>{earnings.rating || 'New'}</Text>
            <Text style={styles.statLabel}>Your rating</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How earnings work</Text>
          <View style={styles.infoRow}><Text style={styles.infoText}>• ₹32 per delivery, credited instantly to wallet</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoText}>• Weekly payout every Monday to your bank account</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoText}>• Peak hour bonuses applied automatically</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, paddingBottom: 0 },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
  walletCard: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.lg },
  walletLabel: { fontSize: FONT_SIZE.sm, color: COLORS.primaryLight },
  walletValue: { fontSize: 36, fontWeight: '700', color: COLORS.white, marginTop: 4 },
  walletSub: { fontSize: FONT_SIZE.xs, color: COLORS.primaryLight, marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md },
  statValue: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  statSub: { fontSize: FONT_SIZE.xs, color: COLORS.primary, marginTop: 2 },
  infoCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.sm },
  infoTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  infoRow: { marginBottom: 4 },
  infoText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
});
