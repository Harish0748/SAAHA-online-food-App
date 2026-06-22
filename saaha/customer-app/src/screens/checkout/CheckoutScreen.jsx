import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import RazorpayCheckout from 'react-native-razorpay';
import api from '../../api/client';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

export default function CheckoutScreen({ navigation }) {
  const { items, restaurantId, restaurantName, itemTotal, clearCart } = useCart();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [loadingAddr, setLoadingAddr] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [pricing, setPricing] = useState({ delivery_fee: 40, platform_fee: 0, handling_fee: 0 });

  const loadAddresses = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/customer/addresses');
      setAddresses(data.addresses);
      const def = data.addresses.find((a) => a.is_default) || data.addresses[0];
      if (def) setSelectedAddress(def);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoadingAddr(false);
    }
  }, []);

  const loadPricing = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/pricing/current');
      setPricing(data.pricing);
    } catch (err) {
      // fall back to defaults already set
    }
  }, []);

  useEffect(() => {
    loadAddresses();
    loadPricing();
    // Refresh address list when returning from AddressForm
    const unsub = navigation.addListener('focus', loadAddresses);
    return unsub;
  }, [loadAddresses, loadPricing, navigation]);

  const totalAmount = itemTotal + pricing.delivery_fee + pricing.platform_fee + pricing.handling_fee;

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Address required', 'Please add a delivery address to continue.');
      return;
    }
    setPlacing(true);

    try {
      // 1. Create Razorpay payment order on backend
      const { data: payData } = await api.post('/payments/create-order', {
        amount: totalAmount,
        purpose: 'food_order',
      });

      let paymentResult = null;

      if (payData.demo_mode) {
        // Backend has no real Razorpay keys configured — skip native checkout, simulate success
        paymentResult = { razorpay_payment_id: `demo_pay_${Date.now()}` };
      } else {
        // 2. Open native Razorpay checkout
        paymentResult = await RazorpayCheckout.open({
          key: payData.payment_order.key,
          amount: payData.payment_order.amount,
          currency: 'INR',
          order_id: payData.payment_order.id,
          name: 'SAAHA',
          description: `Order from ${restaurantName}`,
          prefill: { contact: user?.phone, name: user?.name },
          theme: { color: '#1D9E75' },
        });
      }

      // 3. Verify payment on backend
      await api.post('/payments/verify', {
        razorpay_order_id: payData.payment_order.id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
        demo_mode: payData.demo_mode,
      });

      // 4. Place the actual order
      const { data: orderData } = await api.post('/orders', {
        restaurant_id: restaurantId,
        items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
        delivery_address: selectedAddress,
        payment_method: 'upi',
        delivery_instructions: instructions,
      });

      clearCart();
      navigation.replace('OrderTracking', { orderId: orderData.order.id });
    } catch (err) {
      if (err?.code === 2 || err?.description) {
        // Razorpay cancellation / failure shape
        Alert.alert('Payment failed', err.description || 'Payment was cancelled.');
      } else {
        Alert.alert('Order failed', err.response?.data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 140 }}>
        <Text style={styles.sectionTitle}>Delivery address</Text>
        {loadingAddr ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
        ) : addresses.length === 0 ? (
          <TouchableOpacity style={styles.addAddressBtn} onPress={() => navigation.navigate('AddressForm', { onSaved: setSelectedAddress })}>
            <Icon name="plus-circle" size={18} color={COLORS.primary} />
            <Text style={styles.addAddressText}>Add a delivery address</Text>
          </TouchableOpacity>
        ) : (
          <>
            {addresses.map((addr) => (
              <TouchableOpacity
                key={addr.id}
                style={[styles.addressCard, selectedAddress?.id === addr.id && styles.addressCardActive]}
                onPress={() => setSelectedAddress(addr)}
              >
                <Icon name="map-pin" size={16} color={selectedAddress?.id === addr.id ? COLORS.primary : COLORS.textSecondary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.addressLabel}>{addr.label}</Text>
                  <Text style={styles.addressText}>{addr.flat}, {addr.street}, {addr.city} - {addr.pincode}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addAddressBtn} onPress={() => navigation.navigate('AddressForm', { onSaved: setSelectedAddress })}>
              <Icon name="plus" size={16} color={COLORS.primary} />
              <Text style={styles.addAddressText}>Add new address</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.sectionTitle}>Delivery instructions (optional)</Text>
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsPlaceholder} onPress={() => {}}>
            {instructions || 'e.g. Ring the bell, leave at door…'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Order summary — {restaurantName}</Text>
        {items.map((i) => (
          <View key={i.id} style={styles.summaryItemRow}>
            <Text style={styles.summaryItemName}>{i.name} × {i.quantity}</Text>
            <Text style={styles.summaryItemPrice}>₹{i.price * i.quantity}</Text>
          </View>
        ))}

        <View style={styles.divider} />
        <Row label="Item total" value={`₹${itemTotal}`} />
        <Row label="Delivery fee" value={`₹${pricing.delivery_fee}`} />
        <Row label="Platform fee" value={`₹${pricing.platform_fee}`} green />
        <Row label="Handling fee" value={`₹${pricing.handling_fee}`} green />
        <View style={styles.divider} />
        <Row label="Total payable" value={`₹${totalAmount}`} bold />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.payBtn} onPress={handlePlaceOrder} disabled={placing || !selectedAddress}>
          {placing ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.payBtnText}>Pay ₹{totalAmount} & place order</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, bold, green }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold, green && { color: COLORS.success }]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold, green && { color: COLORS.success }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  sectionTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, marginTop: SPACING.lg, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.3 },
  addressCard: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, marginBottom: SPACING.sm, backgroundColor: COLORS.card },
  addressCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  addressLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  addressText: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  addAddressBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: RADIUS.md, justifyContent: 'center' },
  addAddressText: { color: COLORS.primary, fontWeight: '600', fontSize: FONT_SIZE.sm },
  instructionsBox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, backgroundColor: COLORS.card },
  instructionsPlaceholder: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  summaryItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryItemName: { fontSize: FONT_SIZE.sm, color: COLORS.text },
  summaryItemPrice: { fontSize: FONT_SIZE.sm, color: COLORS.text },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  rowValue: { fontSize: FONT_SIZE.sm, color: COLORS.text },
  bold: { fontWeight: '700', fontSize: FONT_SIZE.base, color: COLORS.text },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border, padding: SPACING.lg },
  payBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  payBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.base },
});
