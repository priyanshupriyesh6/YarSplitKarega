// ─────────────────────────────────────────────
//  Settlement Algorithm — Minimum Transactions
// ─────────────────────────────────────────────
//  Given a map of uid → net balance, produce the
//  minimum number of transfers to settle all debts.
// ─────────────────────────────────────────────

import { SettlementSuggestion } from '../types';

interface BalanceEntry {
  uid: string;
  name: string;
  balance: number;  // positive = owed money, negative = owes money
}

/**
 * Simplify group debts into minimum number of transactions.
 * Uses greedy matching of largest debtor vs largest creditor.
 */
export function computeSettlements(
  balances: Record<string, number>,
  memberNames: Record<string, string>,
): SettlementSuggestion[] {
  const entries: BalanceEntry[] = Object.entries(balances)
    .map(([uid, balance]) => ({
      uid,
      name: memberNames[uid] ?? uid,
      balance: parseFloat(balance.toFixed(2)),
    }))
    .filter((e) => Math.abs(e.balance) > 0.01);

  const suggestions: SettlementSuggestion[] = [];

  // Work on a mutable copy
  const state = entries.map((e) => ({ ...e }));

  while (true) {
    // Sort: most positive first (creditors), most negative last (debtors)
    state.sort((a, b) => b.balance - a.balance);

    // Remove settled entries
    const active = state.filter((e) => Math.abs(e.balance) > 0.01);
    if (active.length < 2) break;

    const creditor = active[0];   // owed money
    const debtor = active[active.length - 1]; // owes money

    if (creditor.balance <= 0 || debtor.balance >= 0) break;

    const amount = parseFloat(
      Math.min(creditor.balance, -debtor.balance).toFixed(2)
    );

    suggestions.push({
      fromUid: debtor.uid,
      fromName: debtor.name,
      toUid: creditor.uid,
      toName: creditor.name,
      amount,
    });

    // Update balances
    const creditorState = state.find((e) => e.uid === creditor.uid)!;
    const debtorState = state.find((e) => e.uid === debtor.uid)!;
    creditorState.balance = parseFloat((creditorState.balance - amount).toFixed(2));
    debtorState.balance = parseFloat((debtorState.balance + amount).toFixed(2));
  }

  return suggestions;
}

/**
 * Apply an expense to group balances.
 * paidBy gets credited; each split member gets debited.
 */
export function applyExpenseToBalances(
  balances: Record<string, number>,
  paidByUid: string,
  splits: { uid: string; amount: number }[],
  expenseAmount: number,
): Record<string, number> {
  const updated = { ...balances };

  // Payer is owed the full amount (minus their own share)
  const payerOwnShare = splits.find((s) => s.uid === paidByUid)?.amount ?? 0;
  updated[paidByUid] = (updated[paidByUid] ?? 0) + expenseAmount - payerOwnShare;

  // Each other member owes their split amount
  for (const split of splits) {
    if (split.uid === paidByUid) continue;
    updated[split.uid] = (updated[split.uid] ?? 0) - split.amount;
  }

  return updated;
}

/**
 * Reverse-apply an expense (for deletion/edit)
 */
export function reverseExpenseFromBalances(
  balances: Record<string, number>,
  paidByUid: string,
  splits: { uid: string; amount: number }[],
  expenseAmount: number,
): Record<string, number> {
  const updated = { ...balances };
  const payerOwnShare = splits.find((s) => s.uid === paidByUid)?.amount ?? 0;
  updated[paidByUid] = (updated[paidByUid] ?? 0) - (expenseAmount - payerOwnShare);
  for (const split of splits) {
    if (split.uid === paidByUid) continue;
    updated[split.uid] = (updated[split.uid] ?? 0) + split.amount;
  }
  return updated;
}

/**
 * Format a balance for display (e.g. "+₹1,200" or "-₹500")
 */
export function formatBalance(amount: number, currency = '₹'): string {
  const abs = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount >= 0 ? '+' : '-'}${currency}${abs}`;
}
