// ─────────────────────────────────────────────
//  yarsplitkarega — All TypeScript Interfaces
// ─────────────────────────────────────────────

import { CategoryId } from '../constants/categories';

// ── User ────────────────────────────────────
export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  defaultCurrency: string;
  pushToken?: string;
  createdAt: string;
}

// ── Group ───────────────────────────────────
export interface GroupMember {
  uid: string;
  displayName: string;
  photoURL?: string;
  email: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  coverColor: string;
  members: GroupMember[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  currency: string;
  totalSpent: number;
  /** uid → net balance (positive = owed TO this user, negative = owes FROM this user) */
  balances: Record<string, number>;
  /** Optional description */
  description?: string;
}

// ── Expense ─────────────────────────────────
export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export interface ExpenseSplit {
  uid: string;
  displayName: string;
  amount: number;       // actual amount this person owes
  percentage?: number;
  shares?: number;
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  currency: string;
  category: CategoryId;
  paidBy: string;      // uid
  paidByName: string;
  splitType: SplitType;
  splits: ExpenseSplit[];
  date: string;        // ISO date
  createdAt: string;
  createdBy: string;
  notes?: string;
  tags?: string[];
  receiptUrl?: string;
  receiptRawText?: string;
  receiptParsed?: ParsedReceipt;
}

// ── Receipt OCR ─────────────────────────────
export interface ReceiptLineItem {
  name: string;
  quantity?: number;
  price: number;
}

export interface ParsedReceipt {
  merchant?: string;
  total?: number;
  subtotal?: number;
  tax?: number;
  date?: string;
  lineItems: ReceiptLineItem[];
  rawText: string;
}

// ── Settlement ──────────────────────────────
export interface Settlement {
  id: string;
  groupId: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  amount: number;
  currency: string;
  settledAt: string;
  method?: 'cash' | 'upi' | 'bank' | 'other';
  note?: string;
}

/** Suggested settlement transaction (result of algorithm) */
export interface SettlementSuggestion {
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  amount: number;
}

// ── Report ──────────────────────────────────
export interface CategorySpend {
  categoryId: CategoryId;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthlySpend {
  month: string;  // 'YYYY-MM'
  amount: number;
}

export interface MemberSpend {
  uid: string;
  displayName: string;
  photoURL?: string;
  paidAmount: number;
  owedAmount: number;
  netBalance: number;
}

export interface GroupReport {
  groupId: string;
  groupName: string;
  totalSpent: number;
  dateRange: { from: string; to: string };
  byCategory: CategorySpend[];
  byMonth: MonthlySpend[];
  byMember: MemberSpend[];
  expenseCount: number;
  settledCount: number;
}

// ── Navigation ──────────────────────────────
export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Scanner: undefined;
  Groups: undefined;
  Reports: undefined;
  Profile: undefined;
};

export type GroupStackParamList = {
  GroupList: undefined;
  GroupDetail: { groupId: string };
  AddExpense: { groupId: string; prefill?: Partial<Expense> };
  ExpenseDetail: { expenseId: string; groupId: string };
  SettleUp: { groupId: string };
  AddGroup: undefined;
  InviteMember: { groupId: string };
};
