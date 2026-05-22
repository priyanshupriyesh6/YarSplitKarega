// ─────────────────────────────────────────────
//  Expense Store — Zustand + AsyncStorage
// ─────────────────────────────────────────────

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, Group, Settlement, SettlementSuggestion } from '../types';
import {
  MOCK_EXPENSES,
  MOCK_GROUPS,
  CURRENT_USER,
} from '../utils/mockData';
import { computeSettlements, applyExpenseToBalances, reverseExpenseFromBalances } from '../utils/settlementAlgorithm';
import { generateId } from '../utils/formatters';

interface ExpenseStore {
  groups: Group[];
  expenses: Expense[];
  settlements: Settlement[];
  isLoading: boolean;

  // Group actions
  addGroup: (group: Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'totalSpent' | 'balances'>) => Group;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  getGroup: (id: string) => Group | undefined;

  // Expense actions
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'createdBy'>) => Expense;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  getExpensesByGroup: (groupId: string) => Expense[];
  getExpense: (id: string) => Expense | undefined;

  // Settlement actions
  settleUp: (groupId: string, fromUid: string, toUid: string, amount: number) => void;
  getSettlementSuggestions: (groupId: string) => SettlementSuggestion[];

  // Stats
  getTotalOwed: () => number;    // total others owe me
  getTotalIOwe: () => number;    // total I owe others
}

export const useExpenseStore = create<ExpenseStore>()(
  persist(
    (set, get) => ({
  groups: MOCK_GROUPS,
  expenses: MOCK_EXPENSES,
  settlements: [],
  isLoading: false,

  // ── Groups ───────────────────────────────

  addGroup: (groupData) => {
    const newGroup: Group = {
      ...groupData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalSpent: 0,
      balances: Object.fromEntries(groupData.members.map((m) => [m.uid, 0])),
    };
    set((state) => ({ groups: [...state.groups, newGroup] }));
    return newGroup;
  },

  updateGroup: (id, updates) => {
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g
      ),
    }));
  },

  deleteGroup: (id) => {
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== id),
      expenses: state.expenses.filter((e) => e.groupId !== id),
    }));
  },

  getGroup: (id) => get().groups.find((g) => g.id === id),

  // ── Expenses ─────────────────────────────

  addExpense: (expenseData) => {
    const newExpense: Expense = {
      ...expenseData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      createdBy: CURRENT_USER.uid,
    };

    set((state) => {
      // Update group balances
      const group = state.groups.find((g) => g.id === newExpense.groupId);
      if (!group) return { expenses: [...state.expenses, newExpense] };

      const newBalances = applyExpenseToBalances(
        group.balances,
        newExpense.paidBy,
        newExpense.splits,
        newExpense.amount,
      );

      const updatedGroups = state.groups.map((g) =>
        g.id === newExpense.groupId
          ? {
              ...g,
              balances: newBalances,
              totalSpent: g.totalSpent + newExpense.amount,
              updatedAt: new Date().toISOString(),
            }
          : g
      );

      return {
        expenses: [...state.expenses, newExpense],
        groups: updatedGroups,
      };
    });

    return newExpense;
  },

  updateExpense: (id, updates) => {
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
  },

  deleteExpense: (id) => {
    const expense = get().expenses.find((e) => e.id === id);
    if (!expense) return;

    set((state) => {
      const group = state.groups.find((g) => g.id === expense.groupId);
      let updatedGroups = state.groups;

      if (group) {
        const newBalances = reverseExpenseFromBalances(
          group.balances,
          expense.paidBy,
          expense.splits,
          expense.amount,
        );
        updatedGroups = state.groups.map((g) =>
          g.id === expense.groupId
            ? {
                ...g,
                balances: newBalances,
                totalSpent: Math.max(0, g.totalSpent - expense.amount),
              }
            : g
        );
      }

      return {
        expenses: state.expenses.filter((e) => e.id !== id),
        groups: updatedGroups,
      };
    });
  },

  getExpensesByGroup: (groupId) =>
    get()
      .expenses.filter((e) => e.groupId === groupId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),

  getExpense: (id) => get().expenses.find((e) => e.id === id),

  // ── Settlements ──────────────────────────

  settleUp: (groupId, fromUid, toUid, amount) => {
    const settlement: Settlement = {
      id: generateId(),
      groupId,
      fromUid,
      fromName: '',
      toUid,
      toName: '',
      amount,
      currency: 'INR',
      settledAt: new Date().toISOString(),
    };

    set((state) => {
      // Update balances in group
      const updatedGroups = state.groups.map((g) => {
        if (g.id !== groupId) return g;
        const newBalances = { ...g.balances };
        newBalances[toUid] = (newBalances[toUid] ?? 0) - amount;
        newBalances[fromUid] = (newBalances[fromUid] ?? 0) + amount;
        return { ...g, balances: newBalances };
      });

      return {
        settlements: [...state.settlements, settlement],
        groups: updatedGroups,
      };
    });
  },

  getSettlementSuggestions: (groupId) => {
    const group = get().groups.find((g) => g.id === groupId);
    if (!group) return [];

    const memberNames = Object.fromEntries(
      group.members.map((m) => [m.uid, m.displayName])
    );
    return computeSettlements(group.balances, memberNames);
  },

  // ── Stats ────────────────────────────────

  getTotalOwed: () => {
    const uid = CURRENT_USER.uid;
    return get().groups.reduce((total, group) => {
      const balance = group.balances[uid] ?? 0;
      return total + (balance > 0 ? balance : 0);
    }, 0);
  },

  getTotalIOwe: () => {
    const uid = CURRENT_USER.uid;
    return get().groups.reduce((total, group) => {
      const balance = group.balances[uid] ?? 0;
      return total + (balance < 0 ? -balance : 0);
    }, 0);
  },
    }),
    {
      name: 'yarsplitkarega-expenses',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        groups: state.groups,
        expenses: state.expenses,
        settlements: state.settlements,
      }),
    }
  )
);
