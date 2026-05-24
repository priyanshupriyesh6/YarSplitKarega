// ─────────────────────────────────────────────
//  CustomTabBar.tsx — Radial Navigation Wheel
// ─────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  Vibration,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, BorderRadius, Shadow } from '../../constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// 6 screens navigation items
const TABS = [
  { name: 'Dashboard', icon: 'home-outline', iconFocused: 'home', label: 'Home', color: '#6C63FF' },
  { name: 'Transactions', icon: 'receipt-outline', iconFocused: 'receipt', label: 'Bills', color: '#FF6584' },
  { name: 'Groups', icon: 'people-outline', iconFocused: 'people', label: 'Groups', color: '#00D9B5' },
  { name: 'Scanner', icon: 'scan-outline', iconFocused: 'scan', label: 'Scan', color: '#FD79A8' },
  { name: 'Reports', icon: 'bar-chart-outline', iconFocused: 'bar-chart', label: 'Reports', color: '#74B9FF' },
  { name: 'Profile', icon: 'person-outline', iconFocused: 'person', label: 'Profile', color: '#FFB300' },
];

const RAD = Math.PI / 180;
const RADIUS = 125; // radius of radial circle

// Compute positions for 6 buttons evenly along 150-degree arc from 165 to 15 degrees
const TABS_WITH_POSITIONS = TABS.map((tab, idx) => {
  const angle = 165 - idx * 30; // 165, 135, 105, 75, 45, 15
  const dx = RADIUS * Math.cos(angle * RAD);
  const dy = -RADIUS * Math.sin(angle * RAD); // negative is up
  return { ...tab, angle, dx, dy };
});

