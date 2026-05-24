// ─────────────────────────────────────────────
//  Transactions Screen — Browse, search & filter expenses
// ─────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { useExpenseStore } from '../../store/expenseStore';
import { useAuthStore } from '../../store/authStore';
import { CATEGORIES, CATEGORY_MAP, CategoryId } from '../../constants/categories';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CURRENT_USER } from '../../utils/mockData';
import { Card, Badge } from '../ui';

const { width: SCREEN_W } = Dimensions.get('window');

export const TransactionsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const activeUser = user || CURRENT_USER;

  const { expenses, groups } = useExpenseStore();

  // State filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all'); // 'all', 'personal', or specific groupId

  // Filter groups list
  const filterGroups = useMemo(() => {
    return [
      { id: 'all', name: 'All Expenses', emoji: '💳' },
      { id: 'personal', name: 'Personal Only', emoji: '👤' },
      ...groups.filter(g => g.name !== 'Personal Expenses').map(g => ({
        id: g.id,
        name: g.name,
        emoji: g.emoji,
      }))
    ];
  }, [groups]);

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    let list = [...expenses];

    // 1. Group filtering
    if (selectedGroupId === 'personal') {
      const personalGroup = groups.find(g => g.name === 'Personal Expenses' && g.createdBy === activeUser.uid);
      if (personalGroup) {
        list = list.filter(e => e.groupId === personalGroup.id);
      } else {
        list = [];
      }
    } else if (selectedGroupId !== 'all') {
      list = list.filter(e => e.groupId === selectedGroupId);
    }

    // 2. Category filtering
    if (selectedCategory) {
      list = list.filter(e => e.category === selectedCategory);
    }

    // 3. Search query filtering
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(
        e =>
          e.title.toLowerCase().includes(query) ||
          e.paidByName.toLowerCase().includes(query) ||
          (e.tags && e.tags.some(t => t.toLowerCase().includes(query)))
      );
    }

    // Sort by date newest first
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, groups, selectedGroupId, selectedCategory, searchQuery, activeUser.uid]);

  // Calculate filtered spending aggregate
  const totalSpending = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Screen Header */}
      <LinearGradient
        colors={['#0F0E17', '#1D1936', '#0F0E17']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerSubtitle}>Keep track of everything</Text>
            <Text style={styles.headerTitle}>Transactions</Text>
          </View>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeCount}>{filteredExpenses.length} bills</Text>
          </View>
        </View>

        {/* Dynamic Search Bar */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            placeholder="Search bills, merchants, creators..."
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Main Filter & Scroll Panel */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Horizontal Group Selector */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalPillScroll}
          >
            {filterGroups.map(fg => {
              const isSelected = selectedGroupId === fg.id;
              return (
                <TouchableOpacity
                  key={fg.id}
                  style={[
                    styles.groupPill,
                    isSelected && styles.groupPillActive
                  ]}
                  onPress={() => setSelectedGroupId(fg.id)}
                >
                  <Text style={styles.pillEmoji}>{fg.emoji}</Text>
                  <Text
                    style={[
                      styles.groupPillText,
                      isSelected && styles.groupPillTextActive
                    ]}
                  >
                    {fg.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Horizontal Category Selector */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalCategoryScroll}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === null && styles.categoryChipActiveAll
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === null && styles.categoryChipTextActive
                ]}
              >
                🎒 All Categories
              </Text>
            </TouchableOpacity>

            {CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    isSelected && {
                      backgroundColor: `${cat.color}22`,
                      borderColor: cat.color,
                    }
                  ]}
                  onPress={() => setSelectedCategory(isSelected ? null : cat.id)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={14}
                    color={isSelected ? cat.color : Colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && { color: cat.color, fontFamily: Typography.fontFamily.semiBold }
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryContainer}>
          <LinearGradient
            colors={Colors.gradientCard}
            style={styles.summaryCard}
          >
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>TOTAL SPENDING</Text>
                <Text style={styles.summaryAmount}>
                  {formatCurrency(totalSpending, 'INR', true)}
                </Text>
              </View>
              <View style={styles.summaryIconCircle}>
                <Ionicons name="wallet-outline" size={24} color={Colors.accent} />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Transactions List */}
        <View style={styles.listSection}>
          {filteredExpenses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>No bills found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search query, selecting another category, or logging a new expense.
              </Text>
            </View>
          ) : (
            filteredExpenses.map(expense => {
              const cat = CATEGORY_MAP[expense.category] || CATEGORY_MAP['other'];
              const group = groups.find(g => g.id === expense.groupId);
              const isPersonal = group?.name === 'Personal Expenses';
              
              const myShare = expense.splits.find(s => s.uid === activeUser.uid)?.amount ?? 0;
              const iPaid = expense.paidBy === activeUser.uid;

              return (
                <Card
                  key={expense.id}
                  style={styles.expenseCard}
                  onPress={() => {
                    navigation.navigate('Groups', {
                      screen: 'ExpenseDetail',
                      params: { expenseId: expense.id, groupId: expense.groupId },
                    });
                  }}
                >
                  <View style={styles.cardRow}>
                    {/* Category Icon */}
                    <LinearGradient
                      colors={cat.gradientColors}
                      style={styles.catIconWrapper}
                    >
                      <Ionicons name={cat.icon as any} size={18} color="#fff" />
                    </LinearGradient>

                    {/* Details Column */}
                    <View style={styles.cardDetails}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {expense.title}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {isPersonal ? '👤 Personal' : `👥 ${group?.name}`} · {formatDate(expense.date)}
                      </Text>
                      <Text style={styles.cardPaidBy}>
                        {iPaid ? '💰 You paid' : `👤 ${expense.paidByName} paid`}
                      </Text>
                    </View>

                    {/* Amount & Debt Status */}
                    <View style={styles.cardAmountSide}>
                      <Text style={styles.cardAmount}>
                        {formatCurrency(expense.amount, expense.currency)}
                      </Text>
                      {isPersonal ? (
                        <Badge label="Personal" color={Colors.accent} size="sm" />
                      ) : iPaid ? (
                        <Badge label="You're owed" color={Colors.positive} size="sm" />
                      ) : myShare > 0 ? (
                        <Text style={[styles.cardShareText, { color: Colors.negative }]}>
                          owes {formatCurrency(myShare, expense.currency)}
                        </Text>
                      ) : (
                        <Badge label="Settled" color={Colors.textMuted} size="sm" />
                      )}
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    gap: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: Typography.fontSize['3xl'],
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
    marginTop: 2,
  },
  totalBadge: {
    backgroundColor: Colors.primaryAlpha,
    borderRadius: BorderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  totalBadgeCount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primaryLight,
    fontFamily: Typography.fontFamily.bold,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundInput,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadow.sm,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    height: '100%',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  scrollContent: {
    paddingTop: Spacing.md,
  },
  filterSection: {
    marginBottom: Spacing.md,
  },
  horizontalPillScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  groupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  groupPillActive: {
    backgroundColor: Colors.primaryAlpha,
    borderColor: Colors.primary,
  },
  pillEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  groupPillText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
  },
  groupPillTextActive: {
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  horizontalCategoryScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  categoryChipActiveAll: {
    backgroundColor: Colors.accentAlpha,
    borderColor: Colors.accent,
  },
  categoryChipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
  },
  categoryChipTextActive: {
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  summaryContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadow.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
    letterSpacing: 1.2,
  },
  summaryAmount: {
    fontSize: Typography.fontSize['3xl'],
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
    marginTop: 4,
  },
  summaryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accentAlpha,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listSection: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  expenseCard: {
    padding: Spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  catIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardDetails: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
  cardMeta: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
  },
  cardPaidBy: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
  },
  cardAmountSide: {
    alignItems: 'flex-end',
    gap: 4,
  },
  cardAmount: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  cardShareText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
});
