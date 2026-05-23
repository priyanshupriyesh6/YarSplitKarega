// ─────────────────────────────────────────────
//  Auth Store — Real Supabase Cloud Auth
// ─────────────────────────────────────────────

import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { User } from '../types';
import { Platform } from 'react-native';

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  isLoading: true, // starts loading to fetch active sessions
  isAuthenticated: false,

  signInWithGoogle: async () => {
    set({ isLoading: true });
    try {
      const redirectUrl = Platform.OS === 'web'
        ? (typeof globalThis !== 'undefined' && (globalThis as any).window ? (globalThis as any).window.location.origin : 'http://localhost:8081')
        : 'yarsplitkarega://auth-callback';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  signInWithEmail: async (email, password) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  signUp: async (name, email, password) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name,
          },
        },
      });
      if (error) throw error;
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  updateProfile: async (updates) => {
    const current = get().user;
    if (!current) return;
    set({ isLoading: true });
    try {
      // Update public.profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: updates.displayName,
          default_currency: updates.defaultCurrency,
        })
        .eq('id', current.uid);

      if (profileError) throw profileError;

      // Update auth.users metadata if displayName changed
      if (updates.displayName) {
        await supabase.auth.updateUser({
          data: { display_name: updates.displayName },
        });
      }

      set({
        user: { ...current, ...updates },
        isLoading: false,
      });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },
}));

// Helper to structure User data
const buildUserData = (sessionUser: any, profile: any): User => ({
  uid: sessionUser.id,
  displayName: profile?.display_name || sessionUser.user_metadata?.display_name || sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'User',
  email: sessionUser.email || '',
  photoURL: profile?.avatar_url || sessionUser.user_metadata?.avatar_url,
  defaultCurrency: profile?.default_currency || 'INR',
  createdAt: sessionUser.created_at,
});

// Fetch initial session on startup to prevent loading freeze
const initializeAuth = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      useAuthStore.setState({
        user: buildUserData(session.user, profile),
        isAuthenticated: true,
        isLoading: false
      });
    } else {
      useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  } catch (err) {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
  }
};

// Initialize session check immediately
initializeAuth();

// Subscribe to Supabase Auth State Changes in real-time
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      useAuthStore.setState({
        user: buildUserData(session.user, profile),
        isAuthenticated: true,
        isLoading: false
      });
    } catch (err) {
      useAuthStore.setState({
        user: buildUserData(session.user, null),
        isAuthenticated: true,
        isLoading: false
      });
    }
  } else {
    // Session is invalid, expired, or logged out
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
  }
});
