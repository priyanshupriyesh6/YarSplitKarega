import { Platform } from 'react-native';

// Polyfill only on native mobile platforms to avoid overriding browser standard behaviors
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

import { createClient } from '@supabase/supabase-js';

// In Expo SDK 49+, variables prefixed with EXPO_PUBLIC_ are automatically available in process.env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zrhppwdtcsyodfivnrdg.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyaHBwd2R0Y3N5b2RmaXZucmRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0ODg2MzcsImV4cCI6MjA5NTA2NDYzN30.hXefksSX74eG05oOmSvYI4DhwbAoN3r5dYJUjJvVquw';

// Custom Web Storage Adapter to bypass async storage shims on Web
const customWebStorage = {
  getItem: (key: string) => {
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        return (globalThis as any).localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('Failed to read from localStorage:', e);
    }
    return null;
  },
  setItem: (key: string, value: string) => {
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('Failed to write to localStorage:', e);
    }
  },
  removeItem: (key: string) => {
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('Failed to remove from localStorage:', e);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? customWebStorage : require('@react-native-async-storage/async-storage').default,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// ─────────────────────────────────────────────
//  Deep Linking Handler for Supabase OAuth (Mobile Only)
// ─────────────────────────────────────────────
import { Linking } from 'react-native';

if (Platform.OS !== 'web') {
  const handleDeepLink = async (url: string | null) => {
    try {
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
    } catch (err) {
      console.error('Error handling deep link:', err);
    }
  };

  try {
    // Listen to incoming deep links when the app is in the background
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Check if the app was opened by a deep link from a closed state
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    }).catch((err) => {
      console.warn('Failed to get initial URL:', err);
    });
  } catch (e) {
    console.error('Failed to initialize deep linking listeners:', e);
  }
}


