import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In Expo SDK 49+, variables prefixed with EXPO_PUBLIC_ are automatically available in process.env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zrhppwdtcsyodfivnrdg.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyaHBwd2R0Y3N5b2RmaXZucmRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0ODg2MzcsImV4cCI6MjA5NTA2NDYzN30.hXefksSX74eG05oOmSvYI4DhwbAoN3r5dYJUjJvVquw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─────────────────────────────────────────────
//  Deep Linking Handler for Supabase OAuth
// ─────────────────────────────────────────────
import { Linking } from 'react-native';

const handleDeepLink = async (url: string | null) => {
  if (!url) return;

  let queryString = '';
  if (url.includes('#')) {
    queryString = url.split('#')[1];
  } else if (url.includes('?')) {
    queryString = url.split('?')[1];
  }

  if (!queryString) return;

  const params: Record<string, string> = {};
  queryString.split('&').forEach((param) => {
    const [key, value] = param.split('=');
    if (key && value) {
      params[key] = decodeURIComponent(value);
    }
  });

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      console.error('Error setting session from deep link:', error.message);
    }
  }
};

// Listen to incoming deep links when the app is in the background
Linking.addEventListener('url', ({ url }) => {
  handleDeepLink(url);
});

// Check if the app was opened by a deep link from a closed state
Linking.getInitialURL().then((url) => {
  if (url) handleDeepLink(url);
});

