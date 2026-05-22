import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors, Typography, BorderRadius, Shadow } from '../../constants/theme';

const TABS = [
  { name: 'Dashboard', icon: 'home', iconFocused: 'home', label: 'Home' },
  { name: 'Scanner', icon: 'scan-outline', iconFocused: 'scan', label: 'Scan' },
  { name: 'Groups', icon: 'people-outline', iconFocused: 'people', label: 'Groups' },
  { name: 'Reports', icon: 'bar-chart-outline', iconFocused: 'bar-chart', label: 'Reports' },
  { name: 'Profile', icon: 'person-outline', iconFocused: 'person', label: 'Profile' },
];

// ── Per-tab item component (hooks must not be called in a loop) ─
interface TabItemProps {
  route: { key: string; name: string };
  index: number;
  state: BottomTabBarProps['state'];
  navigation: BottomTabBarProps['navigation'];
}

const TabItem: React.FC<TabItemProps> = ({ route, index, state, navigation }) => {
  const tab = TABS.find((t) => t.name === route.name)!;
  const isFocused = state.index === index;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.15 : 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 200,
      }),
      Animated.timing(opacityAnim, {
        toValue: isFocused ? 1 : 0.55,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  // Special centre "Scan" button
  if (route.name === 'Scanner') {
    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.centerButtonWrapper}
      >
        <Animated.View
          style={[
            styles.centerButton,
            { transform: [{ scale: scaleAnim }] },
            isFocused && styles.centerButtonActive,
          ]}
        >
          <View style={styles.centerButtonInner}>
            <Ionicons
              name={isFocused ? (tab.iconFocused as any) : (tab.icon as any)}
              size={26}
              color={Colors.text}
            />
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      key={route.key}
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.tabItem}
    >
      <Animated.View
        style={[
          styles.tabIconWrapper,
          { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
        ]}
      >
        {isFocused && <View style={styles.activeIndicator} />}
        <Ionicons
          name={isFocused ? (tab.iconFocused as any) : (tab.icon as any)}
          size={22}
          color={isFocused ? Colors.primary : Colors.textMuted}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: isFocused ? Colors.primary : Colors.textMuted },
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  return (
    <View style={styles.wrapper}>
      <BlurView intensity={80} tint="dark" style={styles.blur}>
        <View style={styles.container}>
          {state.routes.map((route, index) => (
            <TabItem
              key={route.key}
              route={route}
              index={index}
              state={state}
              navigation={navigation}
            />
          ))}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  blur: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabIconWrapper: {
    alignItems: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    marginTop: 2,
  },
  activeIndicator: {
    position: 'absolute',
    top: -10,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  centerButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    ...Shadow.md,
  },
  centerButtonActive: {
    backgroundColor: Colors.primaryDark,
  },
  centerButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
});
