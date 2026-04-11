import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
  TextInput,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// ✅ IMPORTANT: Change this to your machine's actual local IP
// Run `ifconfig | grep "inet 192"` (Mac/Linux) or `ipconfig` (Windows) to find it
const BASE_URL = 'http://192.168.31.8:8000';

// ─── AUTH SERVICE (fixed) ─────────────────────────────────────────────────────
const authService = {
  // ✅ FIX: OAuth2 requires application/x-www-form-urlencoded, NOT JSON
  login: async (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    params.append('grant_type', 'password');

    const response = await axios.post(`${BASE_URL}/auth/login`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    });
    return response.data; // { access_token, token_type }
  },

  // ✅ FIX: register returns user object directly (user_id, username, email, ...)
  register: async (payload) => {
    const response = await axios.post(`${BASE_URL}/auth/register`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    return response.data; // { user_id, username, email, age, gender, ... }
  },
};

// ─── OPTIONS ─────────────────────────────────────────────────────────────────
const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

const COMPANION_OPTIONS = [
  { label: '🧍 Solo', value: 'solo' },
  { label: '💑 Couple', value: 'couple' },
  { label: '👨‍👩‍👧 Family', value: 'family' },
  { label: '👯 Friends', value: 'friends' },
  { label: '👥 Group', value: 'group' },
];

const CROWD_LEVEL_OPTIONS = [
  { label: 'Very Low', value: 'very_low' },
  { label: 'Low', value: 'low' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'High', value: 'high' },
  { label: 'Very High', value: 'very_high' },
];

const CATEGORY_OPTIONS = [
  { label: '🏛️ Historical', value: 'historical' },
  { label: '🌿 Nature', value: 'nature' },
  { label: '🧗 Adventure', value: 'adventure' },
  { label: '🕌 Religious', value: 'religious' },
  { label: '🏖️ Beach', value: 'beach' },
  { label: '🖼️ Museum', value: 'museum' },
  { label: '🎡 Entertainment', value: 'entertainment' },
  { label: '🛍️ Shopping', value: 'shopping' },
  { label: '🍽️ Food', value: 'food' },
  { label: '🌙 Nightlife', value: 'nightlife' },
  { label: '🎭 Cultural', value: 'cultural' },
  { label: '🧘 Wellness', value: 'wellness' },
];

const TOTAL_STEPS = 3;

// ─── STEP INDICATOR ───────────────────────────────────────────────────────────
const StepIndicator = ({ currentStep, totalSteps }) => (
  <View style={styles.stepRow}>
    {Array.from({ length: totalSteps }).map((_, i) => (
      <View key={i} style={[styles.stepWrapper, i < totalSteps - 1 && { flex: 1 }]}>
        <View
          style={[
            styles.stepDot,
            i < currentStep && styles.stepDotDone,
            i === currentStep && styles.stepDotActive,
          ]}
        >
          {i < currentStep && <Text style={styles.stepCheck}>✓</Text>}
          {i === currentStep && <View style={styles.stepDotInner} />}
        </View>
        {i < totalSteps - 1 && (
          <View style={styles.stepLineContainer}>
            <View style={styles.stepLine} />
            <View
              style={[
                styles.stepLineFill,
                { width: i < currentStep ? '100%' : '0%' },
              ]}
            />
          </View>
        )}
      </View>
    ))}
  </View>
);

