// ─────────────────────────────────────────────
//  Formatters — Currency, Date, Name utilities
// ─────────────────────────────────────────────

import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';

// ── Currency ────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  AED: 'د.إ',
};

export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}

export function formatCurrency(
  amount: number,
  currencyCode = 'INR',
  showSign = false,
): string {
  const symbol = getCurrencySymbol(currencyCode);
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = showSign ? (amount >= 0 ? '+' : '-') : amount < 0 ? '-' : '';
  return `${sign}${symbol}${formatted}`;
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Date ────────────────────────────────────

export function formatDate(isoString: string): string {
  const date = parseISO(isoString);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'dd MMM yyyy');
}

export function formatDateShort(isoString: string): string {
  return format(parseISO(isoString), 'dd MMM');
}

export function formatRelativeTime(isoString: string): string {
  return formatDistanceToNow(parseISO(isoString), { addSuffix: true });
}

export function formatMonth(isoMonth: string): string {
  // isoMonth: 'YYYY-MM'
  return format(parseISO(`${isoMonth}-01`), 'MMM yyyy');
}

export function toISODate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

// ── Strings ─────────────────────────────────

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen - 3)}...`;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ── Number helpers ───────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function roundTo(value: number, decimals: number): number {
  return parseFloat(value.toFixed(decimals));
}

export function sumBy<T>(arr: T[], key: keyof T): number {
  return arr.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
}

// ── Mock data helpers ────────────────────────

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function randomColor(): string {
  const colors = [
    '#6C63FF', '#FF6584', '#00D9B5', '#FF6B6B', '#4ECDC4',
    '#A29BFE', '#FD79A8', '#FDCB6E', '#74B9FF', '#55EFC4',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function randomEmoji(): string {
  const emojis = ['🏠', '✈️', '🍕', '🎉', '🏖️', '🎮', '🛒', '💼', '🎓', '🏋️', '🎵', '🌍'];
  return emojis[Math.floor(Math.random() * emojis.length)];
}
