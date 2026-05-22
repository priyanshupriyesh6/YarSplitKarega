// ─────────────────────────────────────────────
//  yarsplitkarega Design System — Theme Tokens
// ─────────────────────────────────────────────

export const Colors = {
  // Brand
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  primaryDark: '#4A42D0',
  primaryAlpha: 'rgba(108, 99, 255, 0.12)',

  secondary: '#FF6584',
  secondaryLight: '#FF8FA3',
  secondaryAlpha: 'rgba(255, 101, 132, 0.12)',

  accent: '#00D9B5',
  accentLight: '#33E2C4',
  accentAlpha: 'rgba(0, 217, 181, 0.12)',

  // Semantic
  success: '#2DCE89',
  successLight: '#58D6A1',
  successAlpha: 'rgba(45, 206, 137, 0.12)',

  warning: '#FFB300',
  warningAlpha: 'rgba(255, 179, 0, 0.12)',

  error: '#FF4757',
  errorAlpha: 'rgba(255, 71, 87, 0.12)',

  // Neutrals (Dark theme first)
  background: '#0F0E17',
  backgroundCard: '#1A1928',
  backgroundElevated: '#232235',
  backgroundInput: '#1E1D2E',

  surface: '#1A1928',
  surfaceHover: '#232235',
  surfaceBorder: 'rgba(255,255,255,0.08)',

  text: '#FFFFFE',
  textSecondary: '#A7A6C5',
  textMuted: '#5F5E80',
  textInverse: '#0F0E17',

  // Gradients (start, end)
  gradientPrimary: ['#6C63FF', '#9B55FF'] as const,
  gradientSecondary: ['#FF6584', '#FF9A5C'] as const,
  gradientSuccess: ['#2DCE89', '#0BB873'] as const,
  gradientCard: ['#1A1928', '#232235'] as const,
  gradientScanner: ['rgba(108,99,255,0.8)', 'rgba(0,217,181,0.6)'] as const,

  // Owed / Owes
  positive: '#2DCE89',   // you are owed
  negative: '#FF4757',   // you owe
  neutral: '#A7A6C5',
};

export const Typography = {
  // Font families (loaded via expo-font)
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extraBold: 'Inter_800ExtraBold',
  },

  // Font sizes
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const Shadow = {
  sm: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
};

export const Animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: { damping: 15, stiffness: 200 },
};
