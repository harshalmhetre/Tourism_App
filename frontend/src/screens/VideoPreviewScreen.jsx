import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, Platform, StatusBar, Animated,
  ScrollView, Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS } from '../utils/colors';

const BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000'
  : 'http://127.0.0.1:8000';

// ─── Duration formatter ───────────────────────────────────────────────────────
const formatDuration = (iso) => {
  if (!iso) return '';
  // PT1H2M3S → 1:02:03 / PT4M5S → 4:05
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;
  const h = parseInt(match[1] || 0);
  const m = parseInt(match[2] || 0);
  const s = parseInt(match[3] || 0);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const formatViews = (n) => {
  if (!n) return '0 views';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
  return `${n} views`;
};

const formatDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
};

// ─── Embedded YouTube Player ──────────────────────────────────────────────────
const YoutubePlayer = ({ videoId, onClose }) => {
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  return (
    <View style={yt.wrap}>
      <WebView
        source={{ uri: embedUrl }}
        style={yt.player}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
      />
      <TouchableOpacity style={yt.closeBtn} onPress={onClose} activeOpacity={0.8}>
        <Text style={yt.closeTxt}>✕  Close Player</Text>
      </TouchableOpacity>
    </View>
  );
};

const yt = StyleSheet.create({
  wrap:     { backgroundColor: '#000', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  player:   { width: '100%', height: 210, backgroundColor: '#000' },
  closeBtn: { backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', paddingVertical: 10 },
  closeTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

// ─── Video Row Card ───────────────────────────────────────────────────────────
const VideoCard = ({ video, index, active, onPlay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 70, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity style={[vc.card, active && vc.cardActive]} onPress={() => onPlay(video)} activeOpacity={0.85}>
        {/* Thumbnail placeholder + play overlay */}
        <View style={vc.thumbWrap}>
          <View style={vc.thumb}>
            <Text style={vc.thumbEmoji}>🎬</Text>
          </View>
          <View style={[vc.playOverlay, active && vc.playOverlayActive]}>
            <Text style={[vc.playIcon, active && vc.playIconActive]}>{active ? '▶' : '▷'}</Text>
          </View>
          {video.duration && (
            <View style={vc.durationBadge}>
              <Text style={vc.durationTxt}>{formatDuration(video.duration)}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={vc.info}>
          <Text style={[vc.title, active && vc.titleActive]} numberOfLines={2}>{video.title}</Text>
          <Text style={vc.channel} numberOfLines={1}>📺 {video.channel_title}</Text>
          <View style={vc.metaRow}>
            <Text style={vc.meta}>{formatViews(video.view_count)}</Text>
            <Text style={vc.metaDot}>·</Text>
            <Text style={vc.meta}>{formatDate(video.published_at)}</Text>
          </View>
        </View>

        {/* Open in YouTube */}
        <TouchableOpacity
          style={vc.ytBtn}
          onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${video.video_id}`)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={vc.ytBtnTxt}>↗</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const vc = StyleSheet.create({
  card:           { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1.5, borderColor: '#F0F0F0', alignItems: 'flex-start', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardActive:     { borderColor: COLORS.primary, backgroundColor: '#FFFBFA' },
  thumbWrap:      { position: 'relative', width: 90, height: 62, borderRadius: 10, overflow: 'hidden', flexShrink: 0 },
  thumb:          { width: '100%', height: '100%', backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center' },
  thumbEmoji:     { fontSize: 28 },
  playOverlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  playOverlayActive: { backgroundColor: 'rgba(255,80,40,0.4)' },
  playIcon:       { fontSize: 22, color: 'rgba(255,255,255,0.9)' },
  playIconActive: { color: '#fff' },
  durationBadge:  { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  durationTxt:    { fontSize: 10, color: '#fff', fontWeight: '700' },
  info:           { flex: 1 },
  title:          { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 4, lineHeight: 18 },
  titleActive:    { color: COLORS.primary },
  channel:        { fontSize: 11, color: '#7A7A9D', marginBottom: 4, fontWeight: '500' },
  metaRow:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta:           { fontSize: 11, color: '#ABABC0', fontWeight: '400' },
  metaDot:        { fontSize: 11, color: '#D0D0E0' },
  ytBtn:          { width: 30, height: 30, borderRadius: 8, backgroundColor: '#FFF3EF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFD5C8', flexShrink: 0 },
  ytBtnTxt:       { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const VideoPreviewScreen = ({ route, navigation }) => {
  const { place } = route.params || {};

  const [loading, setLoading]         = useState(true);
  const [videos, setVideos]           = useState([]);
  const [activeVideo, setActiveVideo] = useState(null);
  const [error, setError]             = useState(null);
  const [maxResults, setMaxResults]   = useState(5);

  useEffect(() => { fetchVideos(maxResults); }, []);

  const fetchVideos = async (limit = maxResults) => {
    if (!place?.place_id) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `${BASE_URL}/places/${place.place_id}/videos?max_results=${limit}`,
        { headers: { 'Accept': 'application/json' } }
      );
      const data = await response.json();
      if (response.ok) {
        setVideos(data.videos || []);
        // Auto-play first video
        if (data.videos?.length > 0) setActiveVideo(data.videos[0]);
      } else {
        setError('Could not load videos for this place.');
      }
    } catch (err) {
      setError('Network error — could not reach server.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (video) => {
    setActiveVideo(prev => prev?.video_id === video.video_id ? null : video);
  };

  const handleLoadMore = () => {
    const next = maxResults + 5;
    setMaxResults(next);
    fetchVideos(next);
  };

  return (
    <View style={vs.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

      {/* ── Dark Hero Header ─────────────────────────────────────────────── */}
      <View style={vs.hero}>
        <TouchableOpacity style={vs.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={vs.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={vs.heroText}>
          <Text style={vs.heroLabel}>Preview</Text>
          <Text style={vs.heroTitle} numberOfLines={2}>{place?.name || 'Place Videos'}</Text>
          {place?.city && <Text style={vs.heroSub}>📍 {place.city}</Text>}
        </View>
        <View style={vs.videoBadge}>
          <Text style={vs.videoBadgeTxt}>{videos.length}</Text>
          <Text style={vs.videoBadgeLbl}>videos</Text>
        </View>
      </View>

      <ScrollView
        style={vs.scroll}
        contentContainerStyle={vs.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Active Player ─────────────────────────────────────────────── */}
        {activeVideo && (
          <YoutubePlayer
            videoId={activeVideo.video_id}
            onClose={() => setActiveVideo(null)}
          />
        )}

        {/* ── Active video description ─────────────────────────────────── */}
        {activeVideo && (
          <View style={vs.descCard}>
            <Text style={vs.descTitle}>{activeVideo.title}</Text>
            {activeVideo.description ? (
              <Text style={vs.descBody} numberOfLines={4}>{activeVideo.description}</Text>
            ) : null}
          </View>
        )}

        {/* ── Video list ───────────────────────────────────────────────── */}
        <View style={vs.listHeader}>
          <Text style={vs.listTitle}>
            {loading ? 'Loading videos…' : `${videos.length} Videos`}
          </Text>
          {!loading && videos.length > 0 && (
            <Text style={vs.listSub}>Tap to play inline</Text>
          )}
        </View>

        {loading ? (
          <View style={vs.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={vs.loadingTxt}>Fetching videos for {place?.name}…</Text>
          </View>
        ) : error ? (
          <View style={vs.errorWrap}>
            <Text style={vs.errorEmoji}>📺</Text>
            <Text style={vs.errorTxt}>{error}</Text>
            <TouchableOpacity style={vs.retryBtn} onPress={() => fetchVideos()}>
              <Text style={vs.retryBtnTxt}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : videos.length === 0 ? (
          <View style={vs.emptyWrap}>
            <Text style={vs.emptyEmoji}>🎬</Text>
            <Text style={vs.emptyTxt}>No videos found for this place yet.</Text>
          </View>
        ) : (
          <>
            {videos.map((video, index) => (
              <VideoCard
                key={video.video_id}
                video={video}
                index={index}
                active={activeVideo?.video_id === video.video_id}
                onPlay={handlePlay}
              />
            ))}

            {/* Load more */}
            <TouchableOpacity style={vs.loadMoreBtn} onPress={handleLoadMore} activeOpacity={0.8}>
              <Text style={vs.loadMoreTxt}>Load More Videos</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const vs = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: '#F6F7FB' },
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },

  // Hero
  hero:          { backgroundColor: '#1A1A2E', paddingTop: Platform.OS === 'ios' ? 52 : 24, paddingBottom: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  backBtn:       { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  backArrow:     { fontSize: 20, color: '#fff', fontWeight: '600' },
  heroText:      { flex: 1 },
  heroLabel:     { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  heroTitle:     { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 28, letterSpacing: -0.3 },
  heroSub:       { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4, fontWeight: '500' },
  videoBadge:    { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginTop: 2 },
  videoBadgeTxt: { fontSize: 20, fontWeight: '900', color: '#fff' },
  videoBadgeLbl: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Description card
  descCard:  { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#F0F0F0' },
  descTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A2E', marginBottom: 6 },
  descBody:  { fontSize: 13, color: '#666', lineHeight: 19 },

  // List header
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  listTitle:  { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  listSub:    { fontSize: 12, color: '#7A7A9D', fontWeight: '500' },

  // States
  loadingWrap: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingTxt:  { fontSize: 14, color: '#7A7A9D', fontWeight: '500', textAlign: 'center' },
  errorWrap:   { alignItems: 'center', paddingVertical: 40, gap: 12 },
  errorEmoji:  { fontSize: 40 },
  errorTxt:    { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  retryBtn:    { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyWrap:   { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyEmoji:  { fontSize: 40 },
  emptyTxt:    { fontSize: 14, color: '#7A7A9D', textAlign: 'center' },

  // Load more
  loadMoreBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4, borderWidth: 1.5, borderColor: '#E8E8F0' },
  loadMoreTxt: { fontSize: 13, fontWeight: '700', color: '#7A7A9D' },
});

export default VideoPreviewScreen;