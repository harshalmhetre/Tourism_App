import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Platform, StatusBar, Linking,
} from 'react-native';
import { COLORS } from '../utils/colors';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — for UI preview only.
// When backend is ready:
//   1. Delete the MOCK_RECOMMENDATIONS constant below
//   2. Delete the mock useEffect block (marked clearly)
//   3. Uncomment the REAL API fetchRecs block
//   4. Uncomment the REAL logInteraction block
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_RECOMMENDATIONS = [
  {
    place: {
      place_id: 1,
      name: 'Gateway of India',
      category: 'historical',
      city: 'Mumbai',
      latitude: 18.9220,
      longitude: 72.8347,
      description: 'An iconic arch monument built in 1924 to commemorate the visit of King George V and Queen Mary. It stands on the waterfront of Apollo Bunder overlooking the Arabian Sea.',
      tags: ['landmark', 'heritage', 'monument', 'waterfront'],
      avg_rating: 4.7,
      popularity_score: 95,
    },
    explanation: 'Top pick based on your interest in historical places',
  },
  {
    place: {
      place_id: 2,
      name: 'Marine Drive',
      category: 'nature',
      city: 'Mumbai',
      latitude: 18.9440,
      longitude: 72.8232,
      description: "A 3.6 km long boulevard hugging Mumbai's coastline. Also known as the Queen's Necklace due to its glittering shape when viewed from above at night.",
      tags: ['sunset', 'sea', 'promenade', 'romantic'],
      avg_rating: 4.6,
      popularity_score: 92,
    },
    explanation: 'Highly rated by travellers similar to you',
  },
  {
    place: {
      place_id: 3,
      name: 'Chhatrapati Shivaji Museum',
      category: 'museum',
      city: 'Mumbai',
      latitude: 18.9267,
      longitude: 72.8322,
      description: "One of India's finest museums housing over 50,000 artefacts across three floors. The building itself is a stunning example of Indo-Saracenic architecture.",
      tags: ['art', 'history', 'architecture', 'culture'],
      avg_rating: 4.5,
      popularity_score: 82,
    },
    explanation: 'Matches your interest in museums and culture',
  },
  {
    place: {
      place_id: 4,
      name: 'Siddhivinayak Temple',
      category: 'religious',
      city: 'Mumbai',
      latitude: 19.0167,
      longitude: 72.8301,
      description: 'One of the most visited Hindu temples in Mumbai, dedicated to Lord Ganesha. Known for its six-feet tall idol and serene spiritual atmosphere.',
      tags: ['temple', 'spiritual', 'prayer', 'peaceful'],
      avg_rating: 4.8,
      popularity_score: 90,
    },
    explanation: 'Popular among family travellers like you',
  },
  {
    place: {
      place_id: 5,
      name: 'Juhu Beach',
      category: 'beach',
      city: 'Mumbai',
      latitude: 19.0883,
      longitude: 72.8262,
      description: "Mumbai's most popular beach, famous for its street food stalls serving pani puri, bhel puri and fresh coconut water. A great spot to experience local Mumbai culture.",
      tags: ['beach', 'street food', 'sunset', 'family'],
      avg_rating: 4.1,
      popularity_score: 85,
    },
    explanation: 'Great match for your beach and food interests',
  },
  {
    place: {
      place_id: 6,
      name: 'Bandra-Worli Sea Link',
      category: 'entertainment',
      city: 'Mumbai',
      latitude: 19.0420,
      longitude: 72.8181,
      description: 'An eight-lane cable-stayed bridge spanning 5.6 km across Mahim Bay. A feat of modern engineering and a spectacular viewpoint, especially at night.',
      tags: ['bridge', 'engineering', 'night view', 'iconic'],
      avg_rating: 4.5,
      popularity_score: 88,
    },
    explanation: 'Trending among visitors to Mumbai',
  },
  {
    place: {
      place_id: 7,
      name: 'Elephanta Caves',
      category: 'historical',
      city: 'Mumbai',
      latitude: 18.9633,
      longitude: 72.9315,
      description: 'A UNESCO World Heritage Site comprising sculpted caves on Elephanta Island in Mumbai Harbour. The caves date back to between the 5th and 8th centuries CE.',
      tags: ['UNESCO', 'caves', 'sculpture', 'island'],
      avg_rating: 4.3,
      popularity_score: 78,
    },
    explanation: 'Must-see historical site near Mumbai',
  },
  {
    place: {
      place_id: 8,
      name: 'Dharavi Street Food Tour',
      category: 'food',
      city: 'Mumbai',
      latitude: 19.0413,
      longitude: 72.8549,
      description: 'Experience authentic Mumbai street food in one of Asia\'s most vibrant neighbourhoods. Sample local delicacies from small eateries serving traditional recipes for decades.',
      tags: ['street food', 'local', 'authentic', 'cultural'],
      avg_rating: 4.4,
      popularity_score: 74,
    },
    explanation: 'Recommended for food lovers',
  },
];

