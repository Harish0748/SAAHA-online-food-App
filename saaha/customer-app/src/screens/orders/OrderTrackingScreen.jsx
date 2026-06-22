import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import MapView, { Marker } from 'react-native-maps';
import { io } from 'socket.io-client';
import api from '../../api/client';
import { SOCKET_URL } from '../../api/config';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

const STATUS_STEPS = [
  { key: 'confirmed', label: 'Order confirmed', icon: 'check-circle' },
  { key: 'preparing', label: 'Preparing your food', icon: 'clock' },
  { key: 'ready', label: 'Ready for pickup', icon: 'package' },
  { key: 'picked_up', label: 'Rider on the way', icon: 'truck' },
  { key: 'delivered', label: 'Delivered', icon: 'home' },
];

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [riderLocation, setRiderLocation] = useState(null);
  const socketRef = useRef(null);

  const loadOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setOrder(data.order);
      if (data.order.rider_lat && data.order.rider_lng) {
        setRiderLocation({ latitude: parseFloat(data.order.rider_lat), longitude: parseFloat(data.order.rider_lng) });
      }
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('join_order', orderId);

    socket.on('order_status_update', ({ status }) => {
      setOrder((prev) => (prev ? { ...prev, status } : prev));
    });

    socket.on('location_update', ({ lat, lng }) => {
      setRiderLocation({ latitude: lat, longitude: lng });
    });

    return () => socket.disconnect();
  }, [orderId, loadOrder]);

  if (loading || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.popToTop()}>
          <Icon name="x" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.order_number}</Text>
        <View style={{ width: 22 }} />
      </View>

      {riderLocation && !isCancelled && order.status === 'picked_up' && (
        <MapView
          style={styles.map}
          initialRegion={{ ...riderLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
          region={{ ...riderLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
        >
          <Marker coordinate={riderLocation} title="Your rider">
            <View style={styles.riderPin}><Icon name="navigation" size={16} color={COLORS.white} /></View>
          </Marker>
        </MapView>
      )}

      <View style={styles.content}>
        {isCancelled ? (
          <View style={styles.cancelledBox}>
            <Icon name="x-circle" size={32} color={COLORS.danger} />
            <Text style={styles.cancelledText}>This order was cancelled</Text>
            {order.cancel_reason && <Text style={styles.cancelledReason}>{order.cancel_reason}</Text>}
          </View>
        ) : (
          <View style={styles.timeline}>
            {STATUS_STEPS.map((step, idx) => {
              const done = idx <= currentStepIndex;
              return (
                <View key={step.key} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, done && styles.timelineDotActive]}>
                      <Icon name={step.icon} size={14} color={done ? COLORS.white : COLORS.textSecondary} />
                    </View>
                    {idx < STATUS_STEPS.length - 1 && <View style={[styles.timelineLine, done && idx < currentStepIndex && styles.timelineLineActive]} />}
                  </View>
                  <Text style={[styles.timelineLabel, done && styles.timelineLabelActive]}>{step.label}</Text>
                </View>
              );
            })}
          </View>
        )}

        {order.rider_name && order.status !== 'delivered' && !isCancelled && (
          <View style={styles.riderCard}>
            <View style={styles.riderAvatar}><Icon name="user" size={20} color={COLORS.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.riderName}>{order.rider_name}</Text>
              <Text style={styles.riderSub}>Your delivery partner</Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${order.rider_phone}`)}>
              <Icon name="phone" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.restaurantCard}>
          <Text style={styles.restaurantName}>{order.restaurant_name}</Text>
          <Text style={styles.orderTotal}>Total paid: ₹{order.total_amount}</Text>
        </View>

        {order.status === 'delivered' && (
          <TouchableOpacity style={styles.reviewBtn} onPress={() => navigation.navigate('Review', { orderId: order.id })}>
            <Text style={styles.reviewBtnText}>Rate your order</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  map: { height: 220, width: '100%' },
  riderPin: { backgroundColor: COLORS.primary, padding: 8, borderRadius: 20, borderWidth: 2, borderColor: COLORS.white },
  content: { padding: SPACING.lg },
  cancelledBox: { alignItems: 'center', padding: SPACING.xl, backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.md },
  cancelledText: { fontSize: FONT_SIZE.base, fontWeight: '600', color: COLORS.danger, marginTop: SPACING.sm },
  cancelledReason: { fontSize: FONT_SIZE.sm, color: COLORS.danger, marginTop: 4 },
  timeline: { marginBottom: SPACING.lg },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineLeft: { alignItems: 'center', marginRight: SPACING.md },
  timelineDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  timelineDotActive: { backgroundColor: COLORS.primary },
  timelineLine: { width: 2, height: 28, backgroundColor: COLORS.border },
  timelineLineActive: { backgroundColor: COLORS.primary },
  timelineLabel: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary, paddingTop: 4, paddingBottom: 20 },
  timelineLabelActive: { color: COLORS.text, fontWeight: '600' },
  riderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  riderAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  riderName: { fontSize: FONT_SIZE.base, fontWeight: '600', color: COLORS.text },
  riderSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  callBtn: { backgroundColor: COLORS.primary, padding: 10, borderRadius: RADIUS.full },
  restaurantCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md },
  restaurantName: { fontSize: FONT_SIZE.base, fontWeight: '600', color: COLORS.text },
  orderTotal: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 4 },
  reviewBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', marginTop: SPACING.lg },
  reviewBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.base },
});
