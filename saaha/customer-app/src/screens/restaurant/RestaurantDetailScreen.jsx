import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import api from '../../api/client';
import { useCart } from '../../context/CartContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

export default function RestaurantDetailScreen({ route, navigation }) {
  const { restaurantId } = route.params;
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const { items, addItem, decreaseItem, itemCount, itemTotal, restaurantId: cartRestaurantId } = useCart();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/restaurants/${restaurantId}`);
        setRestaurant(data.restaurant);
        setMenu(data.menu.filter((c) => c.id));
      } catch (err) {
        console.warn(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [restaurantId]);

  const getQty = (itemId) => items.find((i) => i.id === itemId)?.quantity || 0;

  const handleAdd = (menuItem) => {
    addItem(
      { id: menuItem.id, name: menuItem.name, price: parseFloat(menuItem.discounted_price || menuItem.price) },
      restaurantId,
      restaurant.restaurant_name
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.empty}>Restaurant not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: itemCount > 0 ? 90 : SPACING.lg }}>
        <View style={styles.banner}><Text style={{ fontSize: 40 }}>🍽️</Text></View>

        <View style={styles.infoBlock}>
          <Text style={styles.name}>{restaurant.restaurant_name}</Text>
          <Text style={styles.meta}>{(restaurant.cuisine_types || []).join(', ') || restaurant.city}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaItem}>⭐ {restaurant.rating || 'New'} ({restaurant.total_ratings || 0})</Text>
            <Text style={styles.metaItem}><Icon name="clock" size={12} /> {restaurant.avg_prep_time} min</Text>
            <Text style={styles.metaItem}>₹40 delivery</Text>
          </View>
        </View>

        {menu.length === 0 && <Text style={styles.empty}>This restaurant hasn't added any menu items yet.</Text>}

        {menu.map((category) => (
          <View key={category.id} style={styles.categoryBlock}>
            <Text style={styles.categoryName}>{category.name}</Text>
            {(category.items || []).filter(Boolean).map((item) => {
              const qty = getQty(item.id);
              return (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.is_veg ? '🟢' : '🔴'} {item.name}</Text>
                    {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}
                    <Text style={styles.itemPrice}>
                      ₹{item.discounted_price || item.price}
                      {item.discounted_price && <Text style={styles.strikePrice}>  ₹{item.price}</Text>}
                    </Text>
                  </View>
                  {qty === 0 ? (
                    <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd(item)}>
                      <Text style={styles.addBtnText}>ADD</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.qtyControl}>
                      <TouchableOpacity onPress={() => decreaseItem(item.id)} style={styles.qtyBtn}>
                        <Icon name="minus" size={14} color={COLORS.primary} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{qty}</Text>
                      <TouchableOpacity onPress={() => handleAdd(item)} style={styles.qtyBtn}>
                        <Icon name="plus" size={14} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {itemCount > 0 && cartRestaurantId === restaurantId && (
        <TouchableOpacity style={styles.cartBar} onPress={() => navigation.navigate('Checkout')}>
          <Text style={styles.cartBarText}>{itemCount} item{itemCount > 1 ? 's' : ''} · ₹{itemTotal}</Text>
          <Text style={styles.cartBarAction}>View cart →</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  banner: { height: 130, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  infoBlock: { padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  name: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
  meta: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  metaItem: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  categoryBlock: { padding: SPACING.lg },
  categoryName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemName: { fontSize: FONT_SIZE.base, fontWeight: '500', color: COLORS.text },
  itemDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  itemPrice: { fontSize: FONT_SIZE.sm, color: COLORS.text, marginTop: 4, fontWeight: '600' },
  strikePrice: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, textDecorationLine: 'line-through' },
  addBtn: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: 6, paddingHorizontal: 16 },
  addBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: FONT_SIZE.sm },
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm, paddingHorizontal: 4 },
  qtyBtn: { padding: 8 },
  qtyText: { fontSize: FONT_SIZE.base, fontWeight: '600', color: COLORS.text, minWidth: 20, textAlign: 'center' },
  cartBar: {
    position: 'absolute', bottom: 12, left: SPACING.lg, right: SPACING.lg,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cartBarText: { color: COLORS.white, fontWeight: '600', fontSize: FONT_SIZE.base },
  cartBarAction: { color: COLORS.white, fontWeight: '600', fontSize: FONT_SIZE.base },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, padding: SPACING.lg },
});
