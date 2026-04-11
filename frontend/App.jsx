import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/utils/colors';

const App = () => {
  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: 'YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  return (
    <AuthProvider>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <AppNavigator />
    </AuthProvider>
  );
};

export default App;