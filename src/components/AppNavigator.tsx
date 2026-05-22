// ─────────────────────────────────────────────
//  Main Navigation — All stacks + tab navigator
// ─────────────────────────────────────────────

import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import { Colors } from '../constants/theme';
import { CustomTabBar } from './navigation/CustomTabBar';

// Screens
import { DashboardScreen } from './screens/DashboardScreen';
import { ScannerScreen } from './screens/ScannerScreen';
import { GroupListScreen, GroupDetailScreen } from './screens/GroupsScreen';
import { AddExpenseScreen } from './screens/AddExpenseScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { ProfileScreen } from './screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const NAV_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
    card: Colors.backgroundCard,
    text: Colors.text,
    border: Colors.surfaceBorder,
    notification: Colors.primary,
    primary: Colors.primary,
  },
};

// ── Groups Stack ─────────────────────────────

function GroupsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GroupList" component={GroupListScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="ExpenseDetail" component={GroupDetailScreen} />
      <Stack.Screen name="SettleUp" component={SettleUpScreen} />
    </Stack.Navigator>
  );
}

// ── Settle Up screen (inline) ────────────────

import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useExpenseStore } from '../store/expenseStore';
import { formatCurrency } from '../utils/formatters';
import { CURRENT_USER } from '../utils/mockData';
import { Spacing, BorderRadius, Typography, Shadow } from '../constants/theme';
import { Button, Avatar, Card } from './ui';

function SettleUpScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { groupId } = route.params;

  const { getGroup, getSettlementSuggestions, settleUp } = useExpenseStore();
  const group = getGroup(groupId);
  const suggestions = getSettlementSuggestions(groupId);

  if (!group) return null;

  const handleSettle = (fromUid: string, toUid: string, amount: number) => {
    Alert.alert(
      'Confirm Settlement',
      `Mark this payment as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            settleUp(groupId, fromUid, toUid, amount);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={[styles.settleHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.settleTitle}>Settle Up</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[{ padding: Spacing.base, gap: Spacing.md }, { paddingBottom: insets.bottom + 60 }]}
      >
        {suggestions.length === 0 ? (
          <View style={styles.settledState}>
            <Text style={styles.settledEmoji}>🎉</Text>
            <Text style={styles.settledTitle}>All settled up!</Text>
            <Text style={styles.settledSub}>No outstanding balances in this group.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.settleSubtitle}>
              {suggestions.length} payment{suggestions.length > 1 ? 's' : ''} will settle all debts
            </Text>
            {suggestions.map((s, i) => (
              <Card key={i} style={styles.suggestionCard} elevated>
                <View style={styles.suggestionRow}>
                  <Avatar name={s.fromName} size={48} color={Colors.negative} />
                  <View style={styles.suggestionMiddle}>
                    <LinearGradient
                      colors={Colors.gradientPrimary}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.arrowLine}
                    />
                    <View style={styles.amountBubble}>
                      <Text style={styles.suggestionAmount}>
                        {formatCurrency(s.amount, group.currency)}
                      </Text>
                    </View>
                  </View>
                  <Avatar name={s.toName} size={48} color={Colors.positive} />
                </View>
                <Text style={styles.suggestionDesc}>
                  <Text style={{ color: Colors.text, fontFamily: Typography.fontFamily.bold }}>{s.fromName}</Text>
                  {' '}pays{' '}
                  <Text style={{ color: Colors.text, fontFamily: Typography.fontFamily.bold }}>{s.toName}</Text>
                </Text>
                {(s.fromUid === CURRENT_USER.uid || s.toUid === CURRENT_USER.uid) && (
                  <Button
                    label="Mark as Paid"
                    size="sm"
                    onPress={() => handleSettle(s.fromUid, s.toUid, s.amount)}
                    style={{ marginTop: Spacing.md }}
                    fullWidth
                  />
                )}
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Main Tab Navigator ───────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Scanner" component={ScannerScreen} />
      <Tab.Screen name="Groups" component={GroupsStack} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Root Navigator ───────────────────────────

export function AppNavigator() {
  return (
    <NavigationContainer theme={NAV_THEME}>
      <MainTabs />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  settleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleTitle: {
    fontSize: Typography.fontSize.xl,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  settleSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  settledState: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
    gap: Spacing.md,
  },
  settledEmoji: { fontSize: 64 },
  settledTitle: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  settledSub: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
  },
  suggestionCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: Spacing.base,
  },
  suggestionMiddle: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
    height: 48,
    justifyContent: 'center',
  },
  arrowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
  },
  amountBubble: {
    backgroundColor: Colors.backgroundCard,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  suggestionAmount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  suggestionDesc: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
  },
});
