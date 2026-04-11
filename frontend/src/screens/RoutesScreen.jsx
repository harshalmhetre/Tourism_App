import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, StatusBar, Linking,
} from 'react-native';
import MapView, { Marker, Polyline, Callout } from 'react-native-maps';
import { COLORS } from '../utils/colors';
import Button from '../components/Button';
import api from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// 🟡 MOCK DATA — for UI preview only.
//
// TO SWITCH TO REAL API when backend is ready:
//   1. Delete MOCK_WAYPOINTS + MOCK_ROUTE_DATA constants (this whole block)
//   2. Inside RoutesScreen, delete the "── MOCK useEffect ──" block
//   3. Uncomment the "── REAL fetchRoute ──" block inside RoutesScreen
//   4. Uncomment the handleModeChange real fetchRoute call
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_WAYPOINTS = [
  {
    place_id: 1,
    name: 'Gateway of India',
    latitude: 18.9220,
    longitude: 72.8347,
    visit_duration_minutes: 60,
    popularity_score: 95,
  },
  {
    place_id: 2,
    name: 'Marine Drive',
    latitude: 18.9440,
    longitude: 72.8232,
    visit_duration_minutes: 45,
    popularity_score: 92,
  },
  {
    place_id: 3,
    name: 'Siddhivinayak Temple',
    latitude: 19.0167,
    longitude: 72.8301,
    visit_duration_minutes: 45,
    popularity_score: 90,
  },
  {
    place_id: 4,
    name: 'Juhu Beach',
    latitude: 19.0883,
    longitude: 72.8262,
    visit_duration_minutes: 120,
    popularity_score: 85,
  },
];

const MOCK_ROUTE_DATA = {
  total_distance_km: 23.6,
  total_duration_minutes: 48,
  total_traffic_signals: 12,
  optimized_waypoints: MOCK_WAYPOINTS,
  segments: [
    {
      from_place: 'Gateway of India',
      to_place: 'Marine Drive',
      distance_km: 2.8,
      duration_minutes: 9,
      traffic_signals: 3,
      geometry: [
        [18.9220, 72.8347],
        [18.9280, 72.8310],
        [18.9350, 72.8270],
        [18.9440, 72.8232],
      ],
    },
    {
      from_place: 'Marine Drive',
      to_place: 'Siddhivinayak Temple',
      distance_km: 8.4,
      duration_minutes: 22,
      traffic_signals: 6,
      geometry: [
        [18.9440, 72.8232],
        [18.9600, 72.8240],
        [18.9800, 72.8260],
        [19.0000, 72.8280],
        [19.0167, 72.8301],
      ],
    },
    {
      from_place: 'Siddhivinayak Temple',
      to_place: 'Juhu Beach',
      distance_km: 12.4,
      duration_minutes: 17,
      traffic_signals: 3,
      geometry: [
        [19.0167, 72.8301],
        [19.0350, 72.8285],
        [19.0550, 72.8270],
        [19.0750, 72.8265],
        [19.0883, 72.8262],
      ],
    },
  ],
  map_url: 'https://www.openstreetmap.org/directions',
};

// ─── END MOCK DATA ────────────────────────────────────────────────────────────

// ─── Transport modes ──────────────────────────────────────────────────────────

const TRANSPORT_MODES = [
  { key: 'driving', label: 'Drive', emoji: '🚗' },
  { key: 'walking', label: 'Walk',  emoji: '🚶' },
  { key: 'cycling', label: 'Cycle', emoji: '🚴' },
];

// ─── Marker helpers ───────────────────────────────────────────────────────────

const markerColor = (index, total) => {
  if (index === 0)         return COLORS.success;  // green — Start
  if (index === total - 1) return COLORS.primary;  // orange — End
  return COLORS.accent;                             // teal — middle stops
};

const markerLabel = (index, total) => {
  if (index === 0)         return 'S';
  if (index === total - 1) return 'E';
  return String(index);
};

// ─── Custom map marker ────────────────────────────────────────────────────────

const StopMarker = ({ index, total }) => (
  <View style={mkSt.wrap}>
    <View style={[mkSt.circle, { backgroundColor: markerColor(index, total) }]}>
      <Text style={mkSt.label}>{markerLabel(index, total)}</Text>
    </View>
  </View>
);

const mkSt = StyleSheet.create({
  wrap:   { alignItems: 'center' },
  circle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.white,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  label: { fontSize: 12, fontWeight: '800', color: COLORS.white },
});

