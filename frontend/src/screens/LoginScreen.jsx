import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  Platform, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth';

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
            error  && styles.inputError,
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
  const { login } = useAuth();

  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [errors,       setErrors]       = useState({});

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};
    if (!username.trim())         newErrors.username = 'Username is required';
    else if (username.trim().length < 3) newErrors.username = 'Minimum 3 characters';
    if (!password)                newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Minimum 8 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Login handler ────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      // ✅ POST /auth/login  →  { access_token, token_type, user: { user_id, username, … } }
      // authService.login sends JSON { username, password } — matches backend schema
      const data = await authService.login(username.trim(), password);

      if (!data?.access_token) throw new Error('Invalid response from server');

      // ✅ Save token + full user object (user_id, username, email, etc.)
      // AuthContext.login() persists both to AsyncStorage and sets state
      await login(data.access_token, data.user);

      navigation.replace('Home');

    } catch (error) {
      const message =
        error?.message || 'Login failed. Please check your credentials.';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
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

          <FormInput
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChangeText={(t) => { setUsername(t); setErrors((e) => ({ ...e, username: '' })); }}
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.username}
          />

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

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.primaryBtnText}>Login →</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.line} />
          </View>

          
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
const GREY   = '#7A7A9D';
const DARK   = '#1A1A2E';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F7FB' },
  content:   { padding: 20, paddingBottom: 48 },

  header: { marginTop: Platform.OS === 'ios' ? 52 : 24, marginBottom: 28 },
  appName:  { fontSize: 28, fontWeight: '800', color: DARK, letterSpacing: -0.5, marginBottom: 16 },
  title:    { fontSize: 26, fontWeight: '800', color: DARK, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: GREY, marginTop: 4 },

  formCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 24, elevation: 6,
  },
  stepTitle:    { fontSize: 22, fontWeight: '800', color: DARK, marginBottom: 4 },
  stepSubtitle: { fontSize: 13, color: GREY, marginBottom: 24 },

  inputWrapper: { marginBottom: 16 },
  inputLabel:   { fontSize: 13, fontWeight: '600', color: '#3D3D5C', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#E0E0F0', borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 15, color: DARK, backgroundColor: '#FAFAFA',
  },
  inputFocused: {
    borderColor: PURPLE, backgroundColor: '#FAFEFF',
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 2,
  },
  inputError:  { borderColor: '#E05555', backgroundColor: '#FFF8F8' },
  inputRightEl:{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  eyeText:     { fontSize: 18 },
  errorText:   { color: '#E05555', fontSize: 12, marginTop: 4, marginLeft: 2 },

  primaryBtn: {
    backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnDisabled:    { opacity: 0.6 },

  googleBtn: {
    borderWidth: 1.5, borderColor: '#E0E0F0', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', backgroundColor: '#FAFAFA',
  },
  googleBtnText: { color: DARK, fontSize: 15, fontWeight: '600' },

  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line:        { flex: 1, height: 1, backgroundColor: '#E8E8F0' },
  dividerText: { marginHorizontal: 12, color: GREY, fontSize: 13 },

  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: GREY, fontSize: 14 },
  link:       { color: PURPLE, fontSize: 14, fontWeight: '700' },
});

export default LoginScreen;