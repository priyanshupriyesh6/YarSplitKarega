// ─────────────────────────────────────────────
//  Add Expense Screen — Full split modal
// ─────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { useExpenseStore } from '../../store/expenseStore';
import { CURRENT_USER } from '../../utils/mockData';
import { formatCurrency, toISODate } from '../../utils/formatters';
import { CATEGORIES, CategoryId, CATEGORY_MAP } from '../../constants/categories';
import { calculateSplits } from '../../utils/splitCalculator';
import { Card, Button, Avatar, Chip, Divider } from '../ui';
import { SplitType, ExpenseSplit } from '../../types';

export const AddExpenseScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { groupId, prefill } = route.params ?? {};

  const { getGroup, addExpense } = useExpenseStore();
  const group = getGroup(groupId);

  // Form state
  const [title, setTitle] = useState(prefill?.title ?? '');
  const [amount, setAmount] = useState(prefill?.amount?.toString() ?? '');
  const [category, setCategory] = useState<CategoryId>(prefill?.category ?? 'other');
  const [paidBy, setPaidBy] = useState(CURRENT_USER.uid);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(toISODate());

  // Exact/percentage/shares overrides
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});

  const [activeSection, setActiveSection] = useState<'details' | 'split' | 'review'>('details');
  const [isLoading, setIsLoading] = useState(false);

  if (!group) {
    return <View style={styles.container}><Text style={{ color: Colors.text }}>Group not found</Text></View>;
  }

  const parsedAmount = parseFloat(amount) || 0;

  const computedSplits = useCallback((): ExpenseSplit[] => {
    try {
      return calculateSplits({
        total: parsedAmount,
        members: group.members,
        paidByUid: paidBy,
        splitType,
        exactAmounts: Object.fromEntries(
          Object.entries(exactAmounts).map(([k, v]) => [k, parseFloat(v) || 0])
        ),
        percentages: Object.fromEntries(
          Object.entries(percentages).map(([k, v]) => [k, parseFloat(v) || 0])
        ),
        shares: Object.fromEntries(
          Object.entries(shares).map(([k, v]) => [k, parseInt(v) || 1])
        ),
      });
    } catch {
      return [];
    }
  }, [parsedAmount, group.members, paidBy, splitType, exactAmounts, percentages, shares]);

  const handleSubmit = () => {
    if (!title.trim()) return Alert.alert('Missing title', 'Please enter an expense name');
    if (!parsedAmount || parsedAmount <= 0) return Alert.alert('Invalid amount', 'Please enter a valid amount');

    const splits = computedSplits();
    if (splits.length === 0) return Alert.alert('Split error', 'Could not compute splits');

    setIsLoading(true);
    setTimeout(() => {
      addExpense({
        groupId,
        title: title.trim(),
        amount: parsedAmount,
        currency: group.currency,
        category,
        paidBy,
        paidByName: group.members.find((m) => m.uid === paidBy)?.displayName ?? '',
        splitType,
        splits,
        date,
        notes: notes.trim(),
        tags: [],
      });
      setIsLoading(false);
      navigation.goBack();
    }, 500);
  };

  const selectedCategory = CATEGORY_MAP[category];
  const paidByMember = group.members.find((m) => m.uid === paidBy);
  const splits = computedSplits();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={isLoading}>
          <Text style={[styles.saveButton, { opacity: isLoading ? 0.5 : 1 }]}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Section Pills */}
      <View style={styles.sectionPills}>
        {(['details', 'split', 'review'] as const).map((s, i) => (
          <TouchableOpacity
            key={s}
            onPress={() => setActiveSection(s)}
            style={[
              styles.sectionPill,
              activeSection === s && styles.sectionPillActive,
            ]}
          >
            <Text style={[
              styles.sectionPillText,
              activeSection === s && styles.sectionPillTextActive,
            ]}>
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── DETAILS SECTION ── */}
          {activeSection === 'details' && (
            <>
              {/* Amount */}
              <Card style={styles.amountCard} elevated>
                <Text style={styles.amountLabel}>Amount</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={Colors.textMuted}
                    autoFocus
                  />
                </View>
              </Card>

              {/* Title */}
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="What was this expense for?"
                placeholderTextColor={Colors.textMuted}
              />

              {/* Category */}
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={{ gap: Spacing.sm }}
              >
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategory(cat.id)}
                    style={[
                      styles.categoryChip,
                      category === cat.id && {
                        backgroundColor: `${cat.color}22`,
                        borderColor: cat.color,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={cat.gradientColors}
                      style={styles.categoryChipIcon}
                    >
                      <Ionicons name={cat.icon as any} size={14} color="#fff" />
                    </LinearGradient>
                    <Text style={[
                      styles.categoryChipText,
                      category === cat.id && { color: cat.color },
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Paid By */}
              <Text style={styles.inputLabel}>Paid by</Text>
              <View style={styles.paidByRow}>
                {group.members.map((m) => (
                  <TouchableOpacity
                    key={m.uid}
                    onPress={() => setPaidBy(m.uid)}
                    style={[
                      styles.paidByChip,
                      paidBy === m.uid && styles.paidByChipSelected,
                    ]}
                  >
                    <Avatar name={m.displayName} size={28} color={paidBy === m.uid ? Colors.primary : Colors.textMuted} />
                    <Text style={[
                      styles.paidByName,
                      paidBy === m.uid && { color: Colors.primary },
                    ]}>
                      {m.uid === CURRENT_USER.uid ? 'You' : m.displayName.split(' ')[0]}
                    </Text>
                    {paidBy === m.uid && (
                      <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes */}
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add a note..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
              />

              <Button
                label="Next: Configure Split →"
                onPress={() => setActiveSection('split')}
                fullWidth
                style={{ marginTop: Spacing.base }}
              />
            </>
          )}

          {/* ── SPLIT SECTION ── */}
          {activeSection === 'split' && (
            <>
              <Text style={styles.splitTotal}>
                Splitting {formatCurrency(parsedAmount, group.currency)} among {group.members.length} people
              </Text>

              {/* Split type selector */}
              <View style={styles.splitTypeRow}>
                {(['equal', 'exact', 'percentage', 'shares'] as SplitType[]).map((st) => (
                  <TouchableOpacity
                    key={st}
                    onPress={() => setSplitType(st)}
                    style={[
                      styles.splitTypeButton,
                      splitType === st && styles.splitTypeButtonActive,
                    ]}
                  >
                    <Text style={[
                      styles.splitTypeText,
                      splitType === st && styles.splitTypeTextActive,
                    ]}>
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Members split config */}
              {group.members.map((member) => {
                const split = splits.find((s) => s.uid === member.uid);
                return (
                  <Card key={member.uid} style={styles.splitMemberCard}>
                    <View style={styles.splitMemberRow}>
                      <Avatar name={member.displayName} size={40} />
                      <View style={styles.splitMemberInfo}>
                        <Text style={styles.splitMemberName}>
                          {member.uid === CURRENT_USER.uid ? 'You' : member.displayName}
                        </Text>
                        {member.uid === paidBy && (
                          <Text style={styles.splitMemberPaid}>Paid</Text>
                        )}
                      </View>

                      {splitType === 'equal' && (
                        <Text style={styles.splitAmount}>
                          {formatCurrency(split?.amount ?? 0, group.currency)}
                        </Text>
                      )}
                      {splitType === 'exact' && (
                        <View style={styles.splitInputWrapper}>
                          <Text style={styles.splitInputCurrency}>₹</Text>
                          <TextInput
                            style={styles.splitInput}
                            value={exactAmounts[member.uid] ?? ''}
                            onChangeText={(v) =>
                              setExactAmounts((prev) => ({ ...prev, [member.uid]: v }))
                            }
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor={Colors.textMuted}
                          />
                        </View>
                      )}
                      {splitType === 'percentage' && (
                        <View style={styles.splitInputWrapper}>
                          <TextInput
                            style={styles.splitInput}
                            value={percentages[member.uid] ?? ''}
                            onChangeText={(v) =>
                              setPercentages((prev) => ({ ...prev, [member.uid]: v }))
                            }
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor={Colors.textMuted}
                          />
                          <Text style={styles.splitInputSuffix}>%</Text>
                        </View>
                      )}
                      {splitType === 'shares' && (
                        <View style={styles.sharesControl}>
                          <TouchableOpacity
                            onPress={() => {
                              const cur = parseInt(shares[member.uid] ?? '1') || 1;
                              if (cur > 0) setShares((prev) => ({ ...prev, [member.uid]: String(cur - 1) }));
                            }}
                            style={styles.sharesBtn}
                          >
                            <Ionicons name="remove" size={16} color={Colors.text} />
                          </TouchableOpacity>
                          <Text style={styles.sharesValue}>{shares[member.uid] ?? '1'}</Text>
                          <TouchableOpacity
                            onPress={() => {
                              const cur = parseInt(shares[member.uid] ?? '1') || 1;
                              setShares((prev) => ({ ...prev, [member.uid]: String(cur + 1) }));
                            }}
                            style={styles.sharesBtn}
                          >
                            <Ionicons name="add" size={16} color={Colors.text} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </Card>
                );
              })}

              <Button
                label="Next: Review →"
                onPress={() => setActiveSection('review')}
                fullWidth
                style={{ marginTop: Spacing.base }}
              />
            </>
          )}

          {/* ── REVIEW SECTION ── */}
          {activeSection === 'review' && (
            <>
              <Card style={styles.reviewCard} elevated>
                <View style={styles.reviewHeader}>
                  <LinearGradient
                    colors={selectedCategory.gradientColors}
                    style={styles.reviewCategoryIcon}
                  >
                    <Ionicons name={selectedCategory.icon as any} size={22} color="#fff" />
                  </LinearGradient>
                  <View>
                    <Text style={styles.reviewTitle}>{title || 'Untitled Expense'}</Text>
                    <Text style={styles.reviewCategory}>{selectedCategory.label}</Text>
                  </View>
                </View>

                <Divider />

                <View style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Total Amount</Text>
                  <Text style={styles.reviewValue}>
                    {formatCurrency(parsedAmount, group.currency)}
                  </Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Paid By</Text>
                  <Text style={styles.reviewValue}>{paidByMember?.displayName ?? '—'}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Split Type</Text>
                  <Text style={styles.reviewValue}>
                    {splitType.charAt(0).toUpperCase() + splitType.slice(1)}
                  </Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>Group</Text>
                  <Text style={styles.reviewValue}>{group.name}</Text>
                </View>

                <Divider />

                <Text style={styles.reviewSplitTitle}>Split Breakdown</Text>
                {splits.map((split) => (
                  <View key={split.uid} style={styles.reviewSplitRow}>
                    <Text style={styles.reviewSplitName}>{split.displayName}</Text>
                    <Text style={[
                      styles.reviewSplitAmount,
                      { color: split.amount > 0 ? Colors.negative : Colors.textSecondary }
                    ]}>
                      {split.amount > 0
                        ? `owes ${formatCurrency(split.amount, group.currency)}`
                        : 'paid'}
                    </Text>
                  </View>
                ))}
              </Card>

              <Button
                label={isLoading ? 'Saving...' : 'Add Expense ✓'}
                onPress={handleSubmit}
                loading={isLoading}
                fullWidth
                style={{ marginTop: Spacing.base }}
              />
              <Button
                label="← Back to Edit"
                variant="ghost"
                onPress={() => setActiveSection('details')}
                fullWidth
                style={{ marginTop: Spacing.sm }}
              />
            </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    fontSize: Typography.fontSize.md,
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  sectionPills: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  sectionPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundInput,
  },
  sectionPillActive: {
    backgroundColor: Colors.primaryAlpha,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  sectionPillText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.medium,
  },
  sectionPillTextActive: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: Spacing.base,
    gap: Spacing.md,
  },
  amountCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  amountLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: Typography.fontSize['3xl'],
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.bold,
    marginRight: 4,
  },
  amountInput: {
    fontSize: Typography.fontSize['5xl'],
    color: Colors.text,
    fontFamily: Typography.fontFamily.extraBold,
    minWidth: 120,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    color: Colors.text,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  categoryScroll: {
    marginBottom: Spacing.md,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.backgroundInput,
    gap: 6,
  },
  categoryChipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
  },
  paidByRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  paidByChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.backgroundInput,
  },
  paidByChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryAlpha,
  },
  paidByName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
  },
  splitTotal: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  splitTypeRow: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundInput,
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.base,
  },
  splitTypeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  splitTypeButtonActive: {
    backgroundColor: Colors.primary,
    ...Shadow.sm,
  },
  splitTypeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.medium,
  },
  splitTypeTextActive: {
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
  splitMemberCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  splitMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  splitMemberInfo: {
    flex: 1,
  },
  splitMemberName: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
  splitMemberPaid: {
    fontSize: Typography.fontSize.xs,
    color: Colors.positive,
    fontFamily: Typography.fontFamily.medium,
  },
  splitAmount: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  splitInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundInput,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.sm,
    width: 100,
  },
  splitInput: {
    flex: 1,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    paddingVertical: 8,
    textAlign: 'center',
  },
  splitInputCurrency: {
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
  },
  splitInputSuffix: {
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
  },
  sharesControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundInput,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  sharesBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharesValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
    minWidth: 28,
    textAlign: 'center',
  },
  reviewCard: {
    gap: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  reviewCategoryIcon: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewTitle: {
    fontSize: Typography.fontSize.xl,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  reviewCategory: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewKey: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  reviewValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
  reviewSplitTitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  reviewSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  reviewSplitName: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.regular,
  },
  reviewSplitAmount: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.semiBold,
  },
});
