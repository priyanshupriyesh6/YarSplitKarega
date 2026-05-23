// ─────────────────────────────────────────────
//  Auth Store — Real Supabase Cloud Auth
// ─────────────────────────────────────────────

import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { User } from '../types';

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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'yarsplitkarega://auth-callback',
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

// Subscribe to Supabase Auth State Changes in real-time
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    try {
      // Fetch public profile record from Supabase PostgreSQL
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      // If user profile is not ready yet, wait/fallback to metadata (the insert trigger will create it)
      const user: User = {
        uid: session.user.id,
        displayName: profile?.display_name || session.user.user_metadata?.display_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email || '',
        photoURL: profile?.avatar_url || session.user.user_metadata?.avatar_url,
        defaultCurrency: profile?.default_currency || 'INR',
        createdAt: session.user.created_at,
      };

      useAuthStore.setState({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      // Fallback in case of quick network lag before public profile triggers complete
      const user: User = {
        uid: session.user.id,
        displayName: session.user.user_metadata?.display_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email || '',
        photoURL: session.user.user_metadata?.avatar_url,
        defaultCurrency: 'INR',
        createdAt: session.user.created_at,
      };
      useAuthStore.setState({ user, isAuthenticated: true, isLoading: false });
    }
  } else {
    // Session is invalid, expired, or logged out
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
  }
});
