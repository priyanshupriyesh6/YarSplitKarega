// ─────────────────────────────────────────────
//  UI Components — Button, Card, Badge, Avatar
// ─────────────────────────────────────────────

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadow, Animation } from '../../constants/theme';
import { getInitials } from '../../utils/formatters';

// ── Button ───────────────────────────────────

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  fullWidth = false,
}) => {
  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 13, iconSize: 14 },
    md: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 15, iconSize: 16 },
    lg: { paddingVertical: 18, paddingHorizontal: 32, fontSize: 17, iconSize: 18 },
  }[size];

  const content = (
    <View style={[styles.buttonContent, { opacity: disabled || loading ? 0.6 : 1 }]}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'ghost' ? Colors.primary : Colors.text}
          size="small"
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon as any}
              size={sizeStyles.iconSize}
              color={variant === 'ghost' ? Colors.primary : Colors.text}
              style={{ marginRight: 6 }}
            />
          )}
          <Text
            style={[
              styles.buttonLabel,
              { fontSize: sizeStyles.fontSize },
              variant === 'ghost' && { color: Colors.primary },
              variant === 'danger' && { color: Colors.error },
            ]}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon as any}
              size={sizeStyles.iconSize}
              color={variant === 'ghost' ? Colors.primary : Colors.text}
              style={{ marginLeft: 6 }}
            />
          )}
        </>
      )}
    </View>
  );

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[fullWidth && { width: '100%' }, style]}
      >
        <LinearGradient
          colors={Colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.buttonBase,
            { paddingVertical: sizeStyles.paddingVertical, paddingHorizontal: sizeStyles.paddingHorizontal },
            ...Shadow.sm,
            fullWidth && { width: '100%' },
          ]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyle: ViewStyle = {
    secondary: {
      backgroundColor: Colors.primaryAlpha,
      borderWidth: 1,
      borderColor: Colors.primary,
    } as ViewStyle,
    ghost: {
      backgroundColor: 'transparent',
    } as ViewStyle,
    danger: {
      backgroundColor: Colors.errorAlpha,
      borderWidth: 1,
      borderColor: Colors.error,
    } as ViewStyle,
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.buttonBase,
        { paddingVertical: sizeStyles.paddingVertical, paddingHorizontal: sizeStyles.paddingHorizontal },
        variantStyle,
        fullWidth && { width: '100%' },
        style,
      ]}
    >
      {content}
    </TouchableOpacity>
  );
};

// ── Card ─────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevated?: boolean;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  elevated = false,
  noPadding = false,
}) => {
  const cardStyle = [
    styles.card,
    elevated && Shadow.md,
    noPadding && { padding: 0 },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={cardStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

// ── Badge ─────────────────────────────────────

interface BadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  color = Colors.primary,
  bgColor,
  size = 'md',
}) => (
  <View
    style={[
      styles.badge,
      {
        backgroundColor: bgColor ?? `${color}22`,
        paddingVertical: size === 'sm' ? 2 : 5,
        paddingHorizontal: size === 'sm' ? 6 : 10,
      },
    ]}
  >
    <Text style={[styles.badgeText, { color, fontSize: size === 'sm' ? 10 : 12 }]}>
      {label}
    </Text>
  </View>
);

// ── Avatar ─────────────────────────────────────

interface AvatarProps {
  name: string;
  photoURL?: string;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  photoURL,
  size = 40,
  color = Colors.primary,
  style,
}) => (
  <View
    style={[
      styles.avatar,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${color}33`,
        borderColor: `${color}66`,
        borderWidth: 1.5,
      },
      style,
    ]}
  >
    <Text style={[styles.avatarText, { fontSize: size * 0.35, color }]}>
      {getInitials(name)}
    </Text>
  </View>
);

// ── AvatarStack ─────────────────────────────

interface AvatarStackProps {
  members: { uid: string; displayName: string; photoURL?: string }[];
  maxVisible?: number;
  size?: number;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  members,
  maxVisible = 4,
  size = 32,
}) => {
  const visible = members.slice(0, maxVisible);
  const remaining = members.length - maxVisible;

  const avatarColors = [
    Colors.primary, Colors.secondary, Colors.accent, '#FDCB6E', '#74B9FF',
  ];

  return (
    <View style={[styles.avatarStack, { height: size }]}>
      {visible.map((m, i) => (
        <View
          key={m.uid}
          style={[
            {
              marginLeft: i === 0 ? 0 : -(size * 0.35),
              zIndex: visible.length - i,
            },
          ]}
        >
          <Avatar
            name={m.displayName}
            size={size}
            color={avatarColors[i % avatarColors.length]}
            style={{ borderWidth: 2, borderColor: Colors.background }}
          />
        </View>
      ))}
      {remaining > 0 && (
        <View
          style={[
            styles.avatarOverflow,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: -(size * 0.35),
            },
          ]}
        >
          <Text style={[styles.avatarOverflowText, { fontSize: size * 0.3 }]}>
            +{remaining}
          </Text>
        </View>
      )}
    </View>
  );
};

// ── Divider ─────────────────────────────────

export const Divider: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.divider, style]} />
);

// ── Chip ────────────────────────────────────

interface ChipProps {
  label: string;
  icon?: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  icon,
  selected = false,
  onPress,
  color = Colors.primary,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[
      styles.chip,
      selected
        ? { backgroundColor: color, borderColor: color }
        : { backgroundColor: Colors.backgroundInput, borderColor: Colors.surfaceBorder },
    ]}
  >
    {icon && (
      <Ionicons
        name={icon as any}
        size={14}
        color={selected ? Colors.text : Colors.textSecondary}
        style={{ marginRight: 4 }}
      />
    )}
    <Text style={[styles.chipText, { color: selected ? Colors.text : Colors.textSecondary }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ── Styles ───────────────────────────────────

const styles = StyleSheet.create({
  buttonBase: {
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  badge: {
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 0.3,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontFamily: Typography.fontFamily.bold,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarOverflow: {
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 2,
    borderColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverflowText: {
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginVertical: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
  },
});
