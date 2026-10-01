import { CURRENCY_SYMBOL } from '@/constants';
import type { Currency } from '@/types';

const inrGrouping = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const plainGrouping = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Full amount with grouping, for tables and totals. */
export function formatMoney(value: number, currency: Currency = 'INR'): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? '';
  const grouped = currency === 'INR' ? inrGrouping.format(value) : plainGrouping.format(value);
  return `${symbol}${grouped}`;
}

/** Shortened amount for headline metrics. Crore and lakh for INR. */
export function formatMoneyShort(value: number, currency: Currency = 'INR'): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? '';
  if (currency === 'INR') {
    if (Math.abs(value) >= 1e7) return `${symbol}${(value / 1e7).toFixed(2)} Cr`;
    if (Math.abs(value) >= 1e5) return `${symbol}${(value / 1e5).toFixed(2)} L`;
    return `${symbol}${inrGrouping.format(value)}`;
  }
  if (Math.abs(value) >= 1e6) return `${symbol}${(value / 1e6).toFixed(2)}M`;
  if (Math.abs(value) >= 1e3) return `${symbol}${(value / 1e3).toFixed(1)}K`;
  return `${symbol}${plainGrouping.format(value)}`;
}

export function formatNumber(value: number): string {
  return plainGrouping.format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return `${date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/** Days from today. Negative means overdue. */
export function daysUntil(value: string): number {
  const target = new Date(value).getTime();
  const today = new Date().setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86_400_000);
}

export function relativeDays(value: string): string {
  const days = daysUntil(value);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days > 0) return `In ${days} days`;
  if (days === -1) return 'Overdue by 1 day';
  return `Overdue by ${Math.abs(days)} days`;
}

export function initialsOf(name: string): string {
  const parts = name.replace(/\(.*\)/, '').trim().split(/\s+/);
  const letters = parts.filter((p) => /[A-Za-z]/.test(p[0])).slice(-2);
  return letters.map((p) => p[0]!.toUpperCase()).join('') || 'NA';
}

export function titleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
