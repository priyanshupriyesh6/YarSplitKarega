// ─────────────────────────────────────────────
//  Split Calculator — All split type logic
// ─────────────────────────────────────────────

import { ExpenseSplit, GroupMember, SplitType } from '../types';

/**
 * Calculate equal splits among members
 */
export function calculateEqualSplit(
  total: number,
  members: GroupMember[],
  paidByUid: string,
): ExpenseSplit[] {
  const each = parseFloat((total / members.length).toFixed(2));
  let remainder = parseFloat((total - each * members.length).toFixed(2));

  return members.map((m, i) => {
    let amount = each;
    // Distribute rounding remainder to first person
    if (i === 0 && remainder !== 0) {
      amount = parseFloat((each + remainder).toFixed(2));
    }
    return {
      uid: m.uid,
      displayName: m.displayName,
      amount: m.uid === paidByUid ? 0 : amount,
    };
  });
}

/**
 * Validate that exact splits sum to total
 */
export function validateExactSplit(
  total: number,
  splits: { uid: string; amount: number }[],
): { valid: boolean; difference: number } {
  const sum = splits.reduce((acc, s) => acc + s.amount, 0);
  const difference = parseFloat((total - sum).toFixed(2));
  return { valid: Math.abs(difference) < 0.01, difference };
}

/**
 * Calculate splits from percentages
 */
export function calculatePercentageSplit(
  total: number,
  members: GroupMember[],
  percentages: Record<string, number>,
  paidByUid: string,
): ExpenseSplit[] {
  const totalPct = Object.values(percentages).reduce((a, b) => a + b, 0);
  if (Math.abs(totalPct - 100) > 0.01) {
    throw new Error(`Percentages must sum to 100 (currently ${totalPct})`);
  }
  return members.map((m) => ({
    uid: m.uid,
    displayName: m.displayName,
    amount: m.uid === paidByUid
      ? 0
      : parseFloat(((percentages[m.uid] ?? 0) / 100 * total).toFixed(2)),
    percentage: percentages[m.uid] ?? 0,
  }));
}

/**
 * Calculate splits from share counts
 */
export function calculateSharesSplit(
  total: number,
  members: GroupMember[],
  shares: Record<string, number>,
  paidByUid: string,
): ExpenseSplit[] {
  const totalShares = Object.values(shares).reduce((a, b) => a + b, 0);
  if (totalShares === 0) throw new Error('Total shares cannot be zero');
  return members.map((m) => {
    const memberShares = shares[m.uid] ?? 1;
    const amount = parseFloat((memberShares / totalShares * total).toFixed(2));
    return {
      uid: m.uid,
      displayName: m.displayName,
      amount: m.uid === paidByUid ? 0 : amount,
      shares: memberShares,
    };
  });
}

/**
 * Master split calculator — dispatches to correct method
 */
export function calculateSplits(params: {
  total: number;
  members: GroupMember[];
  paidByUid: string;
  splitType: SplitType;
  exactAmounts?: Record<string, number>;
  percentages?: Record<string, number>;
  shares?: Record<string, number>;
}): ExpenseSplit[] {
  const { total, members, paidByUid, splitType } = params;

  switch (splitType) {
    case 'equal':
      return calculateEqualSplit(total, members, paidByUid);

    case 'exact': {
      if (!params.exactAmounts) throw new Error('exactAmounts required');
      return members.map((m) => ({
        uid: m.uid,
        displayName: m.displayName,
        amount: m.uid === paidByUid ? 0 : (params.exactAmounts![m.uid] ?? 0),
      }));
    }

    case 'percentage':
      if (!params.percentages) throw new Error('percentages required');
      return calculatePercentageSplit(total, members, params.percentages, paidByUid);

    case 'shares':
      if (!params.shares) throw new Error('shares required');
      return calculateSharesSplit(total, members, params.shares, paidByUid);

    default:
      throw new Error(`Unknown split type: ${splitType}`);
  }
}

/**
 * How much does `uid` owe in an expense?
 */
export function getOwedAmount(splits: ExpenseSplit[], uid: string): number {
  return splits.find((s) => s.uid === uid)?.amount ?? 0;
}