// ─── Segment card ─────────────────────────────────────────────────────────────

const SegmentCard = ({ seg }) => (
  <View style={segSt.card}>
    <View style={segSt.arrow}>
      <Text style={segSt.arrowTxt}>→</Text>
    </View>
    <View style={segSt.info}>
      <Text style={segSt.fromTxt} numberOfLines={1}>
        <Text style={segSt.dimLabel}>From  </Text>{seg.from_place}
      </Text>
      <Text style={segSt.toTxt} numberOfLines={1}>
        <Text style={segSt.dimLabel}>To  </Text>{seg.to_place}
      </Text>
      <View style={segSt.metaRow}>
        <View style={segSt.metaChip}>
          <Text style={segSt.metaTxt}>📏 {seg.distance_km.toFixed(1)} km</Text>
        </View>
        <View style={segSt.metaChip}>
          <Text style={segSt.metaTxt}>⏱ {Math.round(seg.duration_minutes)} min</Text>
        </View>
        {seg.traffic_signals > 0 && (
          <View style={[segSt.metaChip, segSt.signalChip]}>
            <Text style={segSt.signalTxt}>🚦 {seg.traffic_signals}</Text>
          </View>
        )}
      </View>
    </View>
  </View>
);

const segSt = StyleSheet.create({
  card:       { backgroundColor: COLORS.white, borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 12, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  arrow:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF3EF', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.primary, flexShrink: 0 },
  arrowTxt:   { fontSize: 16, color: COLORS.primary, fontWeight: '700' },
  info:       { flex: 1 },
  dimLabel:   { fontWeight: '400', color: '#7A7A9D' },
  fromTxt:    { fontSize: 13, fontWeight: '700', color: COLORS.dark, marginBottom: 3 },
  toTxt:      { fontSize: 13, fontWeight: '700', color: COLORS.dark, marginBottom: 8 },
  metaRow:    { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  metaChip:   { backgroundColor: '#F6F7FB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#E8E8F0' },
  metaTxt:    { fontSize: 12, color: COLORS.dark, fontWeight: '500' },
  signalChip: { backgroundColor: '#FFF8E1', borderColor: '#FFE082' },
  signalTxt:  { fontSize: 12, color: '#F57F17', fontWeight: '600' },
});

// ─── Stop list item ───────────────────────────────────────────────────────────

const StopItem = ({ place, index, total }) => {
  const isStart = index === 0;
  const isEnd   = index === total - 1;
  return (
    <View style={stopSt.row}>
      {index > 0 && <View style={stopSt.lineAbove} />}
      <View style={[stopSt.dot, { backgroundColor: markerColor(index, total) }]}>
        <Text style={stopSt.dotTxt}>{markerLabel(index, total)}</Text>
      </View>
      <View style={stopSt.textBlock}>
        <Text style={stopSt.stopName} numberOfLines={1}>{place.name}</Text>
        <Text style={stopSt.stopMeta}>
          {isStart ? '🚀 Start here' : isEnd ? '🏁 End here' : `Stop ${index}`}
          {place.visit_duration_minutes ? `  ·  ${place.visit_duration_minutes} min visit` : ''}
        </Text>
      </View>
    </View>
  );
};

const stopSt = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, position: 'relative' },
  lineAbove: { position: 'absolute', left: 14, top: 0, width: 2, height: 8, backgroundColor: '#E8E8F0' },
  dot:       { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.white, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 3, flexShrink: 0 },
  dotTxt:    { fontSize: 11, fontWeight: '800', color: COLORS.white },
  textBlock: { flex: 1 },
  stopName:  { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  stopMeta:  { fontSize: 12, color: '#7A7A9D', marginTop: 1 },
});

// ─── Stat pill ────────────────────────────────────────────────────────────────

const StatPill = ({ icon, value, label }) => (
  <View style={statSt.pill}>
    <Text style={statSt.icon}>{icon}</Text>
    <Text style={statSt.value}>{value}</Text>
    <Text style={statSt.label}>{label}</Text>
  </View>
);

