import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/colors';
import Button from '../components/Button';

const OnboardingScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🌍</Text>
        <Text style={styles.title}>Welcome to Tourism App</Text>
        <Text style={styles.description}>
          Discover amazing destinations, plan your trips, and create unforgettable memories
        </Text>
      </View>

      <View style={styles.buttons}>
        <Button
          title="Get Started"
          onPress={() => navigation.navigate('Register')}
          style={styles.button}
        />
        <Button
          title="I have an account"
          onPress={() => navigation.navigate('Login')}
          variant="outline"
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 100,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttons: {
    gap: 12,
  },
  button: {
    marginBottom: 12,
  },
});

export default OnboardingScreen;