import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import api from '../../api/client';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

export default function HistoryScreen() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/rider/history');
      setDeliveries(data.deliveries);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon name="check" size={16} color={COLORS.success} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.restaurantName}>{item.restaurant_name}</Text>
        <Text style={styles.orderMeta}>
          Order #{item.order_number} · {new Date(item.delivered_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <Text style={styles.earnings}>+₹{item.rider_payout}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Delivery history</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SPACING.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 40 }}>📦</Text>
              <Text style={styles.empty}>No deliveries yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, paddingBottom: 0 },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  iconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.successLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  restaurantName: { fontSize: FONT_SIZE.base, fontWeight: '600', color: COLORS.text },
  orderMeta: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  earnings: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.success },
  emptyWrap: { alignItems: 'center', marginTop: 60 },
  empty: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary, marginTop: SPACING.sm },
});
