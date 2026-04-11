import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// ✅ IMPORTANT: Change this to your machine's actual local IP
// Run `ifconfig | grep "inet 192"` (Mac/Linux) or `ipconfig` (Windows) to find it
const BASE_URL = 'http://192.168.31.8:8000';

// ─── AUTH SERVICE (fixed) ─────────────────────────────────────────────────────
const authService = {
  // ✅ FIX 1: FastAPI OAuth2 requires application/x-www-form-urlencoded — NOT JSON
  // ✅ FIX 2: Must include grant_type=password field
  // ✅ FIX 3: Backend returns { access_token, token_type } — no nested "user" object
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

  // ✅ Fetch user profile using token after login
  getProfile: async (userId, token) => {
    const response = await axios.get(`${BASE_URL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });
    return response.data;
  },
};

// ─── Helper: decode JWT to get user_id without a library ─────────────────────
const decodeJWT = (token) => {
  try {
    const base64Payload = token.split('.')[1];
    const decoded = JSON.parse(atob(base64Payload));
    return decoded; // usually contains: { sub: user_id, exp: ... }
  } catch {
    return null;
  }
};

// ─── CUSTOM INPUT ─────────────────────────────────────────────────────────────
const FormInput = ({ label, error, rightElement, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={{ position: 'relative' }}>
        <TextInput
          style={[
            styles.input,
            focused && styles.inputFocused,
            error && styles.inputError,
            rightElement && { paddingRight: 48 },
          ]}
          placeholderTextColor="#A0A0BC"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightElement && (
          <View style={styles.inputRightEl}>{rightElement}</View>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Validation ──────────────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};
    if (!username.trim()) newErrors.username = 'Username is required';
    else if (username.trim().length < 3) newErrors.username = 'Minimum 3 characters';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Minimum 8 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Login Handler ────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      // ✅ Step 1: Login — returns { access_token, token_type }
      const tokenData = await authService.login(username.trim(), password);

      // ✅ Step 2: Decode JWT to get user_id (sub field)
      const decoded = decodeJWT(tokenData.access_token);
      const userId = decoded?.sub;

      // ✅ Step 3: Fetch user profile using the token
      let user = null;
      if (userId) {
        try {
          user = await authService.getProfile(userId, tokenData.access_token);
        } catch {
          // Non-fatal: user object not strictly needed to proceed
          user = { username: username.trim() };
        }
      }

      // ✅ Step 4: Persist token and user to AsyncStorage
      await AsyncStorage.setItem('token', tokenData.access_token);
      await AsyncStorage.setItem('user', JSON.stringify(user || { username: username.trim() }));

      // ✅ Step 5: Navigate
      navigation.replace('Home');
    } catch (error) {
      // ✅ FastAPI returns 401 with detail: "Incorrect username or password"
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Invalid username or password. Please try again.';

      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7FB" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>✈️ TourGuide</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Login to continue exploring</Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.stepTitle}>Log In</Text>
          <Text style={styles.stepSubtitle}>Enter your username and password</Text>

          {/* ✅ Username field — backend uses username, not email */}
          <FormInput
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChangeText={(t) => { setUsername(t); setErrors((e) => ({ ...e, username: '' })); }}
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.username}
          />

          {/* ✅ Password with show/hide toggle */}
          <FormInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: '' })); }}
            secureTextEntry={!showPassword}
            error={errors.password}
            rightElement={
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            }
          />

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotBtn}
          >
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Login →</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.line} />
          </View>

          {/* Google Button (UI only — wire up when Google auth is ready) */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={() => Alert.alert('Coming Soon', 'Google login will be available soon.')}
            activeOpacity={0.8}
          >
            <Text style={styles.googleBtnText}>🌐  Continue with Google</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const PURPLE = '#5B5FCF';
const GREY = '#7A7A9D';
const DARK = '#1A1A2E';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },

  // Header
  header: {
    marginTop: Platform.OS === 'ios' ? 52 : 24,
    marginBottom: 28,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: DARK,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: DARK,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: GREY,
    marginTop: 4,
  },

  // Form Card
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: PURPLE,
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
  inputRightEl: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: 18,
  },
  errorText: {
    color: '#E05555',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },

  // Forgot password
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    marginTop: -4,
  },
  forgotPassword: {
    fontSize: 13,
    color: PURPLE,
    fontWeight: '600',
  },

  // Buttons
  primaryBtn: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  btnDisabled: {
    opacity: 0.6,
  },
  googleBtn: {
    borderWidth: 1.5,
    borderColor: '#E0E0F0',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  googleBtnText: {
    color: DARK,
    fontSize: 15,
    fontWeight: '600',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    color: GREY,
    fontSize: 13,
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

export default LoginScreen;