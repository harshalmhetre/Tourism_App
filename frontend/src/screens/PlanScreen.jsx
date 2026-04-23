import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Alert, StatusBar,
} from 'react-native';
import { COLORS } from '../utils/colors';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

// ─── Maharashtra Cities with lat/lng ─────────────────────────────────────────
// ✅ latitude/longitude go directly into POST /recommendations payload
const MAHARASHTRA_CITIES = [
  { key: 'nashik',         label: 'Nashik',         emoji: '🍇', latitude: 19.9975, longitude: 73.7898 },
  { key: 'mumbai',         label: 'Mumbai',         emoji: '🌆', latitude: 19.0760, longitude: 72.8777 },
  { key: 'pune',           label: 'Pune',           emoji: '🏫', latitude: 18.5204, longitude: 73.8567 },
  { key: 'sambhaji_nagar', label: 'Sambhaji Nagar', emoji: '🏰', latitude: 19.8762, longitude: 75.3433 },
  { key: 'nagpur',         label: 'Nagpur',         emoji: '🟠', latitude: 21.1458, longitude: 79.0882 },
  { key: 'kolhapur',       label: 'Kolhapur',       emoji: '👑', latitude: 16.7050, longitude: 74.2433 },
  { key: 'solapur',        label: 'Solapur',        emoji: '🕌', latitude: 17.6805, longitude: 75.9064 },
];

const CATEGORIES = [
  { key: 'historical',    label: 'Historical',    emoji: '🏛️' },
  { key: 'nature',        label: 'Nature',        emoji: '🌿' },
  { key: 'adventure',     label: 'Adventure',     emoji: '🧗' },
  { key: 'religious',     label: 'Religious',     emoji: '🛕' },
  { key: 'beach',         label: 'Beach',         emoji: '🏖️' },
  { key: 'museum',        label: 'Museum',        emoji: '🏺' },
  { key: 'food',          label: 'Food',          emoji: '🍽️' },
  { key: 'cultural',      label: 'Cultural',      emoji: '🎭' },
  { key: 'shopping',      label: 'Shopping',      emoji: '🛍️' },
  { key: 'wellness',      label: 'Wellness',      emoji: '🧘' },
  { key: 'nightlife',     label: 'Nightlife',     emoji: '🌙' },
  { key: 'entertainment', label: 'Entertainment', emoji: '🎡' },
];

const COMPANION_TYPES = [
  { key: 'solo',     label: 'Solo',     emoji: '🧍' },
  { key: 'couple',   label: 'Couple',   emoji: '👫' },
  { key: 'family',   label: 'Family',   emoji: '👨‍👩‍👧' },
  { key: 'friends',  label: 'Friends',  emoji: '👯' },
  { key: 'business', label: 'Business', emoji: '💼' },
];

const DISTANCES   = [10, 20, 30, 50, 100];
const LIMITS      = [5, 10, 15, 20];
const TOTAL_STEPS = 3;

// ─── Step Indicator ───────────────────────────────────────────────────────────
const StepIndicator = ({ currentStep }) => (
  <View style={stepSt.wrapper}>
    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
      <React.Fragment key={i}>
        <View style={[
          stepSt.dot,
          i === currentStep && stepSt.dotActive,
          i < currentStep  && stepSt.dotDone,
        ]}>
          {i < currentStep
            ? <Text style={stepSt.check}>✓</Text>
            : <Text style={[stepSt.num, i === currentStep && stepSt.numActive]}>{i + 1}</Text>
          }
        </View>
        {i < TOTAL_STEPS - 1 && (
          <View style={[stepSt.connector, i < currentStep && stepSt.connectorDone]} />
        )}
      </React.Fragment>
    ))}
  </View>
);