const statSt = StyleSheet.create({
  pill:  { flex: 1, alignItems: 'center', paddingVertical: 14, backgroundColor: COLORS.white, borderRadius: 16, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  icon:  { fontSize: 20, marginBottom: 4 },
  value: { fontSize: 20, fontWeight: '800', color: COLORS.dark, letterSpacing: -0.5 },
  label: { fontSize: 11, color: '#7A7A9D', marginTop: 2, fontWeight: '500' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const RoutesScreen = ({ route, navigation }) => {
  // In real app these come from navigation params; mock ignores them
  const { selectedPlaces = [], userId, cityName } = route.params || {};

  const mapRef = useRef(null);
  const [mode, setMode]           = useState('driving');
  const [loading, setLoading]     = useState(true);
  const [routeData, setRouteData] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const [tab, setTab]             = useState('map');

  // ── MOCK useEffect — delete this block when switching to real API ──────────
  useEffect(() => {
    const t = setTimeout(() => {
      setWaypoints(MOCK_ROUTE_DATA.optimized_waypoints);
      setRouteData(MOCK_ROUTE_DATA);
      setLoading(false);
      // Auto-fit map to show all 4 markers
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          MOCK_ROUTE_DATA.optimized_waypoints.map(p => ({
            latitude: p.latitude,
            longitude: p.longitude,
          })),
          { edgePadding: { top: 60, right: 40, bottom: 60, left: 40 }, animated: true },
        );
      }, 400);
    }, 1500); // 1.5s fake loading so the spinner is visible
    return () => clearTimeout(t);
  }, []);
  // ── END MOCK useEffect ────────────────────────────────────────────────────

  // ── REAL fetchRoute — uncomment this entire block when backend is ready ───
  // const fetchRoute = useCallback(async (transport = mode) => {
  //   if (!selectedPlaces || selectedPlaces.length < 2) return;
  //   setLoading(true);
  //   setRouteData(null);
  //   try {
  //     // axios interceptor auto-attaches token + returns response.data directly
  //     const data = await api.post('/routes', {
  //       user_id: userId,
  //       waypoints: selectedPlaces.map((p, i) => ({
  //         place_id:               p.place_id,
  //         latitude:               p.latitude,
  //         longitude:              p.longitude,
  //         name:                   p.name,
  //         order:                  i,
  //         visit_duration_minutes: p.visit_duration_minutes ?? 60,
  //         popularity_score:       Math.round(p.popularity_score ?? 50),
  //       })),
  //       optimize:       true,
  //       transport_mode: transport,
  //     });
  //     setRouteData(data);
  //     if (data.optimized_waypoints?.length > 0) {
  //       setWaypoints(
  //         data.optimized_waypoints.map(
  //           wp => selectedPlaces.find(p => p.place_id === wp.place_id) ?? wp,
  //         ),
  //       );
  //     }
  //     setTimeout(() => {
  //       mapRef.current?.fitToCoordinates(
  //         (data.optimized_waypoints || selectedPlaces).map(p => ({
  //           latitude: p.latitude, longitude: p.longitude,
  //         })),
  //         { edgePadding: { top: 80, right: 40, bottom: 80, left: 40 }, animated: true },
  //       );
  //     }, 300);
  //   } catch (err) {
  //     Alert.alert('Route Error', err.message || 'Could not calculate route.');
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [selectedPlaces, mode, userId]);
  // useEffect(() => { fetchRoute(); }, []);
  // ── END REAL fetchRoute ───────────────────────────────────────────────────

  // ── Transport mode switch ─────────────────────────────────────────────────

  const handleModeChange = (m) => {
    setMode(m);
    setLoading(true);
    // MOCK: adjust durations by mode multiplier so the UI feels interactive
    const mult = m === 'walking' ? 5 : m === 'cycling' ? 2.5 : 1;
    setTimeout(() => {
      setRouteData({
        ...MOCK_ROUTE_DATA,
        total_duration_minutes: Math.round(MOCK_ROUTE_DATA.total_duration_minutes * mult),
        segments: MOCK_ROUTE_DATA.segments.map(seg => ({
          ...seg,
          duration_minutes: Math.round(seg.duration_minutes * mult),
        })),
      });
      setLoading(false);
    }, 800);
    // REAL API: replace the block above with → fetchRoute(m);
  };

  // ── Polyline coords built from segment geometry ───────────────────────────

  const polylineCoords = routeData?.segments
    ? routeData.segments.flatMap(seg =>
        (seg.geometry || []).map(([lat, lon]) => ({ latitude: lat, longitude: lon })),
      )
    : waypoints.map(p => ({ latitude: p.latitude, longitude: p.longitude }));

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7FB" />

      {/* ── Map (top 42%) ── */}
      <View style={s.mapWrap}>
        <MapView
          ref={mapRef}
          style={s.map}
          initialRegion={{
            latitude:      18.9700,
            longitude:     72.8300,
            latitudeDelta: 0.20,
            longitudeDelta: 0.12,
          }}
        >
          {/* Route polyline — dashed while loading, solid once route is ready */}
          {polylineCoords.length > 1 && (
            <Polyline
              coordinates={polylineCoords}
              strokeColor={routeData ? COLORS.primary : COLORS.light}
              strokeWidth={routeData ? 4 : 2}
              lineDashPattern={routeData ? null : [8, 6]}
            />
          )}

          {/* Markers for each stop */}
          {waypoints.map((place, i) => (
            <Marker
              key={place.place_id}
              coordinate={{ latitude: place.latitude, longitude: place.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <StopMarker index={i} total={waypoints.length} />
              <Callout>
                <View style={s.callout}>
                  <Text style={s.calloutName}>{place.name}</Text>
                  <Text style={s.calloutMeta}>
                    Stop {i + 1} of {waypoints.length}
                    {place.visit_duration_minutes ? `  ·  ${place.visit_duration_minutes} min` : ''}
                  </Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>

        {/* Spinner overlay on map while calculating */}
        {loading && (
          <View style={s.mapOverlay}>
            <View style={s.mapOverlayCard}>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <Text style={s.mapOverlayTxt}>Optimising route...</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Bottom sheet ── */}
      <ScrollView
        style={s.sheet}
        contentContainerStyle={s.sheetContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Handle row with back button */}
        <View style={s.handleRow}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={s.handle} />
          <View style={{ width: 40 }} />
        </View>

        {/* Page header — same pattern as LoginScreen */}
        <View style={s.header}>
          <Text style={s.title}>Your Route</Text>
          <Text style={s.subtitle}>
            📍 {cityName || 'Mumbai'}  ·  {waypoints.length} stops
          </Text>
        </View>

        {/* Transport mode selector */}
        <View style={s.modeRow}>
          {TRANSPORT_MODES.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[s.modeBtn, mode === m.key && s.modeBtnActive]}
              onPress={() => handleModeChange(m.key)}
              activeOpacity={0.75}
              disabled={loading}
            >
              <Text style={s.modeEmoji}>{m.emoji}</Text>
              <Text style={[s.modeTxt, mode === m.key && s.modeTxtActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats pills — visible once route is loaded */}
        {routeData && !loading && (
          <View style={s.statsRow}>
            <StatPill
              icon="📏"
              value={`${routeData.total_distance_km?.toFixed(1) ?? '—'}`}
              label="km total"
            />
            <StatPill
              icon="⏱"
              value={`${Math.round(routeData.total_duration_minutes ?? 0)}`}
              label="min travel"
            />
            <StatPill
              icon="🚦"
              value={`${routeData.total_traffic_signals ?? 0}`}
              label="signals"
            />
          </View>
        )}

        {/* Tab bar */}
        <View style={s.tabBar}>
          {[
            { key: 'map',      label: 'Overview' },
            { key: 'stops',    label: 'Stops' },
            { key: 'segments', label: 'Segments' },
          ].map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, tab === t.key && s.tabActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.75}
            >
              <Text style={[s.tabTxt, tab === t.key && s.tabTxtActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tab: Overview ── */}
        {tab === 'map' && (
          <View style={s.overviewCard}>
            <Text style={s.sectionLabel}>Route Overview</Text>
            {loading ? (
              <View style={s.waitRow}>
                <ActivityIndicator color={COLORS.primary} size="small" />
                <Text style={s.waitTxt}>  Calculating optimised route…</Text>
              </View>
            ) : routeData ? (
              <>
                <View style={s.overviewRow}>
                  <Text style={s.overviewIcon}>🗺</Text>
                  <Text style={s.overviewTxt}>
                    Optimised route for {waypoints.length} stops via {mode}
                  </Text>
                </View>
                <View style={s.overviewRow}>
                  <Text style={s.overviewIcon}>✅</Text>
                  <Text style={s.overviewTxt}>
                    Stops reordered to minimise total travel time
                  </Text>
                </View>
                {(routeData.total_traffic_signals ?? 0) > 0 && (
                  <View style={s.overviewRow}>
                    <Text style={s.overviewIcon}>🚦</Text>
                    <Text style={s.overviewTxt}>
                      {routeData.total_traffic_signals} traffic signals along the route
                    </Text>
                  </View>
                )}
                <View style={s.overviewRow}>
                  <Text style={s.overviewIcon}>⏱</Text>
                  <Text style={s.overviewTxt}>
                    Estimated visit time at all stops:{' '}
                    {waypoints.reduce((a, p) => a + (p.visit_duration_minutes || 60), 0)} min
                  </Text>
                </View>
                {routeData.map_url && (
                  <Button
                    title="Open in Maps App"
                    onPress={() => Linking.openURL(routeData.map_url)}
                    variant="outline"
                    style={{ marginTop: 12 }}
                  />
                )}
              </>
            ) : (
              <Text style={s.waitTxt}>Route not loaded. Tap Recalculate below.</Text>
            )}
          </View>
        )}

        {/* ── Tab: Stops ── */}
        {tab === 'stops' && (
          <View style={s.stopsCard}>
            <Text style={s.sectionLabel}>
              Stop Order{routeData ? ' (Optimised)' : ''}
            </Text>
            {waypoints.map((place, i) => (
              <React.Fragment key={place.place_id}>
                <StopItem place={place} index={i} total={waypoints.length} />
                {i < waypoints.length - 1 && <View style={s.stopDivider} />}
              </React.Fragment>
            ))}
          </View>
        )}

        {/* ── Tab: Segments ── */}
        {tab === 'segments' && (
          <View>
            <Text style={[s.sectionLabel, { marginBottom: 8 }]}>
              Leg-by-leg Breakdown
            </Text>
            {loading ? (
              <View style={s.waitRow}>
                <ActivityIndicator color={COLORS.primary} size="small" />
                <Text style={s.waitTxt}>  Calculating segments…</Text>
              </View>
            ) : routeData?.segments?.length > 0 ? (
              routeData.segments.map((seg, i) => (
                <SegmentCard key={i} seg={seg} />
              ))
            ) : (
              <Text style={s.waitTxt}>
                No segment data yet. Tap Recalculate below.
              </Text>
            )}
          </View>
        )}

        {/* Recalculate */}
        <Button
          title={loading ? 'Recalculating…' : '↺  Recalculate Route'}
          onPress={() => handleModeChange(mode)}
          loading={loading}
          variant="outline"
          style={s.recalcBtn}
        />
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7FB' },

  // Map
  mapWrap:        { height: 300, position: 'relative' },
  map:            { ...StyleSheet.absoluteFillObject },
  mapOverlay:     { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.15)' },
  mapOverlayCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  mapOverlayTxt:  { fontSize: 14, fontWeight: '600', color: COLORS.dark },

  callout:     { padding: 8, minWidth: 160 },
  calloutName: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  calloutMeta: { fontSize: 12, color: '#7A7A9D', marginTop: 2 },

  // Bottom sheet
  sheet:        { flex: 1, backgroundColor: '#F6F7FB' },
  sheetContent: { padding: 16, paddingBottom: 48 },

  handleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  handle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D7D7D7' },

  backBtn:   { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  backArrow: { fontSize: 20, color: COLORS.dark, fontWeight: '600' },

  // Header — same weight / size as LoginScreen
  header:   { marginBottom: 16 },
  title:    { fontSize: 28, fontWeight: '800', color: COLORS.dark, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#7A7A9D', marginTop: 4 },

  // Transport
  modeRow:       { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modeBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#E8E8F0', backgroundColor: COLORS.white },
  modeBtnActive: { backgroundColor: '#FFF3EF', borderColor: COLORS.primary },
  modeEmoji:     { fontSize: 16 },
  modeTxt:       { fontSize: 12, color: COLORS.gray, fontWeight: '500' },
  modeTxtActive: { color: COLORS.primary, fontWeight: '700' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },

  // Tab bar
  tabBar:       { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 14, padding: 4, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  tab:          { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabActive:    { backgroundColor: COLORS.primary },
  tabTxt:       { fontSize: 13, color: COLORS.gray, fontWeight: '500' },
  tabTxtActive: { color: COLORS.white, fontWeight: '700' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.dark, marginBottom: 12 },

  // Overview card — same shadow / radius as LoginScreen formCard
  overviewCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 16, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, marginBottom: 16 },
  overviewRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  overviewIcon: { fontSize: 16, width: 22, marginTop: 1 },
  overviewTxt:  { flex: 1, fontSize: 13, color: '#444', lineHeight: 20, fontWeight: '500' },

  // Stops card
  stopsCard:   { backgroundColor: COLORS.white, borderRadius: 20, padding: 16, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, marginBottom: 16 },
  stopDivider: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 42 },

  waitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  waitTxt: { fontSize: 13, color: '#7A7A9D' },

  recalcBtn: { marginTop: 8 },
});

export default RoutesScreen;