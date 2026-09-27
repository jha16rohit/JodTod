/**
 * Adapters from live backend group payloads to the existing
 * groups UI shapes (Member / Expense rows).
 *
 * No mock data is produced here: every field maps from an API row,
 * with display-only fallbacks (empty strings, deterministic icons)
 * where the backend intentionally exposes nothing (e.g. other users'
 * emails stay private).
 */

import type {
  Expense as ApiExpense,
  GroupDetail,
} from '@/services/groups.api';
import { resolvePhotoUrl } from '@/services/profile.api';

/**
 * Display shapes for the groups UI. Mapped exclusively from live
 * backend payloads (see membersOf/expensesOf below) — never mock data.
 */
export type Member = {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Co-Admin' | 'Member';
  isYou?: boolean;
  avatar: string;
};

export type Expense = {
  id: string;
  title: string;
  amount: number;
  date: string;
  paidBy: string;
  splitCount: number;
  icon: 'restaurant' | 'flash' | 'film' | 'bed' | 'car' | 'receipt';
};

export type Group = {
  id: string;
  name: string;
  status: 'Active' | 'Completed' | 'Archived';
  dateRange: string;
  destination: string;
  description: string;
  coverImage: string;
  budget?: number;
  totalExpenses: number;
  youAreOwed: number;
  youOwe: number;
  members: Member[];
  expenses: Expense[];
};

export function avatarOrEmpty(url: string | null | undefined): string {
  if (!url) return '';
  return resolvePhotoUrl(url) ?? url;
}

export function groupStatusOf(detail: GroupDetail): Group['status'] {
  if (detail.lifecycle === 'archived') return 'Archived';
  if (detail.settlement_status === 'settled') return 'Completed';
  return 'Active';
}

export function membersOf(detail: GroupDetail, myId: string | null): Member[] {
  return detail.members.map((m) => ({
    id: m.user_id,
    name: m.display_name,
    email: '',
    role: m.role === 'admin' ? 'Admin' : 'Member',
    isYou: myId !== null && m.user_id === myId,
    avatar: avatarOrEmpty(m.avatar_url),
  }));
}

const EXPENSE_ICONS = ['restaurant', 'flash', 'film', 'bed', 'car'] as const;

export function expenseIconFor(title: string): Expense['icon'] {
  let sum = 0;
  for (let i = 0; i < title.length; i += 1) sum += title.charCodeAt(i);
  return EXPENSE_ICONS[sum % EXPENSE_ICONS.length];
}

export function expenseDateLabel(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function expensesOf(rows: ApiExpense[], myId: string | null): Expense[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    date: expenseDateLabel(row.expense_date ?? row.created_at),
    paidBy: myId !== null && row.payer_user_id === myId ? 'you' : row.payer_name,
    splitCount: row.splits.length,
    icon: expenseIconFor(row.title),
  }));
}