const stepSt = StyleSheet.create({
  wrapper:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  dot:           { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8E8F0', alignItems: 'center', justifyContent: 'center' },
  dotActive:     { backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  dotDone:       { backgroundColor: COLORS.primary },
  num:           { fontSize: 13, fontWeight: '700', color: COLORS.gray },
  numActive:     { color: '#fff' },
  check:         { fontSize: 13, fontWeight: '800', color: '#fff' },
  connector:     { flex: 1, height: 2, backgroundColor: '#E8E8F0', marginHorizontal: 6 },
  connectorDone: { backgroundColor: COLORS.primary },
});

// ─── Chip ─────────────────────────────────────────────────────────────────────
const Chip = ({ label, emoji, selected, onPress }) => (
  <TouchableOpacity style={[chipSt.chip, selected && chipSt.chipSel]} onPress={onPress} activeOpacity={0.75}>
    <Text style={chipSt.emoji}>{emoji}</Text>
    <Text style={[chipSt.label, selected && chipSt.labelSel]}>{label}</Text>
  </TouchableOpacity>
);

const chipSt = StyleSheet.create({
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 24, borderWidth: 1.5, borderColor: '#E8E8F0', backgroundColor: '#F6F7FB', marginRight: 8, marginBottom: 10 },
  chipSel:  { backgroundColor: '#FFF3EF', borderColor: COLORS.primary, shadowColor: COLORS.primary, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
  emoji:    { fontSize: 15 },
  label:    { fontSize: 13, color: COLORS.gray, fontWeight: '500' },
  labelSel: { color: COLORS.primary, fontWeight: '700' },
});

// ─── Toggle Pills ─────────────────────────────────────────────────────────────
const ToggleRow = ({ options, selected, onSelect, formatter }) => (
  <View style={togSt.row}>
    {options.map(opt => (
      <TouchableOpacity key={opt} style={[togSt.pill, selected === opt && togSt.pillSel]} onPress={() => onSelect(opt)} activeOpacity={0.75}>
        <Text style={[togSt.label, selected === opt && togSt.labelSel]}>
          {formatter ? formatter(opt) : String(opt)}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const togSt = StyleSheet.create({
  row:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pill:     { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#E8E8F0', backgroundColor: '#F6F7FB' },
  pillSel:  { backgroundColor: '#FFF3EF', borderColor: COLORS.primary },
  label:    { fontSize: 13, color: COLORS.gray, fontWeight: '500' },
  labelSel: { color: COLORS.primary, fontWeight: '700' },
});

const SLabel = ({ text }) => <Text style={slSt.t}>{text}</Text>;
const slSt = StyleSheet.create({
  t: { fontSize: 13, fontWeight: '700', color: COLORS.dark, marginBottom: 10, marginTop: 18 },
});

// ─── City Card ────────────────────────────────────────────────────────────────
const CityCard = ({ city, selected, onPress }) => (
  <TouchableOpacity style={[citySt.card, selected && citySt.cardSel]} onPress={onPress} activeOpacity={0.8}>
    <Text style={citySt.emoji}>{city.emoji}</Text>
    <Text style={[citySt.label, selected && citySt.labelSel]}>{city.label}</Text>
    {selected && (
      <View style={citySt.checkBadge}>
        <Text style={citySt.checkText}>✓</Text>
      </View>
    )}
  </TouchableOpacity>
);

const citySt = StyleSheet.create({
  card:       { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#E8E8F0', backgroundColor: '#F6F7FB', marginBottom: 10, position: 'relative' },
  cardSel:    { borderColor: COLORS.primary, backgroundColor: '#FFF3EF', shadowColor: COLORS.primary, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
  emoji:      { fontSize: 24 },
  label:      { fontSize: 14, fontWeight: '600', color: COLORS.gray, flex: 1 },
  labelSel:   { color: COLORS.primary, fontWeight: '700' },
  checkBadge: { position: 'absolute', top: 6, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  checkText:  { color: '#fff', fontSize: 10, fontWeight: '800' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const PlanScreen = ({ navigation }) => {
  const { user } = useAuth();

  const [step,         setStep]         = useState(0);
  const [selectedCity, setSelectedCity] = useState(null);
  const [categories,   setCategories]   = useState([]);
  const [companion,    setCompanion]    = useState(null);
  const [distance,     setDistance]     = useState(50);
  const [limit,        setLimit]        = useState(10);

  const toggleCat = (key) =>
    setCategories(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]);

  const validate = () => {
    if (step === 0 && !selectedCity) {
      Alert.alert('Select a City', 'Please choose a city to explore.');
      return false;
    }
    if (step === 1 && categories.length === 0) {
      Alert.alert('Select Interests', 'Choose at least one category you enjoy.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (step < TOTAL_STEPS - 1) { setStep(s => s + 1); return; }

    // ✅ Payload matches POST /recommendations schema exactly
    // ✅ user?.user_id — backend returns user_id not id
    const payload = {
      user_id:         user?.user_id || 1,
      latitude:        selectedCity.latitude,
      longitude:       selectedCity.longitude,
      max_distance_km: 150000,
      limit,
      category_filter: categories.length > 0 ? categories : null,
    };

    navigation.navigate('Recommendation', {
      payload,
      cityName:  selectedCity.label,
      cityEmoji: selectedCity.emoji,
      companion,
    });
  };

  const handleBack = () => step > 0 ? setStep(s => s - 1) : navigation.navigate('Home');

  // ── Step 0: City ──────────────────────────────────────────────────────────
  const Step0 = (
    <>
      <Text style={s.stepTitle}>Where to?</Text>
      <Text style={s.stepSubtitle}>Select a city in Maharashtra to explore</Text>
      <SLabel text="Choose Your Destination" />
      <View style={s.cityGrid}>
        {MAHARASHTRA_CITIES.map(city => (
          <CityCard
            key={city.key}
            city={city}
            selected={selectedCity?.key === city.key}
            onPress={() => setSelectedCity(city)}
          />
        ))}
      </View>
      {selectedCity && (
        <View style={s.selectedPill}>
          <Text style={s.selectedPillText}>
            📍 {selectedCity.label}  ·  {selectedCity.latitude.toFixed(4)}°N, {selectedCity.longitude.toFixed(4)}°E
          </Text>
        </View>
      )}
    </>
  );

  // ── Step 1: Interests ─────────────────────────────────────────────────────
  const Step1 = (
    <>
      <Text style={s.stepTitle}>Your Interests</Text>
      <Text style={s.stepSubtitle}>Tell us what you love — we'll find the best spots</Text>
      <SLabel text="What do you enjoy? (pick any)" />
      <View style={s.chipWrap}>
        {CATEGORIES.map(cat => (
          <Chip key={cat.key} label={cat.label} emoji={cat.emoji}
            selected={categories.includes(cat.key)} onPress={() => toggleCat(cat.key)} />
        ))}
      </View>
      <SLabel text="Travelling with" />
      <View style={s.chipWrap}>
        {COMPANION_TYPES.map(c => (
          <Chip key={c.key} label={c.label} emoji={c.emoji}
            selected={companion === c.key} onPress={() => setCompanion(c.key)} />
        ))}
      </View>
    </>
  );

  // ── Step 2: Preferences + Summary ────────────────────────────────────────
  const Step2 = (
    <>
      <Text style={s.stepTitle}>Set Preferences</Text>
      <Text style={s.stepSubtitle}>Fine-tune your discovery settings</Text>
      <SLabel text="Max Distance from City Center" />
      <ToggleRow options={DISTANCES} selected={distance} onSelect={setDistance} formatter={v => `${v} km`} />
      <SLabel text="Number of Recommendations" />
      <ToggleRow options={LIMITS} selected={limit} onSelect={setLimit} formatter={v => `${v} places`} />

      <View style={s.summaryCard}>
        <Text style={s.summaryHeading}>📋  Trip Summary</Text>
        {[
          { icon: selectedCity?.emoji || '📍', label: selectedCity?.label || 'Not set', sub: selectedCity ? `${selectedCity.latitude.toFixed(4)}°N, ${selectedCity.longitude.toFixed(4)}°E` : '' },
          { icon: '🎯', label: categories.length > 0 ? categories.slice(0, 3).join(', ') + (categories.length > 3 ? ` +${categories.length - 3} more` : '') : 'All categories', sub: '' },
          { icon: '👥', label: companion ?? 'Not specified', sub: '' },
          { icon: '📏', label: `Within ${distance} km  ·  ${limit} recommendations`, sub: '' },
        ].map((row, i) => (
          <View key={i} style={s.summaryRow}>
            <Text style={s.summaryIcon}>{row.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.summaryText}>{row.label}</Text>
              {row.sub ? <Text style={s.summarySub}>{row.sub}</Text> : null}
            </View>
          </View>
        ))}
      </View>
    </>
  );

  const steps  = [Step0, Step1, Step2];
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7FB" />
      <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
        <Text style={s.backArrow}>←</Text>
      </TouchableOpacity>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.title}>Plan a Trip</Text>
          <Text style={s.subtitle}>Step {step + 1} of {TOTAL_STEPS} — fill in your preferences</Text>
        </View>
        <View style={s.formCard}>
          <StepIndicator currentStep={step} />
          {steps[step]}
        </View>
        <View style={s.btnRow}>
          {step > 0 && (
            <Button title="Back" onPress={() => setStep(s => s - 1)} variant="outline" style={s.btnBack} />
          )}
          <Button title={isLast ? 'Get Recommendations →' : 'Continue →'} onPress={handleNext} style={s.btnNext} />
        </View>
        <Text style={s.hint}>
          {step === 0 && 'Select any city in Maharashtra to get started'}
          {step === 1 && 'More interests = better personalised results'}
          {step === 2 && "We'll rank places based on your full profile"}
        </Text>
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: '#F6F7FB' },
  scroll:  { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  backBtn: { marginTop: Platform.OS === 'ios' ? 52 : 20, marginLeft: 16, width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  backArrow: { fontSize: 20, color: COLORS.dark, fontWeight: '600' },
  header:   { marginBottom: 24, marginTop: 12 },
  title:    { fontSize: 30, fontWeight: '800', color: COLORS.dark, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#7A7A9D', marginTop: 4 },
  formCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  stepTitle:    { fontSize: 20, fontWeight: '700', color: COLORS.dark, marginBottom: 4 },
  stepSubtitle: { fontSize: 13, color: '#7A7A9D', marginBottom: 4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 4 },
  selectedPill: { marginTop: 4, backgroundColor: '#FFF3EF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#FFD5C8', alignItems: 'center' },
  selectedPillText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  summaryCard:    { backgroundColor: '#FFF8F5', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#FFD5C8', marginTop: 20, gap: 10 },
  summaryHeading: { fontSize: 14, fontWeight: '700', color: COLORS.dark, marginBottom: 4 },
  summaryRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  summaryIcon:    { fontSize: 16, width: 24, marginTop: 1 },
  summaryText:    { fontSize: 13, color: '#444', fontWeight: '500' },
  summarySub:     { fontSize: 11, color: COLORS.gray, marginTop: 1 },
  btnRow:  { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnBack: { flex: 0.42 },
  btnNext: { flex: 1 },
  hint: { fontSize: 12, color: '#7A7A9D', textAlign: 'center', marginTop: 16 },
});

export default PlanScreen;