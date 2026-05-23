// ─────────────────────────────────────────────
//  Expense Store — Real Supabase Cloud Sync
// ─────────────────────────────────────────────

import { create } from 'zustand';
import { supabase } from '../utils/supabase';
import { Expense, Group, GroupMember, Settlement, SettlementSuggestion } from '../types';
import { useAuthStore } from './authStore';
import { computeSettlements, applyExpenseToBalances, reverseExpenseFromBalances } from '../utils/settlementAlgorithm';
import { generateId } from '../utils/formatters';

interface ExpenseStore {
  groups: Group[];
  expenses: Expense[];
  settlements: Settlement[];
  isLoading: boolean;

  // Sync actions
  loadAllData: () => Promise<void>;

  // Group actions
  addGroup: (group: Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'totalSpent' | 'balances'>) => Promise<Group>;
  updateGroup: (id: string, updates: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  getGroup: (id: string) => Group | undefined;
  getOrCreatePersonalGroup: () => Promise<Group>;

  // Expense actions
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'createdBy'>) => Promise<Expense>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  getExpensesByGroup: (groupId: string) => Expense[];
  getExpense: (id: string) => Expense | undefined;

  // Settlement actions
  settleUp: (groupId: string, fromUid: string, toUid: string, amount: number) => Promise<void>;
  getSettlementSuggestions: (groupId: string) => SettlementSuggestion[];

  // Stats
  getTotalOwed: () => number;    // total others owe me
  getTotalIOwe: () => number;    // total I owe others
}

