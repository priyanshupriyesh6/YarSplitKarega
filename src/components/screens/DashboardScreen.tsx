// ─────────────────────────────────────────────
//  Dashboard Screen — Home tab
// ─────────────────────────────────────────────

import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { useExpenseStore } from '../../store/expenseStore';
import { CURRENT_USER } from '../../utils/mockData';
import { formatCurrency, formatDate, formatRelativeTime } from '../../utils/formatters';
import { CATEGORY_MAP } from '../../constants/categories';
import { Card, Avatar, AvatarStack, Badge } from '../ui';

const { width: SCREEN_W } = Dimensions.get('window');

export const DashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<any>();

  const { groups, expenses, getTotalOwed, getTotalIOwe } = useExpenseStore();
  const totalOwed = getTotalOwed();
  const totalIOwe = getTotalIOwe();
  const netBalance = totalOwed - totalIOwe;

  // Recent activity — latest 10 expenses across all groups
  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Hero Header */}
      <LinearGradient
        colors={['#0F0E17', '#1A1542', '#0F0E17']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Animated.View style={{ opacity: headerOpacity }}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Good evening, 👋</Text>
              <Text style={styles.userName}>{CURRENT_USER.displayName.split(' ')[0]}</Text>
            </View>
            <TouchableOpacity style={styles.notifButton}>
              <Ionicons name="notifications-outline" size={22} color={Colors.textSecondary} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </View>

          {/* Balance Summary Card */}
          <LinearGradient
            colors={Colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            {/* Background decoration */}
            <View style={styles.balanceCardDecor1} />
            <View style={styles.balanceCardDecor2} />

            <Text style={styles.balanceLabel}>Net Balance</Text>
            <Text style={[
              styles.balanceAmount,
              { color: netBalance >= 0 ? '#A0FFD6' : '#FFB3BF' }
            ]}>
              {formatCurrency(Math.abs(netBalance), 'INR', true)}
            </Text>
            <Text style={styles.balanceSubtext}>
              {netBalance >= 0
                ? 'Overall, people owe you'
                : 'Overall, you owe people'}
            </Text>

            <View style={styles.balanceRow}>
              <View style={styles.balancePill}>
                <Ionicons name="arrow-down-circle" size={16} color="#A0FFD6" />
                <View style={{ marginLeft: 6 }}>
                  <Text style={styles.pillLabel}>You're Owed</Text>
                  <Text style={[styles.pillAmount, { color: '#A0FFD6' }]}>
                    {formatCurrency(totalOwed, 'INR')}
                  </Text>
                </View>
              </View>
              <View style={[styles.balancePill, styles.balancePillRight]}>
                <Ionicons name="arrow-up-circle" size={16} color="#FFB3BF" />
                <View style={{ marginLeft: 6 }}>
                  <Text style={styles.pillLabel}>You Owe</Text>
                  <Text style={[styles.pillAmount, { color: '#FFB3BF' }]}>
                    {formatCurrency(totalIOwe, 'INR')}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </LinearGradient>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Groups */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Groups</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Groups')}>
              <Text style={styles.sectionLink}>See all</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={groups}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingRight: Spacing.base }}
            renderItem={({ item: group }) => {
              const myBalance = group.balances[CURRENT_USER.uid] ?? 0;
              return (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Groups', {
                    screen: 'GroupDetail',
                    params: { groupId: group.id },
                  })}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[`${group.coverColor}22`, `${group.coverColor}08`]}
                    style={[styles.groupCard, { borderColor: `${group.coverColor}33` }]}
                  >
                    <Text style={styles.groupEmoji}>{group.emoji}</Text>
                    <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
                    <AvatarStack
                      members={group.members}
                      maxVisible={3}
                      size={26}
                    />
                    <View style={styles.groupBalance}>
                      <Text style={[
                        styles.groupBalanceAmount,
                        { color: myBalance >= 0 ? Colors.positive : Colors.negative }
                      ]}>
                        {formatCurrency(Math.abs(myBalance), group.currency, true)}
                      </Text>
                      <Text style={styles.groupBalanceLabel}>
                        {myBalance >= 0 ? 'owed to you' : 'you owe'}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>

          {recentExpenses.map((expense) => {
            const category = CATEGORY_MAP[expense.category];
            const group = groups.find((g) => g.id === expense.groupId);
            const myShare = expense.splits.find((s) => s.uid === CURRENT_USER.uid)?.amount ?? 0;
            const iPaid = expense.paidBy === CURRENT_USER.uid;

            return (
              <Card key={expense.id} style={styles.activityCard}>
                <View style={styles.activityRow}>
                  {/* Category icon */}
                  <LinearGradient
                    colors={category.gradientColors}
                    style={styles.categoryIcon}
                  >
                    <Ionicons name={category.icon as any} size={18} color="#fff" />
                  </LinearGradient>

                  {/* Details */}
                  <View style={styles.activityDetails}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {expense.title}
                    </Text>
                    <View style={styles.activityMeta}>
                      <Text style={styles.activityMetaText}>
                        {group?.name} · {formatDate(expense.date)}
                      </Text>
                    </View>
                    <Text style={styles.activityPaidBy}>
                      {iPaid ? 'You paid' : `${expense.paidByName} paid`}
                    </Text>
                  </View>

                  {/* Amount */}
                  <View style={styles.activityAmount}>
                    <Text style={styles.activityTotal}>
                      {formatCurrency(expense.amount, expense.currency)}
                    </Text>
                    {!iPaid && myShare > 0 && (
                      <Text style={[styles.activityShare, { color: Colors.negative }]}>
                        your share {formatCurrency(myShare, expense.currency)}
                      </Text>
                    )}
                    {iPaid && (
                      <Badge
                        label="Paid"
                        color={Colors.positive}
                        size="sm"
                      />
                    )}
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  greeting: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  userName: {
    fontSize: Typography.fontSize['3xl'],
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
    marginTop: 2,
  },
  notifButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    borderWidth: 1.5,
    borderColor: Colors.backgroundCard,
  },
  balanceCard: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  balanceCardDecor1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  balanceCardDecor2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  balanceLabel: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Typography.fontFamily.medium,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: Typography.fontSize['5xl'],
    fontFamily: Typography.fontFamily.extraBold,
    marginTop: 4,
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Typography.fontFamily.regular,
    marginBottom: Spacing.lg,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  balancePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  balancePillRight: {
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  pillLabel: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Typography.fontFamily.medium,
  },
  pillAmount: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
    marginTop: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.xl,
  },
  section: {
    marginBottom: Spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  sectionLink: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  groupCard: {
    width: 160,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginLeft: Spacing.base,
    borderWidth: 1,
    gap: 8,
  },
  groupEmoji: {
    fontSize: 28,
  },
  groupName: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
  groupBalance: {
    marginTop: 4,
  },
  groupBalanceAmount: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
  },
  groupBalanceLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
    marginTop: 1,
  },
  activityCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityDetails: {
    flex: 1,
    gap: 2,
  },
  activityTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityMetaText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
  },
  activityPaidBy: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
  },
  activityAmount: {
    alignItems: 'flex-end',
    gap: 4,
  },
  activityTotal: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  activityShare: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
  },
});
