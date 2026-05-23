import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In Expo SDK 49+, variables prefixed with EXPO_PUBLIC_ are automatically available in process.env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'sb_publishable_AsicUC5pg0l1zcrRbCknMg_U9wxD1Q_';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyaHBwd2R0Y3N5b2RmaXZucmRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0ODg2MzcsImV4cCI6MjA5NTA2NDYzN30.hXefksSX74eG05oOmSvYI4DhwbAoN3r5dYJUjJvVquw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