export const useExpenseStore = create<ExpenseStore>()((set, get) => ({
  groups: [],
  expenses: [],
  settlements: [],
  isLoading: false,

  // ── Sync Actions ───────────────────────────

  loadAllData: async () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      set({ groups: [], expenses: [], settlements: [], isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      // 1. Fetch group memberships of active user
      const { data: memberGroups, error: mgError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups (
            id,
            name,
            emoji,
            cover_color,
            currency,
            description,
            created_by,
            created_at,
            updated_at,
            total_spent,
            balances
          )
        `)
        .eq('profile_id', currentUser.uid);

      if (mgError) throw mgError;

      if (!memberGroups || memberGroups.length === 0) {
        set({ groups: [], expenses: [], settlements: [], isLoading: false });
        return;
      }

      const groupIds = memberGroups.map((mg: any) => mg.group_id);

      // 2. Fetch all members belonging to these groups
      const { data: members, error: mError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          profiles (
            id,
            display_name,
            email,
            avatar_url
          )
        `)
        .in('group_id', groupIds);

      if (mError) throw mError;

      // Group profiles by group_id
      const membersByGroup: Record<string, GroupMember[]> = {};
      members?.forEach((m: any) => {
        if (!m.profiles) return;
        if (!membersByGroup[m.group_id]) {
          membersByGroup[m.group_id] = [];
        }
        membersByGroup[m.group_id].push({
          uid: m.profiles.id,
          displayName: m.profiles.display_name || m.profiles.email?.split('@')[0] || 'User',
          email: m.profiles.email || '',
          photoURL: m.profiles.avatar_url,
        });
      });

      // Map group memberships to Group structure
      const groupsList: Group[] = memberGroups
        .map((mg: any) => {
          const g = mg.groups;
          if (!g) return null;
          return {
            id: g.id,
            name: g.name,
            emoji: g.emoji,
            coverColor: g.cover_color,
            members: membersByGroup[g.id] || [],
            createdBy: g.created_by,
            createdAt: g.created_at,
            updatedAt: g.updated_at,
            currency: g.currency,
            totalSpent: Number(g.total_spent),
            balances: g.balances || {},
            description: g.description,
          };
        })
        .filter(Boolean) as Group[];

      // 3. Fetch all expenses for these groups
      const { data: dbExpenses, error: eError } = await supabase
        .from('expenses')
        .select('*')
        .in('group_id', groupIds)
        .order('date', { ascending: false });

      if (eError) throw eError;

      // 4. Fetch all splits for these expenses
      const expenseIds = dbExpenses?.map((e) => e.id) || [];
      let splitsList: any[] = [];
      if (expenseIds.length > 0) {
        const { data: dbSplits, error: sError } = await supabase
          .from('expense_splits')
          .select('*')
          .in('expense_id', expenseIds);
        if (sError) throw sError;
        splitsList = dbSplits || [];
      }

      // Group splits by expense_id
      const splitsByExpense: Record<string, any[]> = {};
      splitsList.forEach((s) => {
        if (!splitsByExpense[s.expense_id]) {
          splitsByExpense[s.expense_id] = [];
        }
        splitsByExpense[s.expense_id].push({
          uid: s.profile_id,
          displayName: s.display_name,
          amount: Number(s.amount),
        });
      });

      // Map DB expenses to front-end Expense interface
      const expensesList: Expense[] = (dbExpenses || []).map((e) => ({
        id: e.id,
        groupId: e.group_id,
        title: e.title,
        amount: Number(e.amount),
        currency: e.currency,
        category: e.category as any,
        paidBy: e.paid_by,
        paidByName: e.paid_by_name,
        splitType: e.split_type as any,
        splits: splitsByExpense[e.id] || [],
        date: e.date,
        createdAt: e.created_at,
        createdBy: e.created_by,
        tags: e.tags || [],
      }));

      // 5. Fetch all settlements
      const { data: dbSettlements, error: setlError } = await supabase
        .from('settlements')
        .select('*')
        .in('group_id', groupIds)
        .order('settled_at', { ascending: false });

      if (setlError) throw setlError;

      const settlementsList: Settlement[] = (dbSettlements || []).map((s) => ({
        id: s.id,
        groupId: s.group_id,
        fromUid: s.from_uid,
        fromName: s.from_name,
        toUid: s.to_uid,
        toName: s.to_name,
        amount: Number(s.amount),
        currency: s.currency,
        settledAt: s.settled_at,
      }));

      set({
        groups: groupsList,
        expenses: expensesList,
        settlements: settlementsList,
        isLoading: false,
      });
    } catch (err) {
      console.error('Error loading Supabase data:', err);
      set({ isLoading: false });
    }
  },

  // ── Groups ─────────────────────────────────

  addGroup: async (groupData) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) throw new Error('Not authenticated');

    set({ isLoading: true });
    try {
      const initialBalances = Object.fromEntries(groupData.members.map((m) => [m.uid, 0]));

      // 1. Insert group record
      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupData.name,
          emoji: groupData.emoji,
          cover_color: groupData.coverColor,
          currency: groupData.currency,
          description: groupData.description,
          created_by: currentUser.uid,
          balances: initialBalances,
          total_spent: 0,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // 2. Insert group members junction rows
      const memberRows = groupData.members.map((m) => ({
        group_id: newGroup.id,
        profile_id: m.uid,
      }));

      const { error: membersError } = await supabase
        .from('group_members')
        .insert(memberRows);

      if (membersError) throw membersError;

      // 3. Re-load from DB
      await get().loadAllData();
      
      const createdGroup = get().groups.find((g) => g.id === newGroup.id);
      if (!createdGroup) throw new Error('Failed to create group');
      
      return createdGroup;
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  updateGroup: async (id, updates) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('groups')
        .update({
          name: updates.name,
          emoji: updates.emoji,
          cover_color: updates.coverColor,
          description: updates.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      await get().loadAllData();
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  deleteGroup: async (id) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await get().loadAllData();
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  getGroup: (id) => get().groups.find((g) => g.id === id),

  getOrCreatePersonalGroup: async () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) throw new Error('Not authenticated');

    // 1. Check if we already have a Personal Expenses group loaded in state
    let personalGroup = get().groups.find(
      (g) => g.createdBy === currentUser.uid && g.members.length === 1 && g.name === 'Personal Expenses'
    );

    if (personalGroup) return personalGroup;

    // 2. Double check the database members
    try {
      const { data: memberGroups, error: mgError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups (
            id,
            name,
            emoji,
            cover_color,
            currency,
            description,
            created_by,
            created_at,
            updated_at,
            total_spent,
            balances
          )
        `)
        .eq('profile_id', currentUser.uid);

      if (!mgError && memberGroups) {
        const dbPersonal = memberGroups.find((mg: any) => (mg.groups as any)?.name === 'Personal Expenses' && (mg.groups as any)?.created_by === currentUser.uid);
        if (dbPersonal && dbPersonal.groups) {
          await get().loadAllData();
          const syncedGroup = get().groups.find((g) => g.id === (dbPersonal.groups as any).id);
          if (syncedGroup) return syncedGroup;
        }
      }
    } catch (e) {
      console.warn('[ExpenseStore] error checking personal group in DB:', e);
    }

    // 3. Otherwise, create a new personal group!
    const groupMember = {
      uid: currentUser.uid,
      displayName: currentUser.displayName || 'Me',
      email: currentUser.email || '',
      photoURL: currentUser.photoURL,
    };

    const newGroup = await get().addGroup({
      name: 'Personal Expenses',
      emoji: '👤',
      coverColor: '#00D9B5',
      currency: 'INR',
      description: 'Daily life personal expenses and bills manager',
      members: [groupMember],
      createdBy: currentUser.uid,
    });

    return newGroup;
  },

  // ── Expenses ───────────────────────────────

  addExpense: async (expenseData) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) throw new Error('Not authenticated');

    set({ isLoading: true });
    try {
      // 1. Insert expense record
      const { data: newExp, error: expError } = await supabase
        .from('expenses')
        .insert({
          group_id: expenseData.groupId,
          title: expenseData.title,
          amount: expenseData.amount,
          currency: expenseData.currency,
          category: expenseData.category,
          paid_by: expenseData.paidBy,
          paid_by_name: expenseData.paidByName,
          split_type: expenseData.splitType,
          date: expenseData.date,
          tags: expenseData.tags,
          created_by: currentUser.uid,
        })
        .select()
        .single();

      if (expError) throw expError;

      // 2. Insert splits rows
      const splitRows = expenseData.splits.map((s) => ({
        expense_id: newExp.id,
        profile_id: s.uid,
        display_name: s.displayName,
        amount: s.amount,
      }));

      const { error: splitError } = await supabase
        .from('expense_splits')
        .insert(splitRows);

      if (splitError) throw splitError;

      // 3. Update Group balances and totalSpent
      const group = get().groups.find((g) => g.id === expenseData.groupId);
      if (group) {
        const newBalances = applyExpenseToBalances(
          group.balances,
          expenseData.paidBy,
          expenseData.splits,
          expenseData.amount
        );

        const { error: balError } = await supabase
          .from('groups')
          .update({
            balances: newBalances,
            total_spent: group.totalSpent + expenseData.amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', expenseData.groupId);

        if (balError) throw balError;
      }

      await get().loadAllData();
      const createdExpense = get().expenses.find((e) => e.id === newExp.id);
      if (!createdExpense) throw new Error('Failed to create expense');

      return createdExpense;
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  updateExpense: async (id, updates) => {
    // Basic implementation (reload data after db update)
    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          title: updates.title,
          amount: updates.amount,
          category: updates.category,
          date: updates.date,
          tags: updates.tags,
        })
        .eq('id', id);

      if (error) throw error;
      await get().loadAllData();
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  deleteExpense: async (id) => {
    const expense = get().expenses.find((e) => e.id === id);
    if (!expense) return;

    set({ isLoading: true });
    try {
      // 1. Revert Group balances first
      const group = get().groups.find((g) => g.id === expense.groupId);
      if (group) {
        const newBalances = reverseExpenseFromBalances(
          group.balances,
          expense.paidBy,
          expense.splits,
          expense.amount
        );

        const { error: balError } = await supabase
          .from('groups')
          .update({
            balances: newBalances,
            total_spent: Math.max(0, group.totalSpent - expense.amount),
            updated_at: new Date().toISOString(),
          })
          .eq('id', expense.groupId);

        if (balError) throw balError;
      }

      // 2. Delete expense (Postgres cascade will delete expense_splits automatically)
      const { error: delError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (delError) throw delError;

      await get().loadAllData();
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  getExpensesByGroup: (groupId) =>
    get()
      .expenses.filter((e) => e.groupId === groupId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),

  getExpense: (id) => get().expenses.find((e) => e.id === id),

  // ── Settlements ────────────────────────────

  settleUp: async (groupId, fromUid, toUid, amount) => {
    const group = get().groups.find((g) => g.id === groupId);
    if (!group) throw new Error('Group not found');

    const fromName = group.members.find((m) => m.uid === fromUid)?.displayName || 'Someone';
    const toName = group.members.find((m) => m.uid === toUid)?.displayName || 'Someone';

    set({ isLoading: true });
    try {
      // 1. Insert settlement payment record
      const { error: setlError } = await supabase
        .from('settlements')
        .insert({
          group_id: groupId,
          from_uid: fromUid,
          from_name: fromName,
          to_uid: toUid,
          to_name: toName,
          amount,
          currency: 'INR',
        });

      if (setlError) throw setlError;

      // 2. Update Group balances (Settle up balances directly)
      const newBalances = { ...group.balances };
      newBalances[toUid] = (newBalances[toUid] ?? 0) - amount;
      newBalances[fromUid] = (newBalances[fromUid] ?? 0) + amount;

      const { error: balError } = await supabase
        .from('groups')
        .update({
          balances: newBalances,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId);

      if (balError) throw balError;

      await get().loadAllData();
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  getSettlementSuggestions: (groupId) => {
    const group = get().groups.find((g) => g.id === groupId);
    if (!group) return [];

    const memberNames = Object.fromEntries(
      group.members.map((m) => [m.uid, m.displayName])
    );
    return computeSettlements(group.balances, memberNames);
  },

  // ── Stats ──────────────────────────────────

  getTotalOwed: () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return 0;
    const uid = currentUser.uid;
    return get().groups.reduce((total, group) => {
      const balance = group.balances[uid] ?? 0;
      return total + (balance > 0 ? balance : 0);
    }, 0);
  },

  getTotalIOwe: () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return 0;
    const uid = currentUser.uid;
    return get().groups.reduce((total, group) => {
      const balance = group.balances[uid] ?? 0;
      return total + (balance < 0 ? -balance : 0);
    }, 0);
  },
}));

// Automatically fetch live Supabase data on user login, and clear on logout
useAuthStore.subscribe((state) => {
  const user = state.user;
  if (user) {
    useExpenseStore.getState().loadAllData();
  } else {
    useExpenseStore.setState({ groups: [], expenses: [], settlements: [] });
  }
});
