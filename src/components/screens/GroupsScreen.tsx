// ─────────────────────────────────────────────
//  Groups Screen — List + Detail
// ─────────────────────────────────────────────

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { useExpenseStore } from '../../store/expenseStore';
import { CURRENT_USER } from '../../utils/mockData';
import { formatCurrency, formatDate, formatRelativeTime, generateId, randomColor, randomEmoji } from '../../utils/formatters';
import { CATEGORY_MAP } from '../../constants/categories';
import { Card, Avatar, AvatarStack, Button, Badge, Chip, Divider } from '../ui';
import { Group } from '../../types';

// ── Group List ──────────────────────────────

export const GroupListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { groups } = useExpenseStore();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0F0E17', '#1A1542']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Groups</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>
          {groups.length} active {groups.length === 1 ? 'group' : 'groups'}
        </Text>
      </LinearGradient>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: group }) => (
          <GroupCard
            group={group}
            onPress={() =>
              navigation.navigate('GroupDetail', { groupId: group.id })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptySub}>
              Create a group to start splitting expenses
            </Text>
            <Button
              label="Create Group"
              onPress={() => setShowAddModal(true)}
              style={{ marginTop: Spacing.base }}
            />
          </View>
        }
      />

      <AddGroupModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </View>
  );
};

// ── Group Card Component ─────────────────────

