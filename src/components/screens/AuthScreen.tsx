// ─────────────────────────────────────────────
//  Auth Screen — Login + Register
//  Google Sign-In + Email/Password
// ─────────────────────────────────────────────

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { Button } from '../ui';

const { height: SCREEN_H } = Dimensions.get('window');

export const AuthScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { signInWithGoogle, signInWithEmail, signUp, isLoading } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;

  const switchMode = (newMode: 'login' | 'register') => {
    Animated.timing(slideAnim, {
      toValue: newMode === 'register' ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setMode(newMode);
    setError('');
  };

  const handleEmailAuth = async () => {
    setError('');
    try {
      if (mode === 'register') {
        if (!name.trim()) { setError('Please enter your full name'); return; }
        if (!email.trim()) { setError('Please enter your email'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
        await signUp(name.trim(), email.trim(), password);
      } else {
        if (!email.trim() || !password) { setError('Please fill in all fields'); return; }
        await signInWithEmail(email.trim(), password);
      }
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e.message ?? 'Google sign-in failed');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background gradient */}
      <LinearGradient
        colors={['#0F0E17', '#1A1542', '#0D1B2A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <View style={styles.orb3} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + Spacing['2xl'], paddingBottom: insets.bottom + Spacing['3xl'] },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo / branding */}
          <View style={styles.brandSection}>
            <LinearGradient
              colors={Colors.gradientPrimary}
              style={styles.logoCircle}
            >
              <Ionicons name="wallet" size={32} color={Colors.text} />
            </LinearGradient>
            <Text style={styles.appName}>yarsplitkarega</Text>
            <Text style={styles.tagline}>
              {mode === 'login'
                ? 'Welcome back! Sign in to continue'
                : 'Join yarsplitkarega. Split smarter.'}
            </Text>
          </View>

          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              onPress={() => switchMode('login')}
              style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => switchMode('register')}
              style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeBtnText, mode === 'register' && styles.modeBtnTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Google Sign-In button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogle}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            <View style={styles.googleIcon}>
              {/* Google G logo colors */}
              <Text style={styles.googleG}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>
              {mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or use email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="Priya Sharma"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={mode === 'register' ? 'Min. 6 characters' : 'Your password'}
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeButton}>
                  <Ionicons
                    name={showPass ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {mode === 'login' && (
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {/* Error message */}
            {error !== '' && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            <Button
              label={isLoading
                ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                : (mode === 'login' ? 'Sign In →' : 'Create Account →')
              }
              onPress={handleEmailAuth}
              loading={isLoading}
              fullWidth
              style={{ marginTop: Spacing.md }}
            />
          </View>

          {/* Terms */}
          {mode === 'register' && (
            <Text style={styles.terms}>
              By creating an account you agree to our{' '}
              <Text style={{ color: Colors.primary }}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={{ color: Colors.primary }}>Privacy Policy</Text>
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  // Decorative orbs
  orb1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(108, 99, 255, 0.12)',
    top: -80,
    right: -80,
  },
  orb2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 101, 132, 0.08)',
    bottom: 200,
    left: -60,
  },
  orb3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(0, 217, 181, 0.06)',
    bottom: -40,
    right: 40,
  },
  // Brand
  brandSection: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.lg,
  },
  appName: {
    fontSize: Typography.fontSize['3xl'],
    color: Colors.text,
    fontFamily: Typography.fontFamily.extraBold,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
  },
  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.xl,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  modeBtnActive: {
    backgroundColor: Colors.primary,
    ...Shadow.sm,
  },
  modeBtnText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.semiBold,
  },
  modeBtnTextActive: {
    color: Colors.text,
  },
  // Google button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.base,
    ...Shadow.sm,
  },
  googleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleButtonText: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
    textAlign: 'center',
  },
  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.surfaceBorder,
  },
  dividerText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Form
  form: {
    gap: Spacing.md,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundInput,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.base,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  textInput: {
    flex: 1,
    color: Colors.text,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    paddingVertical: 14,
  },
  eyeButton: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.medium,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.errorAlpha,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    fontFamily: Typography.fontFamily.medium,
    flex: 1,
  },
  terms: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
});