// ─── OPTION CHIP ─────────────────────────────────────────────────────────────
const OptionChip = ({ label, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
  </TouchableOpacity>
);

// ─── CUSTOM INPUT ─────────────────────────────────────────────────────────────
const FormInput = ({ label, error, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
        ]}
        placeholderTextColor="#A0A0BC"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const RegisterScreen = ({ navigation }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const scrollRef = useRef(null);

  // Step 0
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 1
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [budget, setBudget] = useState('');
  const [companionType, setCompanionType] = useState('');

  // Step 2
  const [preferences, setPreferences] = useState([]);
  const [preferredCrowdLevel, setPreferredCrowdLevel] = useState('');

  // ── Scroll to top on step change ──────────────────────────────────────────
  const goToStep = (nextStep) => {
    setStep(nextStep);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateStep = () => {
    const newErrors = {};

    if (step === 0) {
      if (!username.trim()) newErrors.username = 'Username is required';
      else if (username.trim().length < 3) newErrors.username = 'Minimum 3 characters';
      else if (username.trim().length > 50) newErrors.username = 'Maximum 50 characters';
      else if (!/^[a-zA-Z0-9_]+$/.test(username.trim()))
        newErrors.username = 'Only letters, numbers, underscores';

      if (!email.trim()) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email format';

      if (!password) newErrors.password = 'Password is required';
      else if (password.length < 8) newErrors.password = 'Minimum 8 characters';

      if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
      else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }

    if (step === 1) {
      if (age && (isNaN(Number(age)) || Number(age) < 13 || Number(age) > 120)) {
        newErrors.age = 'Enter a valid age (13–120)';
      }
      if (budget && (isNaN(Number(budget)) || Number(budget) < 0)) {
        newErrors.budget = 'Enter a valid budget amount';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    goToStep(step + 1);
  };

  const handleBack = () => goToStep(step - 1);

  const togglePreference = (value) => {
    setPreferences((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!validateStep()) return;
    setLoading(true);

    try {
      // ✅ Payload matches backend UserRegister schema exactly
      const payload = {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        ...(age && { age: Number(age) }),
        ...(gender && { gender }),
        ...(budget && { budget: Number(budget) }),
        ...(companionType && { companion_type: companionType }),
        ...(preferences.length > 0 && { preferences }),
        ...(preferredCrowdLevel && { preferred_crowd_level: preferredCrowdLevel }),
      };

      // ✅ Step 1: Register — returns { user_id, username, email, ... }
      const user = await authService.register(payload);

      // ✅ Step 2: Login to get JWT token — uses form-urlencoded OAuth2
      const tokenData = await authService.login(username.trim(), password);

      // ✅ Step 3: Persist token and user
      await AsyncStorage.setItem('token', tokenData.access_token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      Alert.alert('Welcome! 🎉', `Account created for ${user.username}`, [
        { text: 'Let\'s go!', onPress: () => navigation.replace('Home') },
      ]);
    } catch (error) {
      // ✅ Extract FastAPI error detail properly
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Registration failed. Please try again.';

      // Handle FastAPI validation errors (array of errors)
      if (Array.isArray(message)) {
        const firstError = message[0]?.msg || 'Validation error';
        Alert.alert('Registration Failed', firstError);
      } else {
        Alert.alert('Registration Failed', message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step Renders ──────────────────────────────────────────────────────────

  const renderStep0 = () => (
    <View>
      <Text style={styles.stepTitle}>Create Account</Text>
      <Text style={styles.stepSubtitle}>Start your journey — set up your credentials</Text>

      <FormInput
        label="Username"
        placeholder="e.g. traveller_raj"
        value={username}
        onChangeText={(t) => { setUsername(t); setErrors((e) => ({ ...e, username: '' })); }}
        autoCapitalize="none"
        autoCorrect={false}
        error={errors.username}
      />
      <FormInput
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: '' })); }}
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
      />
      <View>
        <FormInput
          label="Password"
          placeholder="Minimum 8 characters"
          value={password}
          onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: '' })); }}
          secureTextEntry={!showPassword}
          error={errors.password}
        />
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={() => setShowPassword((v) => !v)}
        >
          <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>
      <FormInput
        label="Confirm Password"
        placeholder="Re-enter your password"
        value={confirmPassword}
        onChangeText={(t) => { setConfirmPassword(t); setErrors((e) => ({ ...e, confirmPassword: '' })); }}
        secureTextEntry={!showPassword}
        error={errors.confirmPassword}
      />

      <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>Continue →</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Log in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Your Profile</Text>
      <Text style={styles.stepSubtitle}>Help us personalise your experience</Text>

      <FormInput
        label="Age (Optional)"
        placeholder="e.g. 25"
        value={age}
        onChangeText={(t) => { setAge(t); setErrors((e) => ({ ...e, age: '' })); }}
        keyboardType="numeric"
        error={errors.age}
      />

      <Text style={styles.fieldLabel}>Gender (Optional)</Text>
      <View style={styles.chipRow}>
        {GENDER_OPTIONS.map((opt) => (
          <OptionChip
            key={opt.value}
            label={opt.label}
            selected={gender === opt.value}
            onPress={() => setGender(gender === opt.value ? '' : opt.value)}
          />
        ))}
      </View>

      <FormInput
        label="Daily Budget in ₹ (Optional)"
        placeholder="e.g. 1500"
        value={budget}
        onChangeText={(t) => { setBudget(t); setErrors((e) => ({ ...e, budget: '' })); }}
        keyboardType="numeric"
        error={errors.budget}
      />

      <Text style={styles.fieldLabel}>Who do you travel with? (Optional)</Text>
      <View style={styles.chipRow}>
        {COMPANION_OPTIONS.map((opt) => (
          <OptionChip
            key={opt.value}
            label={opt.label}
            selected={companionType === opt.value}
            onPress={() => setCompanionType(companionType === opt.value ? '' : opt.value)}
          />
        ))}
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity style={styles.outlineBtn} onPress={handleBack} activeOpacity={0.8}>
          <Text style={styles.outlineBtnText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Your Interests</Text>
      <Text style={styles.stepSubtitle}>Pick what excites you — we'll tailor your feed</Text>

      <Text style={styles.fieldLabel}>Place Categories</Text>
      <View style={styles.chipRow}>
        {CATEGORY_OPTIONS.map((opt) => (
          <OptionChip
            key={opt.value}
            label={opt.label}
            selected={preferences.includes(opt.value)}
            onPress={() => togglePreference(opt.value)}
          />
        ))}
      </View>

      <Text style={styles.fieldLabel}>Preferred Crowd Level (Optional)</Text>
      <View style={styles.chipRow}>
        {CROWD_LEVEL_OPTIONS.map((opt) => (
          <OptionChip
            key={opt.value}
            label={opt.label}
            selected={preferredCrowdLevel === opt.value}
            onPress={() =>
              setPreferredCrowdLevel(preferredCrowdLevel === opt.value ? '' : opt.value)
            }
          />
        ))}
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity style={styles.outlineBtn} onPress={handleBack} activeOpacity={0.8}>
          <Text style={styles.outlineBtnText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, { flex: 1 }, loading && styles.btnDisabled]}
          onPress={handleRegister}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Create Account 🎉</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Main Render ───────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7FB" />
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>✈️ TourGuide</Text>
          <Text style={styles.headerSub}>Step {step + 1} of {TOTAL_STEPS}</Text>
        </View>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />

        {/* Form Card */}
        <View style={styles.formCard}>
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const PURPLE = '#5B5FCF';
const PURPLE_LIGHT = '#EEEEFF';
const GREY = '#7A7A9D';
const DARK = '#1A1A2E';
const BG = '#F6F7FB';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    marginTop: Platform.OS === 'ios' ? 52 : 24,
    marginBottom: 20,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: DARK,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: GREY,
    marginTop: 2,
  },

  // Step Indicator
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: PURPLE,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  stepDotDone: {
    backgroundColor: PURPLE,
  },
  stepDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  stepCheck: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  stepLineContainer: {
    flex: 1,
    height: 3,
    backgroundColor: '#E0E0F0',
    marginHorizontal: 6,
    borderRadius: 2,
    overflow: 'hidden',
  },
  stepLine: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E0E0F0',
  },
  stepLineFill: {
    height: '100%',
    backgroundColor: PURPLE,
    borderRadius: 2,
  },

  // Form Card
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#5B5FCF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: DARK,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    color: GREY,
    marginBottom: 24,
    lineHeight: 18,
  },

  // Input
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D3D5C',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E0E0F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 15,
    color: DARK,
    backgroundColor: '#FAFAFA',
  },
  inputFocused: {
    borderColor: PURPLE,
    backgroundColor: '#FAFEFF',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  inputError: {
    borderColor: '#E05555',
    backgroundColor: '#FFF8F8',
  },
  errorText: {
    color: '#E05555',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },

  // Eye toggle
  eyeBtn: {
    position: 'absolute',
    right: 14,
    bottom: 14,
  },
  eyeText: {
    fontSize: 18,
  },

  // Chips
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D3D5C',
    marginTop: 16,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0FA',
    borderWidth: 1.5,
    borderColor: '#E0E0F0',
    marginBottom: 4,
  },
  chipSelected: {
    backgroundColor: PURPLE_LIGHT,
    borderColor: PURPLE,
  },
  chipText: {
    fontSize: 13,
    color: GREY,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: PURPLE,
    fontWeight: '700',
  },

  // Buttons
  primaryBtn: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  outlineBtnText: {
    color: PURPLE,
    fontSize: 15,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: GREY,
    fontSize: 14,
  },
  link: {
    color: PURPLE,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default RegisterScreen;