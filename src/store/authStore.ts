// ─────────────────────────────────────────────
//  Auth Store — Real Supabase Cloud Auth
// ─────────────────────────────────────────────

import { create } from 'zustand';
import { supabase, handleDeepLink } from '../utils/supabase';
import { User } from '../types';
import { Platform, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

// Allow session completions on Web standard contexts
WebBrowser.maybeCompleteAuthSession();

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
      const redirectUrl = Linking.createURL('auth-callback');
      console.log('[Auth] Google Login - Redirect URL:', redirectUrl);

      const isWeb = Platform.OS === 'web';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: !isWeb,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      if (!isWeb && data?.url) {
        console.log('[Auth] Mobile OAuth URL received. Opening WebBrowser...');
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        console.log('[Auth] WebBrowser result type:', result.type);

        if (result.type === 'success' && result.url) {
          // ✅ Directly parse the redirect URL — do NOT rely on Linking listener
          // which is unreliable on Android APKs.
          console.log('[Auth] WebBrowser success, parsing redirect URL directly...');
          await handleDeepLink(result.url);
          
          // Force active check and set state immediately
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log('[Auth] Google Login: Session found after deep link. Setting state directly.');
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            set({
              user: buildUserData(session.user, profile),
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } else {
          // User cancelled or browser dismissed — clear the loader
          console.log('[Auth] WebBrowser cancelled/dismissed. Clearing loader.');
          set({ isLoading: false });
        }
      }
    } catch (e) {
      console.error('[Auth] Google Auth Error:', e);
      set({ isLoading: false });
      throw e;
    }
  },

  signInWithEmail: async (email, password) => {
    set({ isLoading: true });

    // Safety valve: if onAuthStateChange doesn't fire within 10 seconds,
    // force-clear the loader so the user isn't stuck indefinitely.
    const safetyTimer = setTimeout(() => {
      if (useAuthStore.getState().isLoading) {
        console.warn('[Auth] signInWithEmail: safety timeout hit, clearing loader.');
        set({ isLoading: false });
      }
    }, 10000);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      clearTimeout(safetyTimer);

      if (error) {
        set({ isLoading: false });
        throw error;
      }

      if (data?.session?.user) {
        console.log('[Auth] signInWithEmail: Password auth succeeded. Setting state directly.');
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single();

        set({
          user: buildUserData(data.session.user, profile),
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      clearTimeout(safetyTimer);
      set({ isLoading: false });
      throw e;
    }
  },

  signUp: async (name, email, password) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name,
          },
        },
      });

      if (error) {
        set({ isLoading: false });
        throw error;
      }

      // If Supabase requires email confirmation, data.session will be null.
      // In this case we immediately clear the loader and show a friendly prompt.
      if (!data.session) {
        set({ isLoading: false });
        Alert.alert(
          'Confirm your email ✉️',
          `We sent a confirmation link to ${email}. Please check your inbox (and spam folder) and tap the link to activate your account, then sign in.`,
          [{ text: 'Got it', style: 'default' }]
        );
        return;
      }

      console.log('[Auth] signUp: Session created instantly. Setting state directly.');
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.session.user.id)
        .single();

      set({
        user: buildUserData(data.session.user, profile),
        isAuthenticated: true,
        isLoading: false,
      });
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
  console.log('[Auth] initializeAuth: Starting session check...');

  // Safety fallback timeout: if Supabase getSession hangs indefinitely,
  // we force the loader to dismiss so the user can interact with the app.
  const safetyTimeout = setTimeout(() => {
    console.warn('[Auth] initializeAuth: Session check is taking too long. Forcing loader dismissal.');
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
  }, 6000);

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    clearTimeout(safetyTimeout);
    console.log('[Auth] initializeAuth: getSession finished.', { hasSession: !!session, error });

    if (session?.user) {
      console.log('[Auth] initializeAuth: Fetching user profile for UUID:', session.user.id);
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      console.log('[Auth] initializeAuth: Profile query completed.', { hasProfile: !!profile, error: profileErr });

      useAuthStore.setState({
        user: buildUserData(session.user, profile),
        isAuthenticated: true,
        isLoading: false
      });
    } else {
      console.log('[Auth] initializeAuth: No active session. Transitioning to login.');
      useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  } catch (err) {
    clearTimeout(safetyTimeout);
    console.error('[Auth] initializeAuth: Fatal exception caught:', err);
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
  }
};

// Initialize session check immediately
initializeAuth();

// Subscribe to Supabase Auth State Changes in real-time
//
// ⚠️ IMPORTANT: Per Supabase JS v2 docs, the onAuthStateChange callback runs
// synchronously inside the internal auth lock. Calling ANY other Supabase
// method (even a .from().select()) inside this callback will DEADLOCK the lock,
// causing the session to never be committed — which means isAuthenticated
// stays false and the user is bounced back to the login screen.
//
// Fix: set auth state immediately from the session data we already have,
// then fetch the profile in a deferred setTimeout(0) to enrich display name.
supabase.auth.onAuthStateChange((event, session) => {
  console.log('[Auth] onAuthStateChange fired:', event, { hasSession: !!session });

  if (session?.user) {
    const currentState = useAuthStore.getState();
    const isAlreadyAuthenticated = currentState.isAuthenticated && currentState.user?.uid === session.user.id;

    if (!isAlreadyAuthenticated) {
      // Set authenticated immediately using data already in the session object.
      // Do NOT await anything here — that would deadlock the Supabase lock.
      useAuthStore.setState({
        user: buildUserData(session.user, null),
        isAuthenticated: true,
        isLoading: false,
      });

      // Enrich display name from the profiles table AFTER the lock is released.
      setTimeout(async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            useAuthStore.setState((state) => ({
              user: state.user ? buildUserData(session.user, profile) : null,
            }));
          }
        } catch (err) {
          // Profile fetch failed — user is still authenticated, just using fallback name
          console.warn('[Auth] Profile enrichment failed (non-fatal):', err);
        }
      }, 0);
    } else {
      if (currentState.isLoading) {
        useAuthStore.setState({ isLoading: false });
      }
    }
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
  } else {
    // Only set authenticated: false if we are not currently trying to log in (isLoading is false).
    // This prevents asynchronous transitional events from resetting the login state.
    const currentState = useAuthStore.getState();
    if (!currentState.isLoading) {
      useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }
});
