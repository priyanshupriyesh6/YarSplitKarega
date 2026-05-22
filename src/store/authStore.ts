// ─────────────────────────────────────────────
//  Auth Store — Google Sign-In + Email Auth
//  Uses local AsyncStorage, no Firebase
// ─────────────────────────────────────────────

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,

      signInWithGoogle: async () => {
        set({ isLoading: true });
        // Simulate Google OAuth flow (real implementation uses expo-auth-session)
        await new Promise((r) => setTimeout(r, 1200));
        const user: User = {
          uid: 'u1',
          displayName: 'Priya Sharma',
          email: 'priya@gmail.com',
          defaultCurrency: 'INR',
          createdAt: new Date().toISOString(),
        };
        set({ user, isAuthenticated: true, isLoading: false });
      },

      signInWithEmail: async (email: string, password: string) => {
        set({ isLoading: true });
        await new Promise((r) => setTimeout(r, 800));
        if (!email || !password) {
          set({ isLoading: false });
          throw new Error('Invalid credentials');
        }
        const user: User = {
          uid: 'u_' + email.split('@')[0],
          displayName: email.split('@')[0],
          email,
          defaultCurrency: 'INR',
          createdAt: new Date().toISOString(),
        };
        set({ user, isAuthenticated: true, isLoading: false });
      },

      signUp: async (name: string, email: string, password: string) => {
        set({ isLoading: true });
        await new Promise((r) => setTimeout(r, 1000));
        const user: User = {
          uid: 'u_' + Date.now(),
          displayName: name,
          email,
          defaultCurrency: 'INR',
          createdAt: new Date().toISOString(),
        };
        set({ user, isAuthenticated: true, isLoading: false });
      },

      signOut: () => {
        set({ user: null, isAuthenticated: false });
      },

      updateProfile: (updates) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...updates } });
      },
    }),
    {
      name: 'yarsplitkarega-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