// ─── Category meta ────────────────────────────────────────────────────────────

const CAT_META = {
  historical:    { bg: '#FFF3E0', text: '#E65100', emoji: '🏛️' },
  nature:        { bg: '#E8F5E9', text: '#2E7D32', emoji: '🌿' },
  adventure:     { bg: '#FCE4EC', text: '#880E4F', emoji: '🧗' },
  religious:     { bg: '#FFF8E1', text: '#F57F17', emoji: '🛕' },
  beach:         { bg: '#E3F2FD', text: '#0D47A1', emoji: '🏖️' },
  museum:        { bg: '#EDE7F6', text: '#4527A0', emoji: '🏺' },
  food:          { bg: '#FBE9E7', text: '#BF360C', emoji: '🍽️' },
  cultural:      { bg: '#F3E5F5', text: '#6A1B9A', emoji: '🎭' },
  shopping:      { bg: '#FCE4EC', text: '#880E4F', emoji: '🛍️' },
  wellness:      { bg: '#E0F2F1', text: '#004D40', emoji: '🧘' },
  nightlife:     { bg: '#E8EAF6', text: '#1A237E', emoji: '🌙' },
  entertainment: { bg: '#FFFDE7', text: '#F57F17', emoji: '🎡' },
};
const getCat = (cat) => CAT_META[cat] || { bg: '#F5F5F5', text: '#444', emoji: '📍' };

// ─── Star Rating ──────────────────────────────────────────────────────────────

const Stars = ({ rating = 0 }) => {
  const full  = Math.floor(rating);
  const empty = 5 - full;
  return (
    <View style={starSt.row}>
      {[...Array(full)].map((_, i)  => <Text key={`f${i}`} style={starSt.full}>★</Text>)}
      {[...Array(empty)].map((_, i) => <Text key={`e${i}`} style={starSt.empty}>☆</Text>)}
      <Text style={starSt.num}>{rating.toFixed(1)}</Text>
    </View>
  );
};
const starSt = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 1 },
  full:  { color: COLORS.primary, fontSize: 13 },
  empty: { color: COLORS.light,   fontSize: 13 },
  num:   { fontSize: 12, color: COLORS.gray, fontWeight: '600', marginLeft: 5 },
});

// ─── Skeleton loading card ────────────────────────────────────────────────────

const SkeletonCard = () => (
  <View style={cSt.card}>
    <View style={{ height: 56, backgroundColor: '#F0F0F0' }} />
    <View style={{ padding: 16, gap: 12 }}>
      <View style={{ height: 18, backgroundColor: '#F0F0F0', borderRadius: 6, width: '78%' }} />
      <View style={{ height: 12, backgroundColor: '#F0F0F0', borderRadius: 6, width: '50%' }} />
      <View style={{ height: 10, backgroundColor: '#F0F0F0', borderRadius: 6, width: '38%' }} />
    </View>
  </View>
);

// ─── Place Card ───────────────────────────────────────────────────────────────

