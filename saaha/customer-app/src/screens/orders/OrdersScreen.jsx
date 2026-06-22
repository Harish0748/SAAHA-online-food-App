import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import api from '../../api/client';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

const STATUS_COLORS = {
  pending: { bg: COLORS.warningLight, text: COLORS.warning },
  confirmed: { bg: '#E6F1FB', text: '#185FA5' },
  preparing: { bg: '#E6F1FB', text: '#185FA5' },
  ready: { bg: '#EEEDFE', text: '#3C3489' },
  picked_up: { bg: '#EEEDFE', text: '#3C3489' },
  delivered: { bg: COLORS.successLight, text: COLORS.success },
  cancelled: { bg: COLORS.dangerLight, text: COLORS.danger },
};

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/my');
      setOrders(data.orders);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const openOrder = (order) => {
    if (['pending', 'confirmed', 'preparing', 'ready', 'picked_up'].includes(order.status)) {
      navigation.navigate('HomeTab', { screen: 'OrderTracking', params: { orderId: order.id } });
    } else {
      navigation.navigate('HomeTab', { screen: 'OrderDetail', params: { orderId: order.id } });
    }
  };

  const renderItem = ({ item }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    const itemsList = typeof item.items === 'string' ? JSON.parse(item.items) : item.items;
    return (
      <TouchableOpacity style={styles.card} onPress={() => openOrder(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.restaurantName}>{item.restaurant_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>
        <Text style={styles.itemsPreview} numberOfLines={1}>
          {itemsList.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.orderMeta}>{new Date(item.placed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · ₹{item.total_amount}</Text>
          <Icon name="chevron-right" size={16} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your orders</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SPACING.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 40 }}>🧾</Text>
              <Text style={styles.empty}>No orders yet</Text>
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
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  restaurantName: { fontSize: FONT_SIZE.base, fontWeight: '600', color: COLORS.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: '600', textTransform: 'capitalize' },
  itemsPreview: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm },
  orderMeta: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  emptyWrap: { alignItems: 'center', marginTop: 60 },
  empty: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary, marginTop: SPACING.sm },
});
