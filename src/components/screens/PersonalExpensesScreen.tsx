// ─────────────────────────────────────────────
//  Personal Expenses Screen — Private cash flow & spent stats
// ─────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { useExpenseStore } from '../../store/expenseStore';
import { useAuthStore } from '../../store/authStore';
import { CATEGORY_MAP, CategoryId } from '../../constants/categories';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CURRENT_USER } from '../../utils/mockData';
import { Card, Button, Badge } from '../ui';

export const PersonalExpensesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const activeUser = user || CURRENT_USER;

  const [isAdding, setIsAdding] = useState(false);

  const { expenses, groups, deleteExpense, getOrCreatePersonalGroup } = useExpenseStore();

  // Find the user's personal expenses group
  const personalGroup = useMemo(() => {
    return groups.find(
      (g) => g.createdBy === activeUser.uid && g.members.length === 1 && g.name === 'Personal Expenses'
    );
  }, [groups, activeUser.uid]);

  // Filter expenses list to only personal group
  const personalExpenses = useMemo(() => {
    if (!personalGroup) return [];
    return expenses
      .filter((e) => e.groupId === personalGroup.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, personalGroup]);

  // Aggregate stats
  const totalSpent = useMemo(() => {
    return personalExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [personalExpenses]);

  // Group by category to show spending distribution
  const spendingByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    personalExpenses.forEach((e) => {
      counts[e.category] = (counts[e.category] || 0) + e.amount;
    });
    return Object.entries(counts)
      .map(([catId, amount]) => ({
        id: catId,
        amount,
        category: CATEGORY_MAP[catId as CategoryId] || CATEGORY_MAP['other'],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [personalExpenses]);

  // Direct trigger to add a personal expense prefilled
  const handleAddPersonalExpense = async () => {
    try {
      setIsAdding(true);
      const group = await getOrCreatePersonalGroup();
      setIsAdding(false);
      navigation.navigate('AddExpense', { groupId: group.id });
    } catch (e) {
      setIsAdding(false);
      Alert.alert('Error', 'Failed to retrieve or configure your private personal group.');
    }
  };

  const handleDeletePersonalExpense = (id: string, title: string) => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(id);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete the personal expense.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Custom Navigation Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Expenses</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Spent Stats Banner */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={Colors.gradientSecondary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statsCard}
          >
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            
            <Text style={styles.statsLabel}>PRIVATE BALANCE SPENT</Text>
            <Text style={styles.statsAmount}>
              {formatCurrency(totalSpent, 'INR', true)}
            </Text>
            <Text style={styles.statsSubtext}>
              Across {personalExpenses.length} logged personal purchases
            </Text>
          </LinearGradient>
        </View>

        {/* Add Personal Expense Button */}
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddPersonalExpense}
            disabled={isAdding}
          >
            <LinearGradient
              colors={Colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButtonGradient}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.addButtonText}>Add Personal Expense</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Spending Distribution by Category */}
        {spendingByCategory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spending Categories</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {spendingByCategory.map((item) => (
                <Card key={item.id} style={styles.catCard}>
                  <LinearGradient
                    colors={item.category.gradientColors}
                    style={styles.catIconCircle}
                  >
                    <Ionicons name={item.category.icon as any} size={14} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.catCardLabel}>{item.category.label}</Text>
                  <Text style={styles.catCardValue}>
                    {formatCurrency(item.amount, 'INR')}
                  </Text>
                </Card>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Transaction History List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {personalExpenses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>👤</Text>
              <Text style={styles.emptyTitle}>Your cash tracker is empty</Text>
              <Text style={styles.emptySubtitle}>
                Log your personal expenses securely here. Nobody else will see these transactions.
              </Text>
            </View>
          ) : (
            personalExpenses.map((expense) => {
              const cat = CATEGORY_MAP[expense.category] || CATEGORY_MAP['other'];
              return (
                <Card
                  key={expense.id}
                  style={styles.expenseCard}
                  onPress={() => {
                    navigation.navigate('ExpenseDetail', { expenseId: expense.id, groupId: expense.groupId });
                  }}
                >
                  <View style={styles.expenseRow}>
                    <LinearGradient
                      colors={cat.gradientColors}
                      style={styles.expenseIconCircle}
                    >
                      <Ionicons name={cat.icon as any} size={18} color="#fff" />
                    </LinearGradient>

                    <View style={styles.expenseDetails}>
                      <Text style={styles.expenseTitle} numberOfLines={1}>
                        {expense.title}
                      </Text>
                      <Text style={styles.expenseMeta}>
                        {cat.label} · {formatDate(expense.date)}
                      </Text>
                    </View>

                    <View style={styles.expenseRight}>
                      <Text style={styles.expenseAmount}>
                        {formatCurrency(expense.amount, expense.currency)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDeletePersonalExpense(expense.id, expense.title)}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.error} />
                      </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  scrollContent: {
    paddingTop: Spacing.md,
  },
  statsContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  statsCard: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    overflow: 'hidden',
    ...Shadow.md,
  },
  decorCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  statsLabel: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Typography.fontFamily.medium,
    letterSpacing: 1.2,
  },
  statsAmount: {
    fontSize: Typography.fontSize['4xl'],
    fontFamily: Typography.fontFamily.extraBold,
    color: '#FFFFFE',
    marginTop: 4,
    marginBottom: 4,
  },
  statsSubtext: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: Typography.fontFamily.regular,
  },
  actionButtonContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  addButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadow.md,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  addButtonText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  categoryScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  catCard: {
    width: 120,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  catIconCircle: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCardLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
    textAlign: 'center',
  },
  catCardValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
    textAlign: 'center',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.md,
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
  expenseCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  expenseIconCircle: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  expenseDetails: {
    flex: 1,
    gap: 2,
  },
  expenseTitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
  expenseMeta: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
  },
  expenseRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  expenseAmount: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  deleteBtn: {
    padding: 4,
  },
});
