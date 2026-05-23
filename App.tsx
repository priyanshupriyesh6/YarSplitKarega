// ─────────────────────────────────────────────
//  App.tsx — Root entry point
//  Fonts, SafeArea, Auth gate, Navigation
// ─────────────────────────────────────────────

import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

import { useAuthStore } from './src/store/authStore';
import { AuthScreen } from './src/components/screens/AuthScreen';
import { AppNavigator } from './src/components/AppNavigator';
import { Colors, Typography } from './src/constants/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const { isAuthenticated, isLoading } = useAuthStore();

  React.useEffect(() => {
    console.log('--- APP STATES ---', { fontsLoaded, isLoading, isAuthenticated });
  }, [fontsLoaded, isLoading, isAuthenticated]);

  if (!fontsLoaded || isLoading) {
    return (
      <View style={styles.splash}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>💸</Text>
          </View>
          <Text style={styles.logoText}>yarsplitkarega</Text>
        </View>
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        {isAuthenticated ? <AppNavigator /> : <AuthScreen />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    gap: 16,
  },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: Colors.primaryAlpha,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 44,
  },
  logoText: {
    fontSize: Typography.fontSize['3xl'],
    color: Colors.text,
    fontFamily: Typography.fontFamily.extraBold,
    letterSpacing: -0.5,
  },
});
