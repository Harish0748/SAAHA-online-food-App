import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking, ScrollView, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import Geolocation from '@react-native-community/geolocation';
import { io } from 'socket.io-client';
import api from '../../api/client';
import { SOCKET_URL, GOOGLE_MAPS_DIRECTIONS_BASE } from '../../api/config';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

const NEXT_ACTION = {
  ready: { label: 'Confirm pickup', next: 'picked_up' },
  picked_up: { label: 'Mark delivered', next: 'delivered', needsOtp: true },
};

export default function HomeScreen() {
  const { rider, updateRider } = useAuth();
  const [isOnline, setIsOnline] = useState(rider?.is_online || false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpOrderId, setOtpOrderId] = useState(null);
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);

  const loadActive = useCallback(async () => {
    try {
      const { data } = await api.get('/rider/active');
      setActiveOrder(data.order);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActive();

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;
    if (rider?.id) socket.emit('join_rider', rider.id);

    socket.on('new_delivery', (data) => {
      setIncomingOrder(data);
    });

    return () => socket.disconnect();
  }, [loadActive, rider?.id]);

  // Send live location to backend + socket whenever online with an active delivery
  useEffect(() => {
    if (isOnline && activeOrder) {
      watchIdRef.current = Geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          api.patch('/auth/rider/location', { latitude, longitude }).catch(() => {});
          socketRef.current?.emit('rider_location', { orderId: activeOrder.id, lat: latitude, lng: longitude });
        },
        (err) => console.warn('Location error', err.message),
        { enableHighAccuracy: true, distanceFilter: 20, interval: 8000 }
      );
    }
    return () => {
      if (watchIdRef.current !== null) Geolocation.clearWatch(watchIdRef.current);
    };
  }, [isOnline, activeOrder]);

  const toggleOnline = async () => {
    setUpdating(true);
    Geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await api.patch('/auth/rider/online', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setIsOnline(data.is_online);
          updateRider({ is_online: data.is_online });
        } catch (err) {
          Alert.alert('Error', 'Could not update status');
        } finally {
          setUpdating(false);
        }
      },
      () => {
        Alert.alert('Location required', 'Please enable location services to go online.');
        setUpdating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const respondToOrder = async (accept) => {
    if (!incomingOrder) return;
    try {
      await api.patch(`/rider/${incomingOrder.order_id}/respond`, { accept });
      if (accept) {
        loadActive();
      }
      setIncomingOrder(null);
    } catch (err) {
      Alert.alert('Error', 'Could not respond to delivery request');
    }
  };

  const advanceOrder = async (orderId, nextStatus, needsOtp) => {
    if (needsOtp) {
      setOtpOrderId(orderId);
      setOtpValue('');
      setOtpModalVisible(true);
      return;
    }
    try {
      await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
      loadActive();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update order');
    }
  };

  const submitOtp = async () => {
    if (otpValue.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP from the customer.');
      return;
    }
    await confirmDelivery(otpOrderId, otpValue, 'delivered');
    setOtpModalVisible(false);
  };

  const confirmDelivery = async (orderId, otp, nextStatus) => {
    try {
      await api.post(`/orders/${orderId}/verify-otp`, { otp });
      await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
      Alert.alert('Delivered! 🎉', 'Great job — earnings added to your wallet.');
      setActiveOrder(null);
      loadActive();
    } catch (err) {
      Alert.alert('Invalid OTP', err.response?.data?.message || 'Please check the OTP and try again.');
    }
  };

  const openNavigation = (lat, lng, label) => {
    const url = `${GOOGLE_MAPS_DIRECTIONS_BASE}&destination=${lat},${lng}&travelmode=driving`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open Google Maps'));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {rider?.name?.split(' ')[0] || 'Partner'} 👋</Text>
          <Text style={styles.sub}>{isOnline ? 'You are online' : 'You are offline'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.toggleBtn, isOnline && styles.toggleBtnActive]}
          onPress={toggleOnline}
          disabled={updating || !!activeOrder}
        >
          {updating ? <ActivityIndicator color={COLORS.white} size="small" /> : (
            <Text style={styles.toggleBtnText}>{isOnline ? 'GO OFFLINE' : 'GO ONLINE'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        {incomingOrder && (
          <View style={styles.incomingCard}>
            <Text style={styles.incomingTitle}>🔔 New delivery request!</Text>
            <Text style={styles.incomingMeta}>Order #{incomingOrder.order_number} · Earn ₹{incomingOrder.earnings}</Text>
            <View style={styles.incomingActions}>
              <TouchableOpacity style={styles.declineBtn} onPress={() => respondToOrder(false)}>
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => respondToOrder(true)}>
                <Text style={styles.acceptBtnText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeOrder ? (
          <View style={styles.activeCard}>
            <Text style={styles.activeLabel}>Active delivery</Text>
            <Text style={styles.activeOrderNum}>Order #{activeOrder.order_number}</Text>

            <View style={styles.stopBlock}>
              <Icon name="shopping-bag" size={16} color={COLORS.primary} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.stopLabel}>Pickup from</Text>
                <Text style={styles.stopText}>{activeOrder.restaurant_name}</Text>
                <Text style={styles.stopAddress}>{activeOrder.restaurant_address}</Text>
              </View>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => openNavigation(activeOrder.restaurant_lat, activeOrder.restaurant_lng, activeOrder.restaurant_name)}
              >
                <Icon name="navigation" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.stopBlock}>
              <Icon name="map-pin" size={16} color={COLORS.danger} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.stopLabel}>Deliver to</Text>
                <Text style={styles.stopText}>{activeOrder.customer_name}</Text>
                <Text style={styles.stopAddress}>
                  {activeOrder.delivery_address?.flat}, {activeOrder.delivery_address?.street}, {activeOrder.delivery_address?.city}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => openNavigation(activeOrder.delivery_address?.latitude, activeOrder.delivery_address?.longitude, 'Customer')}
              >
                <Icon name="navigation" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${activeOrder.customer_phone}`)}>
              <Icon name="phone" size={14} color={COLORS.primary} />
              <Text style={styles.callBtnText}>Call customer</Text>
            </TouchableOpacity>

            {NEXT_ACTION[activeOrder.status] && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => advanceOrder(activeOrder.id, NEXT_ACTION[activeOrder.status].next, NEXT_ACTION[activeOrder.status].needsOtp)}
              >
                <Text style={styles.actionBtnText}>{NEXT_ACTION[activeOrder.status].label}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={{ fontSize: 40 }}>🏍️</Text>
            <Text style={styles.emptyTitle}>{isOnline ? 'Waiting for delivery requests…' : 'Go online to start receiving orders'}</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={otpModalVisible} transparent animationType="fade" onRequestClose={() => setOtpModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Enter delivery OTP</Text>
            <Text style={styles.modalSub}>Ask the customer for the 6-digit OTP shown in their app</Text>
            <TextInput
              style={styles.otpInput}
              value={otpValue}
              onChangeText={setOtpValue}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={COLORS.textSecondary}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setOtpModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={submitOtp}>
                <Text style={styles.modalConfirmText}>Confirm delivery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  greeting: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text },
  sub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  toggleBtn: { backgroundColor: COLORS.textSecondary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: RADIUS.full, minWidth: 110, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.xs },
  incomingCard: { backgroundColor: COLORS.warningLight, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg, borderWidth: 1, borderColor: '#F5C97B' },
  incomingTitle: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.warning },
  incomingMeta: { fontSize: FONT_SIZE.sm, color: COLORS.warning, marginTop: 4 },
  incomingActions: { flexDirection: 'row', gap: 10, marginTop: SPACING.md },
  declineBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.danger, borderRadius: RADIUS.sm, paddingVertical: 10, alignItems: 'center' },
  declineBtnText: { color: COLORS.danger, fontWeight: '600' },
  acceptBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: 10, alignItems: 'center' },
  acceptBtnText: { color: COLORS.white, fontWeight: '600' },
  activeCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  activeLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, textTransform: 'uppercase' },
  activeOrderNum: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  stopBlock: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  stopLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  stopText: { fontSize: FONT_SIZE.base, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  stopAddress: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  navBtn: { backgroundColor: COLORS.primary, padding: 10, borderRadius: RADIUS.full },
  callBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: 10, marginTop: SPACING.md },
  callBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: FONT_SIZE.sm },
  actionBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', marginTop: SPACING.md },
  actionBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.base },
  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary, marginTop: SPACING.md, textAlign: 'center', paddingHorizontal: SPACING.xl },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  modalBox: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.xl, width: '100%' },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  modalSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: SPACING.lg },
  otpInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 14, fontSize: FONT_SIZE.xl, textAlign: 'center', letterSpacing: 8, color: COLORS.text },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: SPACING.lg },
  modalCancelBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: 12, alignItems: 'center' },
  modalConfirmText: { color: COLORS.white, fontWeight: '600' },
});
