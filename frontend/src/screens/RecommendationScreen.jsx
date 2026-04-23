import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Platform, StatusBar,
  Linking, Modal, ScrollView, Image,
} from 'react-native';
import { COLORS } from '../utils/colors';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

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

// ─── Skeleton Card ────────────────────────────────────────────────────────────
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

// ─── YouTube Preview Modal ────────────────────────────────────────────────────
// ✅ Calls GET /places/{place_id}/videos to fetch YouTube videos for a place
const YouTubeModal = ({ visible, place, onClose }) => {
  const [videos,       setVideos]       = useState([]);
  const [loadingVids,  setLoadingVids]  = useState(false);

  useEffect(() => {
    if (!visible || !place) return;
    setVideos([]);
    setLoadingVids(true);

    // ✅ GET /places/{place_id}/videos?max_results=5
    api.get(`/places/${place.place_id}/videos?max_results=5`)
      .then(data => setVideos(data.videos || []))
      .catch(() => setVideos([]))
      .finally(() => setLoadingVids(false));
  }, [visible, place]);

  const openVideo = (videoId) => {
    Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`);
  };

  // Fallback: open YouTube search if no videos returned
  const openYouTubeSearch = () => {
    if (!place) return;
    const q = encodeURIComponent(`${place.name} ${place.city} travel`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${q}`);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={ytSt.overlay}>
        <View style={ytSt.sheet}>
          {/* Header */}
          <View style={ytSt.header}>
            <View style={{ flex: 1 }}>
              <Text style={ytSt.title} numberOfLines={1}>
                ▶  {place?.name}
              </Text>
              <Text style={ytSt.sub}>YouTube Previews</Text>
            </View>
            <TouchableOpacity style={ytSt.closeBtn} onPress={onClose}>
              <Text style={ytSt.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {loadingVids ? (
            <View style={ytSt.center}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={ytSt.loadTxt}>Fetching videos…</Text>
            </View>
          ) : videos.length === 0 ? (
            // No videos from API — show search fallback
            <View style={ytSt.center}>
              <Text style={ytSt.noVidIcon}>🎬</Text>
              <Text style={ytSt.noVidTxt}>No preview videos found</Text>
              <TouchableOpacity style={ytSt.searchBtn} onPress={openYouTubeSearch}>
                <Text style={ytSt.searchBtnTxt}>Search on YouTube →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              {videos.map((vid) => (
                <TouchableOpacity
                  key={vid.video_id}
                  style={ytSt.videoCard}
                  onPress={() => openVideo(vid.video_id)}
                  activeOpacity={0.8}
                >
                  {/* Thumbnail */}
                  <View style={ytSt.thumbWrap}>
                    <Image
                      source={{ uri: vid.thumbnail_url }}
                      style={ytSt.thumb}
                      resizeMode="cover"
                    />
                    <View style={ytSt.playOverlay}>
                      <Text style={ytSt.playIcon}>▶</Text>
                    </View>
                  </View>
                  {/* Info */}
                  <View style={ytSt.videoInfo}>
                    <Text style={ytSt.videoTitle} numberOfLines={2}>{vid.title}</Text>
                    <Text style={ytSt.videoChannel}>{vid.channel_title}</Text>
                    <View style={ytSt.videoMeta}>
                      {vid.duration && (
                        <View style={ytSt.metaChip}>
                          <Text style={ytSt.metaTxt}>⏱ {vid.duration}</Text>
                        </View>
                      )}
                      {vid.view_count && (
                        <View style={ytSt.metaChip}>
                          <Text style={ytSt.metaTxt}>👁 {(vid.view_count / 1000).toFixed(0)}K</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const ytSt = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', minHeight: 300 },
  header:      { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  title:       { fontSize: 16, fontWeight: '800', color: COLORS.dark },
  sub:         { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  closeBtn:    { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F6F7FB', alignItems: 'center', justifyContent: 'center' },
  closeTxt:    { fontSize: 14, color: COLORS.dark, fontWeight: '700' },
  center:      { alignItems: 'center', padding: 40, gap: 12 },
  loadTxt:     { fontSize: 13, color: COLORS.gray, marginTop: 8 },
  noVidIcon:   { fontSize: 48 },
  noVidTxt:    { fontSize: 15, fontWeight: '600', color: COLORS.dark },
  searchBtn:   { backgroundColor: '#FF0000', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  searchBtnTxt:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  videoCard:   { flexDirection: 'row', gap: 12, marginBottom: 16, backgroundColor: '#F6F7FB', borderRadius: 14, overflow: 'hidden', padding: 10 },
  thumbWrap:   { width: 120, height: 72, borderRadius: 10, overflow: 'hidden', position: 'relative', backgroundColor: '#E0E0E0' },
  thumb:       { width: '100%', height: '100%' },
  playOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  playIcon:    { color: '#fff', fontSize: 22 },
  videoInfo:   { flex: 1, justifyContent: 'space-between' },
  videoTitle:  { fontSize: 13, fontWeight: '700', color: COLORS.dark, lineHeight: 18 },
  videoChannel:{ fontSize: 11, color: COLORS.gray, marginTop: 2 },
  videoMeta:   { flexDirection: 'row', gap: 6, marginTop: 6 },
  metaChip:    { backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#E8E8F0' },
  metaTxt:     { fontSize: 11, color: COLORS.dark, fontWeight: '500' },
});

// ─── Place Card ───────────────────────────────────────────────────────────────
const PlaceCard = ({ item, index, isSelected, onToggle, onInteraction, onPreview }) => {
  const { place } = item;
  const cat = getCat(place.category);

  // ✅ Preview button calls the YouTube modal (which hits /places/{id}/videos)
  const handlePreview = () => {
    onInteraction(place.place_id, 'preview_viewed');
    onPreview(place);
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
              {place.category ? place.category.charAt(0).toUpperCase() + place.category.slice(1) : 'Place'}
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
            {/* ✅ tags is comma-separated string from backend — split it */}
            {(typeof place.tags === 'string' ? place.tags.split(',') : place.tags)
              .slice(0, 4)
              .map((tag, i) => (
                <View key={i} style={cSt.tag}>
                  <Text style={cSt.tagTxt}>{tag.trim()}</Text>
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
        {/* ✅ Preview → opens YouTube modal via /places/{id}/videos */}
        <TouchableOpacity style={cSt.iconBtn} onPress={handlePreview} activeOpacity={0.75}>
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

  const [recs,         setRecs]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState(null);
  const [selected,     setSelected]     = useState([]);
  const [cacheHit,     setCacheHit]     = useState(false);

  // YouTube modal state
  const [ytVisible,    setYtVisible]    = useState(false);
  const [ytPlace,      setYtPlace]      = useState(null);

  // ── Fetch Recommendations ─────────────────────────────────────────────────
  // ✅ POST /recommendations with { user_id, latitude, longitude, max_distance_km, limit, category_filter }
  const fetchRecs = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);

      if (isRefresh) {
        // ✅ POST /recommendations/refresh clears server-side cache
        await api.post('/recommendations/refresh').catch(() => {});
      }

      const data = await api.post('/recommendations', payload);
      setRecs(data.recommendations || []);
      setCacheHit(data.cache_hit || false);

    } catch (err) {
      setError(err.message || 'Failed to load recommendations');
      Alert.alert(
        'Could not load recommendations',
        err.message || 'Please check your connection and try again.',
        [
          { text: 'Go Back', onPress: () => navigation.goBack() },
          { text: 'Retry',   onPress: () => fetchRecs() },
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [payload]);

  useEffect(() => { fetchRecs(); }, [fetchRecs]);

  // ── Log Interaction ───────────────────────────────────────────────────────
  // ✅ POST /interactions — silent, never blocks UI
  const logInteraction = useCallback(async (placeId, interactionType) => {
    try {
      await api.post('/interactions', {
        place_id:         placeId,
        interaction_type: interactionType,
        session_id:       null,
      });
    } catch (_) { /* intentionally silent */ }
  }, []);

  // ── YouTube Preview ───────────────────────────────────────────────────────
  // ✅ Opens modal which calls GET /places/{place_id}/videos
  const handlePreview = useCallback((place) => {
    setYtPlace(place);
    setYtVisible(true);
  }, []);

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
  // ✅ Passes selectedPlaces to RoutesScreen which builds /routes payload
  const handlePlanRoute = () => {
    if (selected.length < 2) {
      Alert.alert('Add More Places', 'Select at least 2 places to plan a route.');
      return;
    }
    selected.forEach(p => logInteraction(p.place_id, 'route_requested'));
    navigation.navigate('Routes', {
      selectedPlaces: selected,
      userId:   user?.user_id,
      cityName: cityName || '',
    });
  };

  const handleRefresh = () => fetchRecs(true);

  // ── List Header ───────────────────────────────────────────────────────────
  const Header = () => (
    <View style={s.listTop}>
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.navigate('Plan')} activeOpacity={0.7}>
        <Text style={s.backArrow}>←</Text>
      </TouchableOpacity>
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Recommendations</Text>
          <Text style={s.subtitle}>
            📍 {cityName || 'Nearby'}  ·  {recs.length} places found
            {cacheHit ? '  ⚡ cached' : ''}
          </Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={handleRefresh} activeOpacity={0.75} disabled={refreshing}>
          {refreshing
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Text style={s.refreshTxt}>↺</Text>
          }
        </TouchableOpacity>
      </View>
      <View style={s.infoStrip}>
        <Text style={s.infoTxt}>
          Tap <Text style={{ color: COLORS.primary, fontWeight: '700' }}>▶ Preview</Text> to watch YouTube videos, then{' '}
          <Text style={{ color: COLORS.primary, fontWeight: '700' }}>+ Add to Trip</Text> to select places.
        </Text>
      </View>
    </View>
  );

  // ── Empty state ───────────────────────────────────────────────────────────
  const Empty = () => (
    <View style={s.emptyBox}>
      <Text style={s.emptyIcon}>{error ? '⚠️' : '🔍'}</Text>
      <Text style={s.emptyTitle}>{error ? 'Something went wrong' : 'No places found'}</Text>
      <Text style={s.emptySub}>{error || 'Try widening the distance or changing your interests.'}</Text>
      <Button
        title={error ? 'Retry' : 'Go Back & Adjust'}
        onPress={error ? () => fetchRecs() : () => navigation.goBack()}
        variant="outline"
        style={{ marginTop: 20, width: 200 }}
      />
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
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Recommendations</Text>
              <Text style={s.subtitle}>📍 {cityName || 'Nearby'}  ·  Finding best places...</Text>
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
            onPreview={handlePreview}
          />
        )}
        ListHeaderComponent={<Header />}
        ListEmptyComponent={<Empty />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
      />

      <BottomBar />

      {/* ✅ YouTube Preview Modal — fetches from GET /places/{place_id}/videos */}
      <YouTubeModal
        visible={ytVisible}
        place={ytPlace}
        onClose={() => { setYtVisible(false); setYtPlace(null); }}
      />
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