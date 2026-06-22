import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useCart } from '../../context/CartContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

const DELIVERY_FEE = 40;

export default function CartScreen({ navigation }) {
  const { items, restaurantName, addItem, decreaseItem, removeItem, itemTotal, itemCount, restaurantId } = useCart();

  if (itemCount === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 48 }}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Add items from a restaurant to get started</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('HomeTab')}>
            <Text style={styles.browseBtnText}>Browse restaurants</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }) => (
    <View style={styles.itemRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>₹{item.price} × {item.quantity}</Text>
      </View>
      <View style={styles.qtyControl}>
        <TouchableOpacity onPress={() => decreaseItem(item.id)} style={styles.qtyBtn}>
          <Icon name="minus" size={14} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity onPress={() => addItem(item, restaurantId, restaurantName)} style={styles.qtyBtn}>
          <Icon name="plus" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => removeItem(item.id)} style={{ marginLeft: 10 }}>
        <Icon name="trash-2" size={16} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your cart</Text>
        <Text style={styles.headerSub}>{restaurantName}</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: SPACING.lg }}
      />

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Item total</Text>
          <Text style={styles.summaryValue}>₹{itemTotal}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery fee</Text>
          <Text style={styles.summaryValue}>₹{DELIVERY_FEE}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: COLORS.success }]}>Platform fee</Text>
          <Text style={[styles.summaryValue, { color: COLORS.success }]}>₹0</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: COLORS.success }]}>Handling fee</Text>
          <Text style={[styles.summaryValue, { color: COLORS.success }]}>₹0</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>To pay</Text>
          <Text style={styles.totalValue}>₹{itemTotal + DELIVERY_FEE}</Text>
        </View>

        <TouchableOpacity style={styles.checkoutBtn} onPress={() => navigation.navigate('Checkout')}>
          <Text style={styles.checkoutBtnText}>Proceed to checkout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, paddingBottom: SPACING.sm },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.text, marginTop: SPACING.md },
  emptySub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  browseBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: 24, marginTop: SPACING.lg },
  browseBtnText: { color: COLORS.white, fontWeight: '600' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  itemName: { fontSize: FONT_SIZE.base, fontWeight: '500', color: COLORS.text },
  itemPrice: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm, paddingHorizontal: 4 },
  qtyBtn: { padding: 8 },
  qtyText: { fontSize: FONT_SIZE.base, fontWeight: '600', color: COLORS.text, minWidth: 20, textAlign: 'center' },
  summary: {
    backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border,
    padding: SPACING.lg, paddingBottom: SPACING.xl,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  summaryValue: { fontSize: FONT_SIZE.sm, color: COLORS.text },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm, marginTop: 4 },
  totalLabel: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.text },
  totalValue: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.text },
  checkoutBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', marginTop: SPACING.md },
  checkoutBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.base },
});
