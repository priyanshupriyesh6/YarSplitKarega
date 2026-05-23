// ─────────────────────────────────────────────
//  Reports Screen — Charts + Expense Analytics
// ─────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, LineChart, BarChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from 'date-fns';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { useExpenseStore } from '../../store/expenseStore';
import { useAuthStore } from '../../store/authStore';
import { CURRENT_USER } from '../../utils/mockData';
import { formatCurrency, formatMonth } from '../../utils/formatters';
import { CATEGORIES, CATEGORY_MAP, CategoryId } from '../../constants/categories';
import { Card, Badge } from '../ui';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - Spacing.base * 2 - 32;

type TimeRange = '1M' | '3M' | '6M' | 'ALL';

export const ReportsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { groups, expenses } = useExpenseStore();
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('3M');
  const [reportType, setReportType] = useState<'group' | 'individual'>('group');

  const { user } = useAuthStore();
  const activeUser = user || CURRENT_USER;

  // Find Personal group ID to categorize individual vs group
  const personalGroup = groups.find(
    (g) => g.name === 'Personal Expenses' && g.createdBy === activeUser.uid
  );

  const visibleGroups = groups.filter((g) => g.id !== personalGroup?.id);
  const allGroups = [{ id: 'all', name: 'All Groups', emoji: '📊' }, ...visibleGroups];

  // Filter expenses by group and time range
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const rangeStart: Date =
      timeRange === '1M' ? subMonths(now, 1)
        : timeRange === '3M' ? subMonths(now, 3)
          : timeRange === '6M' ? subMonths(now, 6)
            : new Date('2020-01-01');

    return expenses.filter((e) => {
      const matchesType = reportType === 'individual' 
        ? e.groupId === personalGroup?.id 
        : e.groupId !== personalGroup?.id;

      if (!matchesType) return false;

      const matchesGroup = reportType === 'individual' || selectedGroup === 'all' || e.groupId === selectedGroup;
      const expDate = parseISO(e.date);
      const matchesTime = expDate >= rangeStart;
      return matchesGroup && matchesTime;
    });
  }, [expenses, selectedGroup, timeRange, reportType, personalGroup]);

  const totalSpent = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const myTotalShare = filteredExpenses.reduce((s, e) => {
    const split = e.splits.find((sp) => sp.uid === activeUser.uid);
    return s + (split?.amount ?? 0);
  }, 0);
  const avgExpense = filteredExpenses.length > 0
    ? totalSpent / filteredExpenses.length : 0;

  // Category breakdown
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of filteredExpenses) {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    }
    return Object.entries(map)
      .map(([catId, amount]) => {
        const cat = CATEGORY_MAP[catId as CategoryId] || CATEGORY_MAP['other'];
        return {
          catId,
          label: cat.label,
          amount,
          percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
          color: cat.color,
          gradientColors: cat.gradientColors,
          icon: cat.icon,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, totalSpent]);

  // Pie chart data
  const pieData = categoryData.map((c, i) => ({
    value: c.amount,
    color: c.color,
    label: c.label,
    gradientCenterColor: c.gradientColors[1],
    focused: i === 0,
  }));

  // Monthly trend data
  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    const monthCount = timeRange === '1M' ? 1 : timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : 12;

    for (let i = monthCount - 1; i >= 0; i--) {
      const d = subMonths(now, i);
      months[format(d, 'yyyy-MM')] = 0;
    }

    for (const e of filteredExpenses) {
      const key = format(parseISO(e.date), 'yyyy-MM');
      if (key in months) {
        months[key] = (months[key] ?? 0) + e.amount;
      }
    }

    return Object.entries(months).map(([month, value]) => ({
      value,
      label: format(parseISO(`${month}-01`), 'MMM'),
      dataPointText: value > 0 ? `₹${(value / 1000).toFixed(1)}k` : '',
    }));
  }, [filteredExpenses, timeRange]);

  // Top spender per group
  const memberSpend = useMemo(() => {
    const groupToUse = selectedGroup === 'all' ? null : visibleGroups.find((g) => g.id === selectedGroup);
      const members = groupToUse ? groupToUse.members : Array.from(
        new Map(
          visibleGroups.flatMap((g) => g.members).map((m) => [m.uid, m])
        ).values()
      );

    return members.map((member) => {
      const paid = filteredExpenses
        .filter((e) => e.paidBy === member.uid)
        .reduce((s, e) => s + e.amount, 0);
      const owed = filteredExpenses
        .flatMap((e) => e.splits)
        .filter((sp) => sp.uid === member.uid)
        .reduce((s, sp) => s + sp.amount, 0);
      return { ...member, paid, owed, net: paid - owed };
    }).sort((a, b) => b.paid - a.paid);
  }, [filteredExpenses, selectedGroup, visibleGroups]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0F0E17', '#1A1542']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Text style={styles.headerTitle}>Reports</Text>
        <Text style={styles.headerSub}>Spending insights & trends</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Toggle Report Type */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, reportType === 'group' && styles.toggleBtnActive]}
            onPress={() => {
              setReportType('group');
              setSelectedGroup('all');
            }}
          >
            <Ionicons name="people-outline" size={16} color={reportType === 'group' ? Colors.text : Colors.textSecondary} />
            <Text style={[styles.toggleText, reportType === 'group' && styles.toggleTextActive]}>
              Group Reports
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, reportType === 'individual' && styles.toggleBtnActive]}
            onPress={() => {
              setReportType('individual');
              setSelectedGroup('all');
            }}
          >
            <Ionicons name="person-outline" size={16} color={reportType === 'individual' ? Colors.text : Colors.textSecondary} />
            <Text style={[styles.toggleText, reportType === 'individual' && styles.toggleTextActive]}>
              Personal Reports
            </Text>
          </TouchableOpacity>
        </View>

        {/* Group filter - Only visible in Group Reports */}
        {reportType === 'group' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {allGroups.map((g) => (
              <TouchableOpacity
                key={g.id}
                onPress={() => setSelectedGroup(g.id)}
                style={[
                  styles.groupFilter,
                  selectedGroup === g.id && styles.groupFilterActive,
                ]}
              >
                <Text style={styles.groupFilterEmoji}>{g.emoji}</Text>
                <Text style={[
                  styles.groupFilterText,
                  selectedGroup === g.id && { color: Colors.primary },
                ]}>
                  {g.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Time range pills */}
        <View style={styles.timeRangeRow}>
          {(['1M', '3M', '6M', 'ALL'] as TimeRange[]).map((tr) => (
            <TouchableOpacity
              key={tr}
              onPress={() => setTimeRange(tr)}
              style={[styles.timeBtn, timeRange === tr && styles.timeBtnActive]}
            >
              <Text style={[styles.timeBtnText, timeRange === tr && styles.timeBtnTextActive]}>
                {tr}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Total Spent</Text>
            <Text style={styles.statValue}>{formatCurrency(totalSpent, 'INR')}</Text>
            <Text style={styles.statSub}>{filteredExpenses.length} expenses</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Your Share</Text>
            <Text style={[styles.statValue, { color: Colors.negative }]}>
              {formatCurrency(myTotalShare, 'INR')}
            </Text>
            <Text style={styles.statSub}>
              {totalSpent > 0 ? `${((myTotalShare / totalSpent) * 100).toFixed(0)}% of total` : '—'}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Avg/Expense</Text>
            <Text style={styles.statValue}>{formatCurrency(avgExpense, 'INR')}</Text>
            <Text style={styles.statSub}>per transaction</Text>
          </Card>
        </View>

        {/* Category pie chart */}
        {pieData.length > 0 ? (
          <Card style={styles.chartCard} elevated>
            <Text style={styles.chartTitle}>Spending by Category</Text>
            <View style={styles.pieContainer}>
              <PieChart
                data={pieData}
                donut
                radius={90}
                innerRadius={55}
                innerCircleColor={Colors.backgroundCard}
                centerLabelComponent={() => (
                  <View style={styles.pieCenterLabel}>
                    <Text style={styles.pieCenterTotal}>
                      ₹{(totalSpent / 1000).toFixed(1)}k
                    </Text>
                    <Text style={styles.pieCenterSub}>total</Text>
                  </View>
                )}
              />
              <View style={styles.pieLegend}>
                {categoryData.slice(0, 5).map((cat) => (
                  <View key={cat.catId} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                    <View style={styles.legendInfo}>
                      <Text style={styles.legendLabel} numberOfLines={1}>{cat.label}</Text>
                      <Text style={styles.legendAmount}>{formatCurrency(cat.amount, 'INR')}</Text>
                    </View>
                    <Text style={[styles.legendPct, { color: cat.color }]}>
                      {cat.percentage.toFixed(0)}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        ) : (
          <Card style={styles.emptyChart}>
            <Text style={styles.emptyChartEmoji}>📊</Text>
            <Text style={styles.emptyChartText}>No expenses in this period</Text>
          </Card>
        )}

        {/* Monthly trend line chart */}
        {monthlyData.some((d) => d.value > 0) && (
          <Card style={styles.chartCard} elevated>
            <Text style={styles.chartTitle}>Monthly Spending Trend</Text>
            <LineChart
              data={monthlyData}
              width={CHART_W}
              height={180}
              color={Colors.primary}
              thickness={2.5}
              startFillColor={`${Colors.primary}40`}
              endFillColor={`${Colors.primary}00`}
              areaChart
              curved
              noOfSections={4}
              yAxisColor="transparent"
              xAxisColor={Colors.surfaceBorder}
              rulesColor={Colors.surfaceBorder}
              yAxisTextStyle={{ color: Colors.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: Colors.textMuted, fontSize: 10 }}
              dataPointsColor={Colors.primary}
              dataPointsRadius={4}
              yAxisExtraHeight={20}
              formatYLabel={(v) => `₹${parseInt(v) >= 1000 ? `${(parseInt(v) / 1000).toFixed(0)}k` : v}`}
              hideRules={false}
              initialSpacing={10}
              endSpacing={10}
            />
          </Card>
        )}

        {/* Monthly bar chart */}
        {monthlyData.some((d) => d.value > 0) && (
          <Card style={styles.chartCard} elevated>
            <Text style={styles.chartTitle}>Monthly Breakdown</Text>
            <BarChart
              data={monthlyData.map((d) => ({
                value: d.value,
                label: d.label,
                frontColor: Colors.primary,
                gradientColor: Colors.primaryDark,
                topLabelComponent: () =>
                  d.value > 0 ? (
                    <Text style={{ color: Colors.textMuted, fontSize: 9, marginBottom: 4 }}>
                      {d.value >= 1000 ? `${(d.value / 1000).toFixed(0)}k` : d.value}
                    </Text>
                  ) : null,
              }))}
              width={CHART_W}
              height={160}
              barWidth={CHART_W / Math.max(monthlyData.length * 2, 8)}
              noOfSections={4}
              barBorderTopLeftRadius={4}
              barBorderTopRightRadius={4}
              yAxisColor="transparent"
              xAxisColor={Colors.surfaceBorder}
              rulesColor={Colors.surfaceBorder}
              yAxisTextStyle={{ color: Colors.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: Colors.textMuted, fontSize: 10 }}
              formatYLabel={(v) => `${parseInt(v) >= 1000 ? `${(parseInt(v) / 1000).toFixed(0)}k` : v}`}
              initialSpacing={10}
              isAnimated
              gradientColor={Colors.primaryDark}
            />
          </Card>
        )}

        {/* Member spending breakdown - Only shown for Group Reports */}
        {reportType === 'group' && memberSpend.length > 0 && (
          <Card style={styles.chartCard} elevated>
            <Text style={styles.chartTitle}>Member Spending</Text>
            {memberSpend.map((member, i) => {
              const barWidth = totalSpent > 0 ? (member.paid / totalSpent) * 100 : 0;
              return (
                <View key={member.uid} style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {member.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberBarSection}>
                    <View style={styles.memberBarHeader}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {member.uid === activeUser.uid ? 'You' : member.displayName}
                      </Text>
                      <Text style={styles.memberPaid}>
                        {formatCurrency(member.paid, 'INR')}
                      </Text>
                    </View>
                    <View style={styles.memberBarBg}>
                      <LinearGradient
                        colors={Colors.gradientPrimary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.memberBar, { width: `${barWidth}%` }]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* Category detail list */}
        {categoryData.length > 0 && (
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Category Details</Text>
            {categoryData.map((cat) => (
              <View key={cat.catId} style={styles.catDetailRow}>
                <LinearGradient
                  colors={cat.gradientColors}
                  style={styles.catDetailIcon}
                >
                  <Ionicons name={cat.icon as any} size={16} color="#fff" />
                </LinearGradient>
                <View style={styles.catDetailInfo}>
                  <Text style={styles.catDetailName}>{cat.label}</Text>
                  <View style={styles.catProgressBg}>
                    <View
                      style={[
                        styles.catProgress,
                        { width: `${cat.percentage}%`, backgroundColor: cat.color },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.catDetailRight}>
                  <Text style={styles.catDetailAmount}>{formatCurrency(cat.amount, 'INR')}</Text>
                  <Text style={[styles.catDetailPct, { color: cat.color }]}>
                    {cat.percentage.toFixed(0)}%
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  headerSub: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    marginTop: 4,
  },
  content: {
    padding: Spacing.base,
    gap: Spacing.base,
  },
  filterRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.base,
  },
  groupFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  groupFilterActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryAlpha,
  },
  groupFilterEmoji: { fontSize: 14 },
  groupFilterText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
  },
  timeRangeRow: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  timeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  timeBtnActive: { backgroundColor: Colors.primary },
  timeBtnText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.semiBold,
  },
  timeBtnTextActive: { color: Colors.text },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  statValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
    textAlign: 'center',
  },
  statSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
  },
  chartCard: {
    gap: Spacing.base,
    padding: Spacing.base,
  },
  chartTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  pieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    flexWrap: 'wrap',
  },
  pieCenterLabel: {
    alignItems: 'center',
  },
  pieCenterTotal: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  pieCenterSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
  },
  pieLegend: {
    flex: 1,
    gap: Spacing.sm,
    minWidth: 140,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  legendInfo: { flex: 1 },
  legendLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
  },
  legendAmount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
  legendPct: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.bold,
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.md,
  },
  emptyChartEmoji: { fontSize: 36 },
  emptyChartText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryAlpha,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  memberAvatarText: {
    fontSize: Typography.fontSize.base,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  memberBarSection: { flex: 1, gap: 4 },
  memberBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
    flex: 1,
  },
  memberPaid: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  memberBarBg: {
    height: 6,
    backgroundColor: Colors.backgroundElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  memberBar: {
    height: '100%',
    borderRadius: 3,
    minWidth: 4,
  },
  catDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  catDetailIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  catDetailInfo: { flex: 1, gap: 6 },
  catDetailName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
  catProgressBg: {
    height: 4,
    backgroundColor: Colors.backgroundElevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  catProgress: { height: '100%', borderRadius: 2 },
  catDetailRight: { alignItems: 'flex-end', gap: 2 },
  catDetailAmount: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  catDetailPct: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.semiBold,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    gap: 8,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
    ...Shadow.sm,
  },
  toggleText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.semiBold,
  },
  toggleTextActive: {
    color: Colors.text,
  },
});
