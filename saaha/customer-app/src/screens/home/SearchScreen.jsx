import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import api from '../../api/client';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (text) => {
    if (!text.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get('/restaurants', { params: { search: text } });
      setResults(data.restaurants);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 400); // debounce
    return () => clearTimeout(t);
  }, [query, search]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: SPACING.sm }}>
          <Icon name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Search restaurants or dishes…"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 30 }} color={COLORS.primary} />}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.lg }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultRow} onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })}>
            <View style={styles.resultIcon}><Text>🍽️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultName}>{item.restaurant_name}</Text>
              <Text style={styles.resultMeta}>{(item.cuisine_types || []).join(', ') || item.city} · ⭐ {item.rating || 'New'}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading && query ? <Text style={styles.empty}>No results for "{query}"</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card,
    padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  input: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.text },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  resultIcon: { width: 44, height: 44, borderRadius: RADIUS.sm, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  resultName: { fontSize: FONT_SIZE.base, fontWeight: '600', color: COLORS.text },
  resultMeta: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 30 },
});
