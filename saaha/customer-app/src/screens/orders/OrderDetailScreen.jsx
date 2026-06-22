import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import api from '../../api/client';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/orders/${orderId}`);
        setOrder(data.order);
      } catch (err) {
        console.warn(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  if (loading || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  const itemsList = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  const isCancelled = order.status === 'cancelled';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.order_number}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        <View style={styles.statusCard}>
          <Icon name={isCancelled ? 'x-circle' : 'check-circle'} size={28} color={isCancelled ? COLORS.danger : COLORS.success} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.statusTitle}>{isCancelled ? 'Order cancelled' : 'Order delivered'}</Text>
            <Text style={styles.statusSub}>
              {new Date(order.delivered_at || order.cancelled_at || order.placed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{order.restaurant_name}</Text>
        <View style={styles.card}>
          {itemsList.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.name} × {item.quantity}</Text>
              <Text style={styles.itemPrice}>₹{item.subtotal}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <Row label="Item total" value={`₹${order.item_total}`} />
          <Row label="Delivery fee" value={`₹${order.delivery_fee}`} />
          <Row label="Platform fee" value={`₹${order.platform_fee}`} />
          <Row label="Handling fee" value={`₹${order.handling_fee}`} />
          <View style={styles.divider} />
          <Row label="Total paid" value={`₹${order.total_amount}`} bold />
        </View>

        <Text style={styles.sectionTitle}>Delivered to</Text>
        <View style={styles.card}>
          <Text style={styles.addressText}>
            {order.delivery_address?.flat}, {order.delivery_address?.street}, {order.delivery_address?.city} - {order.delivery_address?.pincode}
          </Text>
        </View>

        {!isCancelled && (
          <TouchableOpacity style={styles.reviewBtn} onPress={() => navigation.navigate('Review', { orderId: order.id })}>
            <Icon name="star" size={16} color={COLORS.white} />
            <Text style={styles.reviewBtnText}>Rate this order</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, bold }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.lg },
  statusTitle: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.text },
  statusSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.3 },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.lg },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  itemName: { fontSize: FONT_SIZE.sm, color: COLORS.text },
  itemPrice: { fontSize: FONT_SIZE.sm, color: COLORS.text },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  rowLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  rowValue: { fontSize: FONT_SIZE.sm, color: COLORS.text },
  bold: { fontWeight: '700', fontSize: FONT_SIZE.base, color: COLORS.text },
  addressText: { fontSize: FONT_SIZE.sm, color: COLORS.text, lineHeight: 20 },
  reviewBtn: { flexDirection: 'row', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xl },
  reviewBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.base },
});
