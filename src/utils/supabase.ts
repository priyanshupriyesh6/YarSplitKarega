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

/**
 * Parse and handle an OAuth deep-link URL.
 * Exported so authStore can call it directly from the WebBrowser result
 * without relying on the Linking event listener (which is unreliable on Android APKs).
 *
 * Supports both:
 *  - Implicit flow: #access_token=...&refresh_token=...
 *  - PKCE flow:     ?code=...
 */
export const handleDeepLink = async (url: string | null): Promise<void> => {
  try {
    if (!url) return;
    console.log('[DeepLink] Handling URL:', url);

    // ── PKCE flow: URL contains ?code= ───────────────────────
    if (url.includes('code=')) {
      // Supabase JS client handles PKCE code exchange automatically
      // when we call exchangeCodeForSession
      let code: string | null = null;
      const queryPart = url.includes('?') ? url.split('?')[1] : '';
      queryPart.split('&').forEach((param) => {
        const [key, value] = param.split('=');
        if (key === 'code' && value) code = decodeURIComponent(value);
      });

      if (code) {
        console.log('[DeepLink] PKCE code found, exchanging for session...');
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('[DeepLink] PKCE code exchange error:', error.message);
        } else {
          console.log('[DeepLink] PKCE session established successfully.');
        }
        return;
      }
    }

    // ── Implicit flow: URL contains #access_token= ───────────
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

    if (accessToken) {
      console.log('[DeepLink] Implicit tokens found, setting session...');
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });
      if (error) {
        console.error('[DeepLink] Error setting session:', error.message);
      } else {
        console.log('[DeepLink] Session set successfully.');
      }
    }
  } catch (err) {
    console.error('[DeepLink] Error handling deep link:', err);
  }
};

if (Platform.OS !== 'web') {
  try {
    // Listen to incoming deep links when the app is in the background/foreground
    Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Check if the app was opened by a deep link from a cold start
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    }).catch((err) => {
      console.warn('[DeepLink] Failed to get initial URL:', err);
    });
  } catch (e) {
    console.error('[DeepLink] Failed to initialize deep linking listeners:', e);
  }
}


