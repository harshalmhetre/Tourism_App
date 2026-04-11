import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/colors';
import { useAuth } from '../context/AuthContext';

const SplashScreen = ({ navigation }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        navigation.replace(user ? 'Onboarding' : 'Home');
      }, 1500);
    }
  }, [loading, user]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🏖️</Text>
      <Text style={styles.title}>Tourism App</Text>
      <Text style={styles.subtitle}>Explore the World</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  logo: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
  },
});

export default SplashScreen;