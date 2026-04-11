import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { COLORS } from '../utils/colors';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ─── Constants matching CategoryEnum from postgres_model.py ──────────────────

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

// Category accent colors — warm, consistent with orange theme
const CATEGORY_COLORS = {
  historical: '#C25E2A',
  nature:     '#2E7D5E',
  adventure:  '#FE7743',
  religious:  '#447D9B',
  beach:      '#1A6E8E',
  food:       '#D94F2B',
  cultural:   '#B8621A',
  museum:     '#4A6741',
  wellness:   '#2A8A7E',
  shopping:   '#C4442A',
  nightlife:  '#273F4F',
};

// ─── Skeleton card (loading placeholder) ─────────────────────────────────────

const SkeletonCard = () => (
  <View style={styles.placeCard}>
    <View style={[styles.cardCover, { backgroundColor: '#F0EDE9' }]}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#E0DAD4' }} />
    </View>
    <View style={{ padding: 14, gap: 10 }}>
      <View style={{ height: 10, backgroundColor: '#F0EDE9', borderRadius: 6, width: '35%' }} />
      <View style={{ height: 18, backgroundColor: '#F0EDE9', borderRadius: 6, width: '75%' }} />
      <View style={{ height: 12, backgroundColor: '#F0EDE9', borderRadius: 6, width: '45%' }} />
      <View style={{ height: 12, backgroundColor: '#F0EDE9', borderRadius: 6, width: '55%' }} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        <View style={{ flex: 1, height: 38, backgroundColor: '#F0EDE9', borderRadius: 12 }} />
        <View style={{ flex: 1, height: 38, backgroundColor: '#F0EDE9', borderRadius: 12 }} />
      </View>
    </View>
  </View>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

const CategoryChip = ({ item, selected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={[styles.categoryChip, selected && styles.categoryChipSelected]}
  >
    <Text style={styles.categoryEmoji}>{item.emoji}</Text>
    <Text style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}>
      {item.label}
    </Text>
  </TouchableOpacity>
);

const StarRating = ({ rating }) => {
  const full  = Math.floor(rating || 0);
  const empty = 5 - full;
  return (
    <Text style={styles.stars}>
      {'★'.repeat(full)}{'☆'.repeat(empty)}{' '}
      <Text style={styles.ratingText}>{(rating || 0).toFixed(1)}</Text>
    </Text>
  );
};

const PlaceCard = ({ item, onPress, onSave, onRoute, saved }) => {
  const catColor = CATEGORY_COLORS[item.category] || COLORS.primary;
  const catEmoji = CATEGORIES.find(c => c.value === item.category)?.emoji || '📍';

  return (
    <TouchableOpacity
      style={styles.placeCard}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* Cover — swap <View> for <Image source={{ uri: item.image_url }}> when backend returns images */}
      <View style={[styles.cardCover, { backgroundColor: catColor + '22' }]}>
        <Text style={styles.cardCoverEmoji}>{catEmoji}</Text>

        <View style={styles.popularityBadge}>
          <Text style={styles.popularityText}>🔥 {Math.round(item.popularity_score || 0)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saved && styles.saveButtonActive]}
          onPress={onSave}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 16, color: saved ? COLORS.primary : COLORS.white }}>
            {saved ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <View style={[styles.categoryTag, { backgroundColor: catColor + '18' }]}>
          <Text style={[styles.categoryTagText, { color: catColor }]}>
            {item.category}
          </Text>
        </View>

        <Text style={styles.placeName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.placeCity}>📍 {item.city}</Text>

        <StarRating rating={item.avg_rating} />

        {item.tags?.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagsRow}
          >
            {item.tags.slice(0, 3).map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={onSave}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnOutlineText}>
              {saved ? '★ Saved' : '☆ Save'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtnFill}
            onPress={onRoute}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnFillText}>🗺️ Route</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main HomeScreen ──────────────────────────────────────────────────────────

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [savedPlaces, setSavedPlaces]       = useState(new Set());
  const [error, setError]                   = useState(null);
  const [sessionId] = useState(
    () => `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  // ── REAL API call ─────────────────────────────────────────────────────────
  // Reads user.latitude / user.longitude set during login/onboarding.
  // category_filter is null when "All" is selected so backend returns every type.
  const fetchRecommendations = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const payload = {
        user_id:          user.id,
        latitude:         user.latitude  ?? null,   // set during login/onboarding
        longitude:        user.longitude ?? null,
        max_distance_km:  100.0,
        limit:            20,
        category_filter:  activeCategory === 'all' ? null : [activeCategory],
      };

      // POST /recommendations  →  { recommendations: [{ place, explanation }], cache_hit }
      // axios interceptor already returns response.data, so we get the object directly
      const data = await api.post('/recommendations', payload);
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError(err.message || 'Could not load recommendations.');
      Alert.alert(
        'Connection Error',
        'Could not load recommendations. Pull down to retry.',
        [{ text: 'OK' }],
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?.latitude, user?.longitude, activeCategory]);
  // ── END API CALL ──────────────────────────────────────────────────────────

  // Re-fetch whenever the user or active category changes
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // ── Interaction logger (silent — never blocks UI) ─────────────────────────
  const logInteraction = async (placeId, interactionType) => {
    if (!user?.id) return;
    try {
      await api.post(`/interactions?user_id=${user.id}`, {
        place_id:         placeId,
        interaction_type: interactionType,
        session_id:       sessionId,
      });
    } catch (_) { /* silent */ }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePlacePress = (place) => {
    logInteraction(place.place_id, 'click');
    navigation.navigate('PlaceDetail', { place, sessionId });
  };

  const handleSave = (place) => {
    const alreadySaved = savedPlaces.has(place.place_id);
    const next = new Set(savedPlaces);
    if (alreadySaved) {
      next.delete(place.place_id);
    } else {
      next.add(place.place_id);
      logInteraction(place.place_id, 'save');
    }
    setSavedPlaces(next);
  };

  const handleRoute = (place) => {
    logInteraction(place.place_id, 'route_requested');
    navigation.navigate('Routes', {
      selectedPlaces: [place],
      userId:         user?.id,
      cityName:       place.city,
    });
  };

  const handleCategoryChange = (value) => {
    if (value === activeCategory) return; // no-op tap
    setActiveCategory(value);
    // fetchRecommendations will re-run via useEffect because activeCategory changed
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>📍 {user?.city || 'Explore India'}</Text>
          <Text style={styles.name}>
            Hey, {user?.name?.split(' ')[0] || 'Traveler'} 👋
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.8}
        >
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search / Plan bar ── */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => navigation.navigate('Plan')}
        activeOpacity={0.8}
      >
        <Text style={styles.searchIcon}>🗺️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.searchLabel}>Plan a Trip</Text>
          <Text style={styles.searchSub}>Pick a city · interests · distance</Text>
        </View>
        <View style={styles.searchArrow}>
          <Text style={styles.searchArrowTxt}>→</Text>
        </View>
      </TouchableOpacity>

    

      {/* ── Section header ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {activeCategory === 'all'
            ? 'Recommended for You'
            : `${CATEGORIES.find(c => c.value === activeCategory)?.label} places`}
        </Text>
        <TouchableOpacity
          onPress={() => fetchRecommendations()}
          activeOpacity={0.7}
        >
          <Text style={styles.refreshLink}>↺ Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      {loading ? (
        // Skeleton cards while first load
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </ScrollView>
      ) : error && recommendations.length === 0 ? (
        // Error state
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📡</Text>
          <Text style={styles.emptyTitle}>No connection</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchRecommendations()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnTxt}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : recommendations.length === 0 ? (
        // Empty state
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.emptyTitle}>No places found</Text>
          <Text style={styles.emptySubtitle}>
            Try a different category or pull to refresh
          </Text>
        </View>
      ) : (
        <FlatList
          data={recommendations}
          keyExtractor={item => item.place.place_id.toString()}
          renderItem={({ item }) => (
            <PlaceCard
              item={item.place}
              saved={savedPlaces.has(item.place.place_id)}
              onPress={() => handlePlacePress(item.place)}
              onSave={() => handleSave(item.place)}
              onRoute={() => handleRoute(item.place)}
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
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F5',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE8DE',
  },
  greeting: { fontSize: 12, color: COLORS.gray, fontWeight: '500' },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE8DE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: { fontSize: 22 },

  // Search / Plan bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    gap: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon:  { fontSize: 22 },
  searchLabel: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  searchSub:   { fontSize: 11, color: COLORS.gray, marginTop: 1 },
  searchArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchArrowTxt: { fontSize: 16, color: COLORS.white, fontWeight: '700' },

  // Categories
  categoriesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: '#FFD5C2',
    gap: 4,
    marginRight: 6,
  },
  categoryChipSelected: {
    backgroundColor: '#FFE8DE',
    borderColor: COLORS.primary,
  },
  categoryEmoji: { fontSize: 14 },
  categoryLabel: { fontSize: 12, fontWeight: '600', color: COLORS.gray },
  categoryLabelSelected: { color: COLORS.primary },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  refreshLink:  { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  // States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText:   { fontSize: 14, color: COLORS.gray },
  emptyContainer:{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 32 },
  emptyEmoji:    { fontSize: 48 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  emptySubtitle: { fontSize: 13, color: COLORS.gray, textAlign: 'center' },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
  },
  retryBtnTxt: { color: COLORS.white, fontSize: 14, fontWeight: '700' },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },

  // Place card
  placeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  cardCover: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardCoverEmoji: { fontSize: 64 },
  popularityBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(39,63,79,0.75)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  popularityText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  saveButton: {
    position: 'absolute',
    top: 8,
    right: 10,
    backgroundColor: 'rgba(39,63,79,0.5)',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonActive: { backgroundColor: COLORS.white },

  cardBody: { padding: 14 },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 6,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  placeName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  placeCity:    { fontSize: 12, color: COLORS.gray, marginBottom: 6 },
  stars:        { fontSize: 13, color: '#F59E0B', marginBottom: 8 },
  ratingText:   { color: COLORS.gray, fontSize: 12 },
  tagsRow:      { marginBottom: 12 },
  tag: {
    backgroundColor: '#FFE8DE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 6,
  },
  tagText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 10 },
  actionBtnOutline: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  actionBtnOutlineText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  actionBtnFill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  actionBtnFillText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
});

export default HomeScreen;