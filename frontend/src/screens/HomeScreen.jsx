import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl, Platform, Alert,
} from 'react-native';
import { COLORS } from '../utils/colors';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ─── Category constants ───────────────────────────────────────────────────────
const CATEGORIES = [
  { label: 'All',         value: 'all',         emoji: '✨' },
  { label: 'Historical',  value: 'historical',  emoji: '🏛️' },
  { label: 'Nature',      value: 'nature',      emoji: '🌿' },
  { label: 'Food',        value: 'food',        emoji: '🍽️' },
  { label: 'Adventure',   value: 'adventure',   emoji: '🧗' },
  { label: 'Beach',       value: 'beach',       emoji: '🏖️' },
  { label: 'Cultural',    value: 'cultural',    emoji: '🎭' },
  { label: 'Religious',   value: 'religious',   emoji: '🕌' },
  { label: 'Museum',      value: 'museum',      emoji: '🖼️' },
  { label: 'Wellness',    value: 'wellness',    emoji: '🧘' },
  { label: 'Shopping',    value: 'shopping',    emoji: '🛍️' },
  { label: 'Nightlife',   value: 'nightlife',   emoji: '🌙' },
];

const CATEGORY_COLORS = {
  historical: '#C25E2A', nature: '#2E7D5E', adventure: '#FE7743',
  religious: '#447D9B', beach: '#1A6E8E', food: '#D94F2B',
  cultural: '#B8621A', museum: '#4A6741', wellness: '#2A8A7E',
  shopping: '#C4442A', nightlife: '#273F4F',
};

// ─── Skeleton card ────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <View style={[styles.placeCard, { marginBottom: 12 }]}>
    <View style={{ height: 140, backgroundColor: '#F0F0F0', borderRadius: 16 }} />
    <View style={{ padding: 12, gap: 8 }}>
      <View style={{ height: 16, backgroundColor: '#F0F0F0', borderRadius: 4, width: '70%' }} />
      <View style={{ height: 12, backgroundColor: '#F0F0F0', borderRadius: 4, width: '45%' }} />
    </View>
  </View>
);

// ─── Place Card ───────────────────────────────────────────────────────────────
const PlaceCard = ({ item, isSaved, onSave, onRoute }) => {
  const { place } = item;
  const catColor  = CATEGORY_COLORS[place.category] || COLORS.primary;

  return (
    <View style={styles.placeCard}>
      {/* Category banner */}
      <View style={[styles.cardBanner, { backgroundColor: catColor + '22' }]}>
        <View style={[styles.catBadge, { backgroundColor: catColor }]}>
          <Text style={styles.catText}>
            {place.category?.charAt(0).toUpperCase() + place.category?.slice(1)}
          </Text>
        </View>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>★ {place.avg_rating?.toFixed(1)}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
        <Text style={styles.placeCity}>📍 {place.city}</Text>
        {!!place.description && (
          <Text style={styles.placeDesc} numberOfLines={2}>{place.description}</Text>
        )}

        {/* Popularity bar */}
        <View style={styles.popRow}>
          <View style={styles.popBar}>
            <View style={[styles.popFill, { width: `${Math.min(place.popularity_score || 0, 100)}%` }]} />
          </View>
          <Text style={styles.popNum}>{Math.round(place.popularity_score || 0)}%</Text>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, isSaved && styles.actionBtnActive]}
            onPress={() => onSave(place)}
          >
            <Text style={[styles.actionBtnTxt, isSaved && styles.actionBtnTxtActive]}>
              {isSaved ? '♥ Saved' : '♡ Save'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.routeBtn]} onPress={() => onRoute(place)}>
            <Text style={styles.routeBtnTxt}>🗺 Route</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ─── Main HomeScreen ──────────────────────────────────────────────────────────