const PlaceCard = ({ item, index, isSelected, onToggle, onInteraction }) => {
  const { place } = item;
  const cat = getCat(place.category);

  const openYouTube = () => {
    onInteraction(place.place_id, 'preview_viewed');
    const q = encodeURIComponent(`${place.name} ${place.city} travel`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${q}`);
  };

  const openMap = () => {
    onInteraction(place.place_id, 'click');
    const url = Platform.OS === 'ios'
      ? `maps:?q=${encodeURIComponent(place.name)}&ll=${place.latitude},${place.longitude}`
      : `geo:${place.latitude},${place.longitude}?q=${encodeURIComponent(place.name)}`;
    Linking.openURL(url);
  };

  const handleToggle = () => {
    onToggle(place);
    onInteraction(place.place_id, isSelected ? 'skip' : 'save');
  };

  return (
    <View style={[cSt.card, isSelected && cSt.cardSelected]}>

      {/* Colour band */}
      <View style={[cSt.band, { backgroundColor: cat.bg }]}>
        <View style={cSt.bandLeft}>
          <Text style={cSt.bandEmoji}>{cat.emoji}</Text>
          <View>
            <Text style={[cSt.catText, { color: cat.text }]}>
              {place.category
                ? place.category.charAt(0).toUpperCase() + place.category.slice(1)
                : 'Place'}
            </Text>
            <Text style={cSt.cityText}>{place.city}</Text>
          </View>
        </View>
        <View style={[cSt.badge, isSelected && cSt.badgeSel]}>
          <Text style={[cSt.badgeTxt, isSelected && cSt.badgeTxtSel]}>
            {isSelected ? '✓' : `#${index + 1}`}
          </Text>
        </View>
      </View>

      {/* Body */}
      <View style={cSt.body}>
        <Text style={cSt.name} numberOfLines={2}>{place.name}</Text>
        <Stars rating={place.avg_rating || 0} />
        {!!place.description && (
          <Text style={cSt.desc} numberOfLines={3}>{place.description}</Text>
        )}
        {place.tags?.length > 0 && (
          <View style={cSt.tags}>
            {place.tags.slice(0, 4).map((tag, i) => (
              <View key={i} style={cSt.tag}>
                <Text style={cSt.tagTxt}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={cSt.popRow}>
          <Text style={cSt.popIcon}>🔥</Text>
          <View style={cSt.barTrack}>
            <View style={[cSt.barFill, { width: `${Math.min(place.popularity_score || 0, 100)}%` }]} />
          </View>
          <Text style={cSt.popPct}>{Math.round(place.popularity_score || 0)}%</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={cSt.actions}>
        <TouchableOpacity style={cSt.iconBtn} onPress={openYouTube} activeOpacity={0.75}>
          <Text style={cSt.iconBtnIcon}>▶</Text>
          <Text style={cSt.iconBtnTxt}>Preview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={cSt.iconBtn} onPress={openMap} activeOpacity={0.75}>
          <Text style={cSt.iconBtnIcon}>🗺</Text>
          <Text style={cSt.iconBtnTxt}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[cSt.addBtn, isSelected && cSt.addBtnSel]}
          onPress={handleToggle}
          activeOpacity={0.75}
        >
          <Text style={[cSt.addTxt, isSelected && cSt.addTxtSel]}>
            {isSelected ? '✓  Added to Trip' : '+  Add to Trip'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const cSt = StyleSheet.create({
  card:         { backgroundColor: COLORS.white, borderRadius: 20, marginBottom: 16, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, overflow: 'hidden' },
  cardSelected: { borderWidth: 2, borderColor: COLORS.primary },
  band:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  bandLeft:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bandEmoji:    { fontSize: 22 },
  catText:      { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cityText:     { fontSize: 12, color: '#7A7A9D', marginTop: 1 },
  badge:        { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F6F7FB', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E8E8F0' },
  badgeSel:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  badgeTxt:     { fontSize: 12, fontWeight: '700', color: COLORS.gray },
  badgeTxtSel:  { fontSize: 14, fontWeight: '800', color: COLORS.white },
  body:         { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  name:         { fontSize: 19, fontWeight: '800', color: COLORS.dark, marginBottom: 6, letterSpacing: -0.3 },
  desc:         { fontSize: 13, color: '#7A7A9D', lineHeight: 19, marginTop: 8 },
  tags:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag:          { backgroundColor: '#F6F7FB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#E8E8F0' },
  tagTxt:       { fontSize: 11, color: '#7A7A9D', fontWeight: '500' },
  popRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 4 },
  popIcon:      { fontSize: 13 },
  barTrack:     { flex: 1, height: 5, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden' },
  barFill:      { height: 5, backgroundColor: COLORS.primary, borderRadius: 3 },
  popPct:       { fontSize: 11, color: COLORS.gray, fontWeight: '600', minWidth: 32, textAlign: 'right' },
  actions:      { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0', alignItems: 'center' },
  iconBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#E8E8F0', backgroundColor: '#F6F7FB' },
  iconBtnIcon:  { fontSize: 13, color: COLORS.accent },
  iconBtnTxt:   { fontSize: 12, color: COLORS.accent, fontWeight: '600' },
  addBtn:       { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FFF3EF', borderWidth: 1.5, borderColor: COLORS.primary, alignItems: 'center' },
  addBtnSel:    { backgroundColor: COLORS.primary },
  addTxt:       { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  addTxtSel:    { color: COLORS.white },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const RecommendationScreen = ({ route, navigation }) => {
  const { payload, cityName } = route.params || {};
  const { user } = useAuth();

  const [recs, setRecs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState([]);
  const [cacheHit, setCacheHit] = useState(false);

  // ── MOCK: load dummy data with realistic fake delay ────────────────────────
  // DELETE this block when switching to real API
  // useEffect(() => {
  //   const t = setTimeout(() => {
  //     setRecs(MOCK_RECOMMENDATIONS);
  //     setCacheHit(false);
  //     setLoading(false);
  //   }, 1200);
  //   return () => clearTimeout(t);
  // }, []);
  // ── END MOCK BLOCK ────────────────────────────────────────────────────────

  // ── REAL API — uncomment when backend is ready ────────────────────────────
  const fetchRecs = useCallback(async () => {
    setLoading(true);
    try {
      // axios interceptor auto-attaches token + returns response.data directly
      const data = await api.post('/recommendations', payload);
      setRecs(data.recommendations || []);
      setCacheHit(data.cache_hit || false);
    } catch (err) {
      Alert.alert('Could not load recommendations', err.message);
    } finally {
      setLoading(false);
    }
  }, [payload]);
  useEffect(() => { fetchRecs(); }, [fetchRecs]);
  // ── END REAL API BLOCK ────────────────────────────────────────────────────

  // ── MOCK interaction log — just console.log for now ───────────────────────
  // REPLACE with real block below when backend is ready
  // const logInteraction = useCallback((placeId, type) => {
  //   console.log(`[MOCK interaction] place_id:${placeId}  type:${type}`);
  // }, []);

  // ── REAL interaction log — uncomment when backend is ready ───────────────
  const logInteraction = useCallback(async (placeId, type) => {
    try {
      // axios interceptor auto-attaches token + handles errors
      await api.post(`/interactions?user_id=${user?.id}`, {
        place_id: placeId, interaction_type: type, session_id: null,
      });
    } catch (_) { /* silent fail — never block the UI for analytics */ }
  }, [user]);
  // ── END REAL LOG BLOCK ────────────────────────────────────────────────────

  // ── Toggle place selection ────────────────────────────────────────────────

  const togglePlace = useCallback((place) => {
    setSelected(prev => {
      const exists = prev.find(p => p.place_id === place.place_id);
      if (exists) return prev.filter(p => p.place_id !== place.place_id);
      if (prev.length >= 8) {
        Alert.alert('Maximum 8 stops', 'Remove a place before adding more.');
        return prev;
      }
      return [...prev, place];
    });
  }, []);

  // ── Navigate to Routes ────────────────────────────────────────────────────

  const handlePlanRoute = () => {
    if (selected.length < 2) {
      Alert.alert('Add More Places', 'Select at least 2 places to plan a route.');
      return;
    }
    selected.forEach(p => logInteraction(p.place_id, 'route_requested'));
    navigation.navigate('Routes', {
      selectedPlaces: selected,
      userId: user?.id,
      cityName: cityName || 'Mumbai',
    });
  };

  // ── Mock refresh handler ──────────────────────────────────────────────────

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => { setRecs(MOCK_RECOMMENDATIONS); setLoading(false); }, 800);
    // When real API: replace above with fetchRecs()
  };

  // ── List header ───────────────────────────────────────────────────────────

  const Header = () => (
    <View style={s.listTop}>
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.navigate('Plan')} activeOpacity={0.7}>
        <Text style={s.backArrow}>←</Text>
      </TouchableOpacity>
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Recommendations</Text>
          <Text style={s.subtitle}>
            📍 {cityName || 'Mumbai'}  ·  {recs.length} places found
            {cacheHit ? '  ⚡ cached' : ''}
          </Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={handleRefresh} activeOpacity={0.75}>
          <Text style={s.refreshTxt}>↺</Text>
        </TouchableOpacity>
      </View>
      <View style={s.infoStrip}>
        <Text style={s.infoTxt}>
          Tap <Text style={{ color: COLORS.primary, fontWeight: '700' }}>+ Add to Trip</Text> on places you want to visit, then plan your route.
        </Text>
      </View>
    </View>
  );

  // ── Empty state ───────────────────────────────────────────────────────────

  const Empty = () => (
    <View style={s.emptyBox}>
      <Text style={s.emptyIcon}>🔍</Text>
      <Text style={s.emptyTitle}>No places found</Text>
      <Text style={s.emptySub}>Try widening the distance or changing your interests.</Text>
      <Button title="Go Back & Adjust" onPress={() => navigation.goBack()} variant="outline" style={{ marginTop: 20, width: 200 }} />
    </View>
  );

  // ── Bottom sticky bar ─────────────────────────────────────────────────────

  const BottomBar = () =>
    selected.length === 0 ? null : (
      <View style={s.bottomBar}>
        <View style={s.bottomLeft}>
          <View style={s.countBadge}>
            <Text style={s.countNum}>{selected.length}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.countLabel}>{selected.length === 1 ? 'place' : 'places'} selected</Text>
            <Text style={s.countNames} numberOfLines={1}>
              {selected.map(p => p.name).join(' · ')}
            </Text>
          </View>
        </View>
        <Button title="Plan Route →" onPress={handlePlanRoute} style={{ width: 140 }} />
      </View>
    );

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={s.screen}>
        <StatusBar barStyle="dark-content" backgroundColor="#F6F7FB" />
        <View style={s.loadHeader}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack("Plan")} activeOpacity={0.7}>
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Recommendations</Text>
              <Text style={s.subtitle}>📍 {cityName || 'Mumbai'}  ·  Finding best places...</Text>
            </View>
            <ActivityIndicator color={COLORS.primary} size="small" />
          </View>
        </View>
        <View style={s.skeletons}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </View>
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7FB" />
      <FlatList
        data={recs}
        keyExtractor={(item, i) => `${item.place?.place_id ?? i}`}
        renderItem={({ item, index }) => (
          <PlaceCard
            item={item}
            index={index}
            isSelected={!!selected.find(p => p.place_id === item.place?.place_id)}
            onToggle={togglePlace}
            onInteraction={logInteraction}
          />
        )}
        ListHeaderComponent={<Header />}
        ListEmptyComponent={<Empty />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
      />
      <BottomBar />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: '#F6F7FB' },
  list:       { padding: 16, paddingBottom: 140 },
  listTop:    { marginBottom: 8 },
  loadHeader: { padding: 16 },
  skeletons:  { padding: 16 },
  backBtn:    { marginTop: Platform.OS === 'ios' ? 52 : 20, width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, marginBottom: 16 },
  backArrow:  { fontSize: 20, color: COLORS.dark, fontWeight: '600' },
  headerRow:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  title:      { fontSize: 28, fontWeight: '800', color: COLORS.dark, letterSpacing: -0.5 },
  subtitle:   { fontSize: 13, color: '#7A7A9D', marginTop: 4 },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8E8F0', marginTop: 4 },
  refreshTxt: { fontSize: 20, color: COLORS.primary, fontWeight: '700' },
  infoStrip:  { backgroundColor: COLORS.white, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E8E8F0', marginBottom: 8 },
  infoTxt:    { fontSize: 13, color: '#7A7A9D', lineHeight: 19, textAlign: 'center' },
  emptyBox:   { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon:  { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.dark, marginBottom: 8 },
  emptySub:   { fontSize: 14, color: '#7A7A9D', textAlign: 'center', lineHeight: 20 },
  bottomBar:  { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, paddingHorizontal: 20, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: '#E8E8F0', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 },
  bottomLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  countBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  countNum:   { fontSize: 18, fontWeight: '800', color: COLORS.white },
  countLabel: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  countNames: { fontSize: 11, color: '#7A7A9D', maxWidth: 160 },
});

export default RecommendationScreen;