const GroupCard: React.FC<{ group: Group; onPress: () => void }> = ({
  group,
  onPress,
}) => {
  const myBalance = group.balances[CURRENT_USER.uid] ?? 0;
  const totalExpenses = useExpenseStore((s) =>
    s.expenses.filter((e) => e.groupId === group.id).length
  );

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.groupCardWrapper}>
      <Card style={styles.groupCard} elevated>
        {/* Color accent bar */}
        <View style={[styles.accentBar, { backgroundColor: group.coverColor }]} />

        <View style={styles.groupCardContent}>
          {/* Left: emoji + info */}
          <View style={styles.groupCardLeft}>
            <View style={[styles.groupEmojiBg, { backgroundColor: `${group.coverColor}22` }]}>
              <Text style={styles.groupEmoji}>{group.emoji}</Text>
            </View>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{group.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AvatarStack members={group.members} maxVisible={3} size={24} />
                <Text style={styles.groupMemberCount}>
                  {group.members.length} members · {totalExpenses} expenses
                </Text>
              </View>
            </View>
          </View>

          {/* Right: balance */}
          <View style={styles.groupCardRight}>
            <Text
              style={[
                styles.balanceAmount,
                { color: myBalance >= 0 ? Colors.positive : Colors.negative },
              ]}
            >
              {formatCurrency(Math.abs(myBalance), group.currency)}
            </Text>
            <Text
              style={[
                styles.balanceLabel,
                { color: myBalance >= 0 ? Colors.positive : Colors.negative },
              ]}
            >
              {myBalance > 0 ? 'owed to you' : myBalance < 0 ? 'you owe' : 'settled up'}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

// ── Group Detail Screen ──────────────────────

export const GroupDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { groupId } = route.params;

  const { getGroup, getExpensesByGroup, getSettlementSuggestions } = useExpenseStore();
  const group = getGroup(groupId);
  const expenses = getExpensesByGroup(groupId);
  const settlements = getSettlementSuggestions(groupId);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'members'>('expenses');

  if (!group) {
    return (
      <View style={styles.container}>
        <Text style={{ color: Colors.text }}>Group not found</Text>
      </View>
    );
  }

  const myBalance = group.balances[CURRENT_USER.uid] ?? 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[`${group.coverColor}44`, '#0F0E17']}
        style={[styles.detailHeader, { paddingTop: insets.top }]}
      >
        <View style={styles.detailHeaderTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.detailHero}>
          <Text style={styles.detailEmoji}>{group.emoji}</Text>
          <Text style={styles.detailName}>{group.name}</Text>
          {group.description && (
            <Text style={styles.detailDesc}>{group.description}</Text>
          )}

          {/* My balance pill */}
          <View style={[
            styles.myBalancePill,
            { backgroundColor: myBalance >= 0 ? `${Colors.positive}22` : `${Colors.negative}22` }
          ]}>
            <Ionicons
              name={myBalance >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={myBalance >= 0 ? Colors.positive : Colors.negative}
            />
            <Text style={[
              styles.myBalanceText,
              { color: myBalance >= 0 ? Colors.positive : Colors.negative }
            ]}>
              {myBalance >= 0
                ? `You're owed ${formatCurrency(myBalance, group.currency)}`
                : `You owe ${formatCurrency(-myBalance, group.currency)}`}
            </Text>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>
              {formatCurrency(group.totalSpent, group.currency)}
            </Text>
            <Text style={styles.quickStatLabel}>Total spent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{expenses.length}</Text>
            <Text style={styles.quickStatLabel}>Expenses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{group.members.length}</Text>
            <Text style={styles.quickStatLabel}>Members</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          label="Add Expense"
          icon="add-circle-outline"
          onPress={() => navigation.navigate('AddExpense', { groupId })}
          size="md"
          style={{ flex: 1 }}
        />
        <Button
          label="Settle Up"
          icon="checkmark-circle-outline"
          variant="secondary"
          onPress={() => navigation.navigate('SettleUp', { groupId })}
          size="md"
          style={{ flex: 1 }}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['expenses', 'balances', 'members'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.tabContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <>
            {expenses.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>💸</Text>
                <Text style={styles.emptyTitle}>No expenses yet</Text>
                <Text style={styles.emptySub}>Add your first expense!</Text>
              </View>
            ) : (
              expenses.map((expense) => {
                const category = CATEGORY_MAP[expense.category] || CATEGORY_MAP['other'];
                const myShare = expense.splits.find((s) => s.uid === CURRENT_USER.uid)?.amount ?? 0;
                const iPaid = expense.paidBy === CURRENT_USER.uid;

                return (
                  <TouchableOpacity
                    key={expense.id}
                    onPress={() => navigation.navigate('ExpenseDetail', {
                      expenseId: expense.id, groupId
                    })}
                    activeOpacity={0.85}
                  >
                    <Card style={styles.expenseItem}>
                      <View style={styles.expenseRow}>
                        <LinearGradient
                          colors={category.gradientColors}
                          style={styles.expenseCategoryIcon}
                        >
                          <Ionicons name={category.icon as any} size={18} color="#fff" />
                        </LinearGradient>
                        <View style={styles.expenseDetails}>
                          <Text style={styles.expenseTitle} numberOfLines={1}>
                            {expense.title}
                          </Text>
                          <Text style={styles.expenseMeta}>
                            {formatDate(expense.date)} · {iPaid ? 'You paid' : expense.paidByName}
                          </Text>
                        </View>
                        <View style={styles.expenseAmounts}>
                          <Text style={styles.expenseTotal}>
                            {formatCurrency(expense.amount, expense.currency)}
                          </Text>
                          {!iPaid && myShare > 0 ? (
                            <Text style={[styles.expenseShare, { color: Colors.negative }]}>
                              -{formatCurrency(myShare, expense.currency)}
                            </Text>
                          ) : iPaid ? (
                            <Text style={[styles.expenseShare, { color: Colors.positive }]}>
                              +{formatCurrency(expense.amount - myShare, expense.currency)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {/* Balances Tab */}
        {activeTab === 'balances' && (
          <>
            <Text style={styles.balanceSectionTitle}>Current Balances</Text>
            {group.members.map((member) => {
              const balance = group.balances[member.uid] ?? 0;
              return (
                <Card key={member.uid} style={styles.memberBalanceCard}>
                  <View style={styles.memberBalanceRow}>
                    <Avatar name={member.displayName} size={40} />
                    <View style={styles.memberBalanceInfo}>
                      <Text style={styles.memberName}>{member.displayName}</Text>
                      <Text style={styles.memberEmail}>{member.email}</Text>
                    </View>
                    <Text style={[
                      styles.memberBalance,
                      { color: balance > 0 ? Colors.positive : balance < 0 ? Colors.negative : Colors.textMuted }
                    ]}>
                      {balance === 0
                        ? 'Settled'
                        : formatCurrency(balance, group.currency, true)}
                    </Text>
                  </View>
                </Card>
              );
            })}

            {settlements.length > 0 && (
              <>
                <Text style={[styles.balanceSectionTitle, { marginTop: Spacing.xl }]}>
                  Suggested Settlements
                </Text>
                {settlements.map((s, i) => (
                  <Card key={i} style={styles.settlementCard}>
                    <View style={styles.settlementRow}>
                      <Avatar name={s.fromName} size={36} color={Colors.negative} />
                      <View style={styles.settlementArrow}>
                        <Text style={styles.settlementAmount}>
                          {formatCurrency(s.amount, group.currency)}
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color={Colors.textSecondary} />
                      </View>
                      <Avatar name={s.toName} size={36} color={Colors.positive} />
                    </View>
                    <Text style={styles.settlementText}>
                      {s.fromName} pays {s.toName}
                    </Text>
                  </Card>
                ))}
              </>
            )}
          </>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <>
            {group.members.map((member) => (
              <Card key={member.uid} style={styles.memberCard}>
                <View style={styles.memberRow}>
                  <Avatar name={member.displayName} size={48} />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.displayName}</Text>
                    <Text style={styles.memberEmail}>{member.email}</Text>
                  </View>
                  {member.uid === group.createdBy && (
                    <Badge label="Admin" color={Colors.primary} />
                  )}
                  {member.uid === CURRENT_USER.uid && (
                    <Badge label="You" color={Colors.accent} />
                  )}
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

// ── Add Group Modal ──────────────────────────

const AddGroupModal: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('🎉');
  const { addGroup } = useExpenseStore();

  const EMOJI_OPTIONS = ['🏠', '✈️', '🍕', '🎉', '🏖️', '🎮', '🛒', '💼', '🎓', '🏋️', '🎵', '🌍'];

  const handleCreate = () => {
    if (!name.trim()) return;
    addGroup({
      name: name.trim(),
      emoji,
      coverColor: randomColor(),
      members: [{
        uid: CURRENT_USER.uid,
        displayName: CURRENT_USER.displayName,
        email: CURRENT_USER.email,
      }],
      createdBy: CURRENT_USER.uid,
      currency: 'INR',
      description: description.trim(),
    });
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalSheet}
        >
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Create Group</Text>

          {/* Emoji picker */}
          <Text style={styles.inputLabel}>Choose an emoji</Text>
          <View style={styles.emojiRow}>
            {EMOJI_OPTIONS.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => setEmoji(e)}
                style={[
                  styles.emojiOption,
                  emoji === e && styles.emojiOptionSelected,
                ]}
              >
                <Text style={styles.emojiOptionText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Group Name *</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Goa Trip 2025"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.inputLabel}>Description (optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="What's this group for?"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />

          <View style={styles.modalButtons}>
            <Button
              label="Cancel"
              variant="ghost"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              label="Create"
              onPress={handleCreate}
              disabled={!name.trim()}
              style={{ flex: 1 }}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ── Styles ───────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: Typography.fontSize['3xl'],
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  headerSub: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  listContent: {
    paddingTop: Spacing.base,
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  groupCardWrapper: {},
  groupCard: {
    overflow: 'hidden',
    padding: 0,
  },
  accentBar: {
    height: 3,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  groupCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  groupCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  groupEmojiBg: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  groupEmoji: {
    fontSize: 26,
  },
  groupInfo: {
    flex: 1,
    gap: 6,
  },
  groupName: {
    fontSize: Typography.fontSize.md,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
  groupMemberCount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
  },
  groupCardRight: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
  },
  balanceLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    marginTop: 2,
  },

  // Detail screen
  detailHeader: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  detailHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    marginBottom: Spacing.base,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHero: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  detailEmoji: {
    fontSize: 52,
    marginBottom: 8,
  },
  detailName: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: 4,
  },
  detailDesc: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    marginBottom: 12,
  },
  myBalancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
  },
  myBalanceText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.semiBold,
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    alignItems: 'center',
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  quickStatLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.surfaceBorder,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.medium,
  },
  activeTabText: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  tabContent: {
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  expenseItem: {
    marginBottom: 0,
    padding: Spacing.md,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  expenseCategoryIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  expenseDetails: {
    flex: 1,
    gap: 3,
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
  expenseAmounts: {
    alignItems: 'flex-end',
    gap: 3,
  },
  expenseTotal: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  expenseShare: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.semiBold,
  },
  balanceSectionTitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  memberBalanceCard: {
    marginBottom: Spacing.sm,
  },
  memberBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  memberBalanceInfo: {
    flex: 1,
  },
  memberBalance: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.bold,
  },
  settlementCard: {
    marginBottom: Spacing.sm,
    alignItems: 'center',
    padding: Spacing.base,
  },
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  settlementArrow: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  settlementAmount: {
    fontSize: Typography.fontSize.md,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
  },
  settlementText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  memberCard: {
    marginBottom: Spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontFamily: Typography.fontFamily.semiBold,
  },
  memberEmail: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontFamily: Typography.fontFamily.regular,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
    paddingHorizontal: Spacing['2xl'],
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.sm,
  },
  emptySub: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.backgroundCard,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceBorder,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.text,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.xl,
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
    marginBottom: Spacing.base,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundInput,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  emojiOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryAlpha,
  },
  emojiOptionText: {
    fontSize: 22,
  },
});