const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const [recommendations, setRecommendations] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [activeCategory,  setActiveCategory]  = useState('all');
  const [savedPlaces,     setSavedPlaces]     = useState(new Set());
  const [error,           setError]           = useState(null);
  const [sessionId] = useState(
    () => `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  // ── Fetch recommendations ─────────────────────────────────────────────────
  // ✅ user?.user_id — backend returns user_id not id
  // ✅ Home screen uses Mumbai as default lat/lng when user has no location
  const fetchRecommendations = useCallback(async (isRefresh = false) => {
    if (!user?.user_id) return;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const payload = {
        user_id:         user.user_id,       // ✅ correct field name
        latitude:        19.0760,             // Mumbai default — home screen uses city centre
        longitude:       72.8777,
        max_distance_km: 100.0,
        limit:           20,
        category_filter: activeCategory === 'all' ? null : [activeCategory],
      };

      // POST /recommendations → { recommendations: [{ place }], cache_hit, … }
      const data = await api.post('/recommendations', payload);
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError(err.message || 'Could not load recommendations.');
      Alert.alert('Connection Error', 'Could not load recommendations. Pull down to retry.', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.user_id, activeCategory]);

  useEffect(() => { fetchRecommendations(); }, [fetchRecommendations]);

  // ── Interaction logger ────────────────────────────────────────────────────
  // ✅ POST /interactions body — user_id removed from query string (not in API spec)
  const logInteraction = async (placeId, interactionType) => {
    if (!user?.user_id) return;
    try {
      await api.post('/interactions', {
        place_id:         placeId,
        interaction_type: interactionType,
        session_id:       sessionId,
      });
    } catch (_) { /* silent */ }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSave = (place) => {
    const alreadySaved = savedPlaces.has(place.place_id);
    const next = new Set(savedPlaces);
    if (alreadySaved) { next.delete(place.place_id); }
    else { next.add(place.place_id); logInteraction(place.place_id, 'save'); }
    setSavedPlaces(next);
  };

  const handleRoute = (place) => {
    logInteraction(place.place_id, 'route_requested');
    navigation.navigate('Routes', {
      selectedPlaces: [place],
      userId:   user?.user_id,   // ✅ correct field
      cityName: place.city,
    });
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.username || 'Explorer'} 👋</Text>
          <Text style={styles.tagline}>Where would you like to go?</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.planBtn} onPress={() => navigation.navigate('Plan')}>
            <Text style={styles.planBtnTxt}>+ Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.profileBtnTxt}>{user?.username?.[0]?.toUpperCase() || '?'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category filter bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={styles.catContent}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.value}
            style={[styles.catChip, activeCategory === cat.value && styles.catChipActive]}
            onPress={() => setActiveCategory(cat.value)}
            activeOpacity={0.75}
          >
            <Text style={styles.catEmoji}>{cat.emoji}</Text>
            <Text style={[styles.catLabel, activeCategory === cat.value && styles.catLabelActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Recommendations list */}
      {loading ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </ScrollView>
      ) : (
        <FlatList
          data={recommendations}
          keyExtractor={(item, i) => `${item.place?.place_id ?? i}`}
          renderItem={({ item }) => (
            <PlaceCard
              item={item}
              isSaved={savedPlaces.has(item.place?.place_id)}
              onSave={handleSave}
              onRoute={handleRoute}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchRecommendations(true)}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>{error ? '⚠️' : '🗺'}</Text>
              <Text style={styles.emptyTitle}>{error ? 'Could not load' : 'No places found'}</Text>
              <Text style={styles.emptySub}>{error || 'Try a different category or plan a trip.'}</Text>
            </View>
          }
        />
      )}

      {/* Logout (bottom) */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutTxt}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7FB' },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 24, paddingBottom: 16, backgroundColor: COLORS.white, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  greeting:    { fontSize: 22, fontWeight: '800', color: COLORS.dark },
  tagline:     { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  planBtn:     { backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  planBtnTxt:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  profileBtn:  { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.dark, alignItems: 'center', justifyContent: 'center' },
  profileBtnTxt:{ color: '#fff', fontWeight: '800', fontSize: 16 },

  catScroll:  { maxHeight: 56, flexGrow: 0 },
  catContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  catChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#E8E8F0', backgroundColor: '#fff' },
  catChipActive: { backgroundColor: '#FFF3EF', borderColor: COLORS.primary },
  catEmoji:   { fontSize: 14 },
  catLabel:   { fontSize: 13, color: COLORS.gray, fontWeight: '500' },
  catLabelActive: { color: COLORS.primary, fontWeight: '700' },

  listContent: { padding: 16, paddingBottom: 80 },

  placeCard: { backgroundColor: COLORS.white, borderRadius: 20, marginBottom: 16, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, overflow: 'hidden' },
  cardBanner: { height: 8 },
  catBadge:   { position: 'absolute', top: 12, left: 14, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  catText:    { color: '#fff', fontSize: 11, fontWeight: '700' },
  ratingBadge:{ position: 'absolute', top: 12, right: 14, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  ratingText: { color: '#FFD700', fontSize: 12, fontWeight: '700' },

  cardBody:  { padding: 16 },
  placeName: { fontSize: 18, fontWeight: '800', color: COLORS.dark, marginBottom: 4 },
  placeCity: { fontSize: 12, color: COLORS.gray },
  placeDesc: { fontSize: 13, color: '#7A7A9D', lineHeight: 19, marginTop: 8 },

  popRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  popBar:   { flex: 1, height: 4, backgroundColor: '#F0F0F0', borderRadius: 2, overflow: 'hidden' },
  popFill:  { height: 4, backgroundColor: COLORS.primary, borderRadius: 2 },
  popNum:   { fontSize: 11, color: COLORS.gray, fontWeight: '600', minWidth: 30, textAlign: 'right' },

  cardActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn:   { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#E8E8F0', alignItems: 'center', backgroundColor: '#F6F7FB' },
  actionBtnActive: { backgroundColor: '#FFF3EF', borderColor: COLORS.primary },
  actionBtnTxt:    { fontSize: 13, color: COLORS.gray, fontWeight: '600' },
  actionBtnTxtActive: { color: COLORS.primary },
  routeBtn:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  routeBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  emptyBox:   { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:  { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.dark, marginBottom: 8 },
  emptySub:   { fontSize: 14, color: COLORS.gray, textAlign: 'center' },

  logoutBtn: { position: 'absolute', bottom: 16, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFE8E0', borderWidth: 1, borderColor: COLORS.primary },
  logoutTxt: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
});

export default HomeScreen;