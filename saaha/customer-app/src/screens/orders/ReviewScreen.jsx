import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import api from '../../api/client';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../utils/theme';

function StarRow({ value, onChange }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}>
          <Icon name="star" size={32} color={n <= value ? '#F5A623' : COLORS.border} style={{ marginRight: 6 }} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ReviewScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [foodRating, setFoodRating] = useState(0);
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (foodRating === 0 || restaurantRating === 0) {
      Alert.alert('Rating required', 'Please rate the food and restaurant.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/reviews', {
        order_id: orderId,
        food_rating: foodRating,
        restaurant_rating: restaurantRating,
        rider_rating: riderRating || undefined,
        comment,
      });
      Alert.alert('Thank you!', 'Your review has been submitted.', [
        { text: 'OK', onPress: () => navigation.popToTop() },
      ]);
    } catch (err) {
      Alert.alert('Could not submit', err.response?.data?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="x" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate your order</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.block}>
          <Text style={styles.label}>How was the food?</Text>
          <StarRow value={foodRating} onChange={setFoodRating} />
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>How was the restaurant overall?</Text>
          <StarRow value={restaurantRating} onChange={setRestaurantRating} />
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>How was your delivery partner? (optional)</Text>
          <StarRow value={riderRating} onChange={setRiderRating} />
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>Add a comment (optional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Tell us more about your experience…"
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={4}
            value={comment}
            onChangeText={setComment}
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnText}>Submit review</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  headerTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  content: { padding: SPACING.lg },
  block: { marginBottom: SPACING.xl },
  label: { fontSize: FONT_SIZE.base, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  starRow: { flexDirection: 'row' },
  commentInput: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, fontSize: FONT_SIZE.sm, color: COLORS.text, textAlignVertical: 'top', minHeight: 90,
  },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', marginTop: SPACING.md },
  submitBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.base },
});