export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeHoverIdx, setActiveHoverIdx] = useState<number | null>(null);
  
  // Animation ref
  const animValue = useRef(new Animated.Value(0)).current;

  // Touch tracking refs
  const anchorPos = useRef({ x: 0, y: 0 });
  const touchStart = useRef<number>(0);
  const isDragging = useRef(false);
  const longPressTimer = useRef<any>(null);

  // Trigger light haptic vibration
  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(style).catch(() => {});
    }
  };

  // Trigger success haptic notification
  const triggerSuccessHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  // Open the radial wheel menu
  const openMenu = () => {
    setIsOpen(true);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(animValue, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 220,
    }).start();
  };

  // Close the radial wheel menu
  const closeMenu = () => {
    Animated.spring(animValue, {
      toValue: 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 250,
    }).start(() => {
      setIsOpen(false);
      setActiveHoverIdx(null);
    });
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const currentTab = TABS[state.index];

  // Touch start on the anchor button
  const handleTouchStart = (e: any) => {
    const pageX = e.nativeEvent.pageX;
    const pageY = e.nativeEvent.pageY;

    anchorPos.current = { x: pageX, y: pageY };
    touchStart.current = Date.now();
    isDragging.current = true;

    // Start a timer for press-and-hold radial open (180ms feels extremely snappy!)
    longPressTimer.current = setTimeout(() => {
      if (isDragging.current && !isOpen) {
        openMenu();
      }
    }, 180);
  };

  // Touch move (drag-to-select)
  const handleTouchMove = (e: any) => {
    if (!isDragging.current) return;

    const pageX = e.nativeEvent.pageX;
    const pageY = e.nativeEvent.pageY;

    // Relative coordinates from user initial touch point
    const dx = pageX - anchorPos.current.x;
    const dy = pageY - anchorPos.current.y;

    if (!isOpen) {
      // If user drags early without waiting for long-press timer, we open immediately!
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 15) {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        openMenu();
      }
      return;
    }

    // Radial drag selection logic
    let nearestIdx: number | null = null;
    let minDistance = 45; // trigger distance threshold (in dp)

    TABS_WITH_POSITIONS.forEach((tab, idx) => {
      // Distance from current swipe touch coordinate to sub-button center
      const dist = Math.sqrt(Math.pow(dx - tab.dx, 2) + Math.pow(dy - tab.dy, 2));
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = idx;
      }
    });

    if (nearestIdx !== activeHoverIdx) {
      setActiveHoverIdx(nearestIdx);
      if (nearestIdx !== null) {
        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  // Touch end (navigate if hovering, otherwise toggle or close)
  const handleTouchEnd = () => {
    isDragging.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);

    const duration = Date.now() - touchStart.current;

    if (isOpen) {
      if (activeHoverIdx !== null) {
        // Drag-selected a tab!
        const tab = TABS_WITH_POSITIONS[activeHoverIdx];
        const route = state.routes.find(r => r.name === tab.name);
        
        if (route) {
          triggerSuccessHaptic();
          navigation.navigate(route.name);
        }
        closeMenu();
      } else {
        // Drag released over empty space:
        // If it was a quick long-press release, we close.
        // If it was a quick tap toggle, we let it stay open.
        if (duration > 350) {
          closeMenu();
        }
      }
    } else {
      // Short tap when closed: toggle open!
      if (duration < 250) {
        openMenu();
      }
    }
  };

  // Tap navigation for sub-buttons directly (Tap-Toggle Accessibility mode)
  const handleSubButtonTap = (tabName: string) => {
    const route = state.routes.find(r => r.name === tabName);
    if (route) {
      triggerSuccessHaptic();
      navigation.navigate(route.name);
    }
    closeMenu();
  };

  // Interpolations for flyout animations
  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const anchorRotate = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '135deg'], // rotation gives a beautiful compass dial effect
  });

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      
      {/* ── Backdrop Blur Overlay (Full Screen Focus) ── */}
      {isOpen && (
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
          onTouchStart={closeMenu} // tapping background collapses menu
        >
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}

      {/* ── Drag Gesture Area ── */}
      {/* Invisible overlay overlaying only when dragging, capturing moves */}
      {isOpen && (
        <View
          style={styles.gestureCaptureOverlay}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      )}

      {/* ── Active Hover Label HUD (Shows glowing label when dragging) ── */}
      {isOpen && (
        <View style={styles.hudContainer} pointerEvents="none">
          <Text style={styles.hudLabel}>
            {activeHoverIdx !== null ? TABS_WITH_POSITIONS[activeHoverIdx].label : 'Swipe to Navigate'}
          </Text>
        </View>
      )}

      {/* ── Radial Wheel Sub-Buttons ── */}
      <View style={styles.wheelContainer} pointerEvents="box-none">
        {TABS_WITH_POSITIONS.map((tab, idx) => {
          const isFocused = state.index === idx;
          const isHovered = activeHoverIdx === idx;
          
          // Animate position from anchor center (0,0) to target coordinates
          const translateX = animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, tab.dx],
          });
          const translateY = animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, tab.dy],
          });
          
          // Combine fade and scale
          const opacity = animValue.interpolate({
            inputRange: [0, 0.4, 1],
            outputRange: [0, 0, 1],
          });

          return (
            <Animated.View
              key={tab.name}
              style={[
                styles.radialButtonWrapper,
                {
                  transform: [
                    { translateX },
                    { translateY },
                    { scale: isHovered ? 1.28 : isFocused ? 1.08 : 0.95 },
                  ],
                  opacity,
                },
              ]}
              pointerEvents={isOpen ? 'auto' : 'none'}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleSubButtonTap(tab.name)}
                style={[
                  styles.radialButton,
                  isFocused && styles.radialButtonFocused,
                  isHovered && {
                    borderColor: tab.color,
                    backgroundColor: 'rgba(26, 25, 40, 0.95)',
                    ...Shadow.md,
                  },
                ]}
              >
                <Ionicons
                  name={(isFocused ? tab.iconFocused : tab.icon) as any}
                  size={20}
                  color={isHovered ? tab.color : isFocused ? Colors.primary : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.radialLabel,
                    isFocused && { color: Colors.primary, fontFamily: Typography.fontFamily.semiBold },
                    isHovered && { color: tab.color, fontFamily: Typography.fontFamily.bold },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* ── Bottom Central Floating Anchor Button ── */}
        <View style={styles.anchorWrapper} pointerEvents="auto">
          <Animated.View
            style={[
              styles.anchorOuter,
              isOpen && styles.anchorOuterActive,
              { transform: [{ rotate: anchorRotate }] },
            ]}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <LinearGradient
              colors={isOpen ? ['#FF6584', '#FF9A5C'] : Colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.anchorGradient}
            >
              <Ionicons
                name={isOpen ? 'close' : 'compass'}
                size={28}
                color={Colors.text}
              />
            </LinearGradient>
          </Animated.View>
          
          {/* Active Tab indicator bubble below anchor button */}
          {!isOpen && (
            <View style={styles.activeBubble}>
              <Text style={styles.activeBubbleText}>
                {currentTab?.label || 'Home'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_H, // full screen container to easily float backdrop and HUD labels
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 9, 15, 0.55)',
  },
  gestureCaptureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 99,
  },
  hudContainer: {
    position: 'absolute',
    bottom: 220,
    alignSelf: 'center',
    backgroundColor: 'rgba(26, 25, 40, 0.9)',
    borderRadius: BorderRadius.full,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: Colors.primaryAlpha,
    ...Shadow.sm,
    zIndex: 101,
  },
  hudLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 0.8,
  },
  wheelContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 44 : 26,
    zIndex: 100,
  },
  radialButtonWrapper: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(26, 25, 40, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...Shadow.sm,
  },
  radialButtonFocused: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(108, 99, 255, 0.08)',
  },
  radialLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  anchorWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anchorOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: Colors.backgroundCard,
    ...Shadow.md,
  },
  anchorOuterActive: {
    borderColor: 'rgba(255, 101, 132, 0.4)',
    transform: [{ scale: 0.95 }],
  },
  anchorGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBubble: {
    position: 'absolute',
    bottom: -18,
    backgroundColor: 'rgba(26, 25, 40, 0.9)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: BorderRadius.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  activeBubbleText: {
    fontSize: 8,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
