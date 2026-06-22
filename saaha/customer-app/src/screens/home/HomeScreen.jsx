import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/restaurants');
      setRestaurants(data.restaurants);
    } catch (err) {
      console.warn('Failed to load restaurants', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })}>
      <View style={styles.cardImage}>
        <Text style={{ fontSize: 32 }}>🍽️</Text>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>⭐ {item.rating || 'New'}</Text>
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.restaurant_name}</Text>
        <Text style={styles.cardMeta}>{(item.cuisine_types || []).join(', ') || item.city}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardTime}><Icon name="clock" size={12} /> {item.avg_prep_time} min</Text>
          <View style={styles.feePill}><Text style={styles.feeText}>₹40 delivery · no hidden fees</Text></View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good day{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋</Text>
          <Text style={styles.location}><Icon name="map-pin" size={12} color={COLORS.textSecondary} /> Deliver to current location</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate('Search')}>
        <Icon name="search" size={18} color={COLORS.textSecondary} />
        <Text style={styles.searchPlaceholder}>Search restaurants or dishes…</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SPACING.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={<Text style={styles.empty}>No restaurants open near you right now.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  greeting: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
  location: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card,
    marginHorizontal: SPACING.lg, marginTop: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchPlaceholder: { color: COLORS.textSecondary, fontSize: FONT_SIZE.base },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, marginBottom: SPACING.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  cardImage: { height: 110, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  ratingBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  ratingText: { color: COLORS.white, fontSize: FONT_SIZE.xs, fontWeight: '600' },
  cardInfo: { padding: SPACING.md },
  cardName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
  cardMeta: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm },
  cardTime: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  feePill: { backgroundColor: COLORS.successLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  feeText: { fontSize: FONT_SIZE.xs, color: COLORS.success },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, fontSize: FONT_SIZE.base },
});
