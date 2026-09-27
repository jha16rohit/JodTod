export type MembershipStatus = 'active' | 'pending';

export type Member = {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Co-Admin' | 'Member';
  isYou?: boolean;
  avatar: string;
  /** Missing status on legacy entries means 'active'. */
  status?: MembershipStatus;
  /** Set once the person links a JodTod account; null while pending. */
  userId?: string | null;
  personId?: string | null;
  invitedName?: string | null;
  invitedPhone?: string | null;
  invitedEmail?: string | null;
};

export const memberStatus = (m: Member): MembershipStatus =>
  m.status ?? 'active';

export type Expense = {
  id: string;
  title: string;
  amount: number;
  date: string;
  paidBy: string;
  splitCount: number;
  icon: 'restaurant' | 'flash' | 'film' | 'bed' | 'car' | 'receipt';
  /** Present only on expenses created through the Add Expense flow. */
  splitMethod?: SplitMethod;
  shares?: ExpenseShare[];
  receiptUri?: string | null;
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
  /** Opaque share/QR join token (never an internal id). Set on first share. */
  joinToken?: string;
};

export const MOCK_GROUPS: Group[] = [
  {
    id: 'goa-trip',
    name: 'Goa Trip',
    status: 'Active',
    dateRange: 'Apr 10 – Apr 18, 2025',
    destination: 'Goa, India',
    description: 'Beach, adventure and good vibes! 🏖️',
    coverImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400',
    budget: 50010,
    totalExpenses: 26500,
    youAreOwed: 2450,
    youOwe: 0,
    members: [
      { id: 'm1', name: 'Rohit', email: 'rohit@example.com', role: 'Admin', isYou: true, avatar: 'https://i.pravatar.cc/100?img=12' },
      { id: 'm2', name: 'Aman', email: 'aman@example.com', role: 'Co-Admin', avatar: 'https://i.pravatar.cc/100?img=13' },
      { id: 'm3', name: 'Neha', email: 'neha@example.com', role: 'Member', avatar: 'https://i.pravatar.cc/100?img=47' },
      { id: 'm4', name: 'Karan', email: 'karan@example.com', role: 'Member', avatar: 'https://i.pravatar.cc/100?img=15' },
      { id: 'm5', name: 'Priya', email: 'priya@example.com', role: 'Member', avatar: 'https://i.pravatar.cc/100?img=32' },
    ],
    expenses: [
      { id: 'e1', title: "Dinner at Bruno's", amount: 2850, date: 'Apr 16, 2025', paidBy: 'you', splitCount: 5, icon: 'restaurant' },
      { id: 'e6', title: 'Beach Taxi', amount: 1200, date: 'Apr 15, 2025', paidBy: 'Aman', splitCount: 5, icon: 'car' },
      { id: 'e7', title: 'Cafe Coffee Day', amount: 450, date: 'Apr 13, 2025', paidBy: 'you', splitCount: 5, icon: 'restaurant' },
      { id: 'e2', title: 'Electricity Bill', amount: 1200, date: 'Apr 14, 2025', paidBy: 'Aman', splitCount: 3, icon: 'flash' },
      { id: 'e3', title: 'Movie Night', amount: 980, date: 'Apr 12, 2025', paidBy: 'Neha', splitCount: 5, icon: 'film' },
      { id: 'e4', title: 'Hotel Stay', amount: 8000, date: 'Apr 11, 2025', paidBy: 'Karan', splitCount: 5, icon: 'bed' },
      { id: 'e5', title: 'Fuel', amount: 2500, date: 'Apr 10, 2025', paidBy: 'you', splitCount: 4, icon: 'car' },
    ],
  },
  {
    id: 'flatmates',
    name: 'Flatmates',
    status: 'Active',
    dateRange: 'Jan 1, 2025 – Present',
    destination: 'Bengaluru, India',
    description: 'Shared apartment expenses',
    coverImage: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400',
    totalExpenses: 18720,
    youAreOwed: 0,
    youOwe: 680,
    members: [
      { id: 'm1', name: 'Rohit', email: 'rohit@example.com', role: 'Admin', isYou: true, avatar: 'https://i.pravatar.cc/100?img=12' },
      { id: 'm2', name: 'Rahul', email: 'rahul@example.com', role: 'Member', avatar: 'https://i.pravatar.cc/100?img=59' },
      { id: 'm3', name: 'Priya', email: 'priya@example.com', role: 'Member', avatar: 'https://i.pravatar.cc/100?img=32' },
      { id: 'm4', name: 'Karan', email: 'karan@example.com', role: 'Member', avatar: 'https://i.pravatar.cc/100?img=15' },
    ],
    expenses: [
      { id: 'e1', title: 'Groceries', amount: 3200, date: 'Sep 2, 2025', paidBy: 'you', splitCount: 4, icon: 'restaurant' },
      { id: 'e2', title: 'Internet Bill', amount: 999, date: 'Sep 1, 2025', paidBy: 'Rahul', splitCount: 4, icon: 'flash' },
      { id: 'e3', title: 'Milk & Bread', amount: 320, date: 'Sep 3, 2025', paidBy: 'you', splitCount: 4, icon: 'restaurant' },
    ],
  },
  {
    id: 'manali-trip',
    name: 'Manali Trip',
    status: 'Completed',
    dateRange: 'Dec 20 – Dec 28, 2024',
    destination: 'Manali, India',
    description: 'Snow, bonfires and mountain views ❄️',
    coverImage: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=400',
    budget: 40000,
    totalExpenses: 36700,
    youAreOwed: 1120,
    youOwe: 0,
    members: [
      { id: 'm1', name: 'Rohit', email: 'rohit@example.com', role: 'Admin', isYou: true, avatar: 'https://i.pravatar.cc/100?img=12' },
      { id: 'm2', name: 'Sanjay', email: 'sanjay@example.com', role: 'Member', avatar: 'https://i.pravatar.cc/100?img=53' },
      { id: 'm3', name: 'Meera', email: 'meera@example.com', role: 'Member', avatar: 'https://i.pravatar.cc/100?img=44' },
    ],
    expenses: [
      { id: 'e1', title: 'Cab to Manali', amount: 6500, date: 'Dec 20, 2024', paidBy: 'you', splitCount: 6, icon: 'car' },
      { id: 'e2', title: 'Cottage Stay', amount: 15001, date: 'Dec 21, 2024', paidBy: 'Sanjay', splitCount: 6, icon: 'bed' },
    ],
  },
  {
    id: 'college-friends',
    name: 'College Friends',
    status: 'Archived',
    dateRange: 'Aug 5 – Aug 12, 2024',
    destination: 'Rishikesh, India',
    description: 'Reunion trip after graduation 🎓',
    coverImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400',
    totalExpenses: 22100,
    youAreOwed: 0,
    youOwe: 0,
    members: [
      { id: 'm1', name: 'Rohit', email: 'rohit@example.com', role: 'Admin', isYou: true, avatar: 'https://i.pravatar.cc/100?img=12' },
      { id: 'm2', name: 'Varun', email: 'varun@example.com', role: 'Member', avatar: 'https://i.pravatar.cc/100?img=59' },
    ],
    expenses: [],
  },
];

export function getGroup(id: string) {
  return MOCK_GROUPS.find((g) => g.id === id);
}

// ---------------------------------------------------------------------------
// Group creation (single source of truth — Groups "+" and global Plus share it)
// ---------------------------------------------------------------------------

export type GroupInput = {
  name: string;
  destination?: string;
  description?: string;
  budget?: number;
  coverImage?: string;
  dateRange?: string;
};

export type GroupCreator = {
  name: string;
  email?: string;
  avatar?: string;
  userId?: string;
};

/**
 * Create a group: unique id, Active, creator as Admin + isYou member, empty
 * expenses and zero totals. Inserted into MOCK_GROUPS and announced through
 * the existing reactive store, so Groups / Add Expense / Add Member /
 * Add Receipt / invite flows all see it immediately.
 */
export function createGroup(input: GroupInput, creator: GroupCreator): Group {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Group name is required.');
  }
  const id = `g${Date.now()}`;
  const group: Group = {
    id,
    name,
    status: 'Active',
    dateRange: input.dateRange ?? '',
    destination: input.destination?.trim() ?? '',
    description: input.description?.trim() ?? '',
    coverImage:
      input.coverImage ??
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400',
    budget: input.budget,
    totalExpenses: 0,
    youAreOwed: 0,
    youOwe: 0,
    members: [
      {
        id: `gm${Date.now()}`,
        name: creator.name,
        email: creator.email ?? '',
        role: 'Admin',
        isYou: true,
        avatar: creator.avatar ?? '',
        status: 'active',
        userId: creator.userId ?? 'user_you',
      },
    ],
    expenses: [],
  };
  MOCK_GROUPS.unshift(group);
  emitGroupsChanged();
  return group;
}

// ---------------------------------------------------------------------------
// Expense creation (additive — existing exports above are untouched)
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from 'react';

export type SplitMethod = 'equal' | 'unequal';

export type ExpenseShare = {
  memberId: string;
  /** Share in paise (integer). Sum must equal the expense total. */
  amountPaise: number;
};

export type ExpenseInput = {
  title: string;
  /** Total in paise (integer — never floats for money). */
  amountPaise: number;
  paidByMemberId: string;
  splitMethod: SplitMethod;
  shares: ExpenseShare[];
  receiptUri?: string | null;
  date?: string;
};

// --- paise-safe money helpers (display formatting only at the edges) ---

export const toPaise = (rupees: number): number => Math.round(rupees * 100);

export const toRupees = (paise: number): number => paise / 100;

export const formatINR = (paise: number): string =>
  `₹${toRupees(paise).toLocaleString('en-IN')}`;

export const formatINRInput = (paise: number): string =>
  (paise / 100).toString();

export function parseAmountToPaise(raw: string): number | null {
  const cleaned = raw.replace(/[₹,\s]/g, '');
  if (!cleaned || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const paise = Math.round(parseFloat(cleaned) * 100);
  return paise > 0 ? paise : null;
}

/**
 * Split a total (paise) equally among members. The integer remainder is
 * distributed +1 paise to the leading members so the sum is always exact.
 */
export function equalSplit(
  amountPaise: number,
  memberIds: string[]
): ExpenseShare[] {
  if (memberIds.length === 0) return [];
  const base = Math.floor(amountPaise / memberIds.length);
  const remainder = amountPaise - base * memberIds.length;
  return memberIds.map((memberId, i) => ({
    memberId,
    amountPaise: base + (i < remainder ? 1 : 0),
  }));
}

// --- reactive store seam -----------------------------------------------
// In-memory today (no backend expense endpoint exists yet). Screens read via
// useGroups() and re-render on every mutation. To go remote later, replace
// addExpenseToGroup's body with an API call + the same emit().

type GroupsListener = () => void;

const groupsListeners = new Set<GroupsListener>();
let groupsVersion = 0;

function emitGroupsChanged(): void {
  groupsVersion += 1;
  groupsListeners.forEach((l) => l());
}

function subscribeToGroups(listener: GroupsListener): () => void {
  groupsListeners.add(listener);
  return () => {
    groupsListeners.delete(listener);
  };
}

/** Reactive access to MOCK_GROUPS — re-renders the caller on every mutation. */
export function useGroups(): Group[] {
  useSyncExternalStore(subscribeToGroups, () => groupsVersion);
  return MOCK_GROUPS;
}

export function activeGroups(): Group[] {
  return MOCK_GROUPS.filter((g) => g.status === 'Active');
}

function todayLabel(): string {
  const d = new Date();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Persist a validated expense into its group and notify all subscribers.
 * Returns the created Expense. Throws on unknown group (defensive).
 */
export function addExpenseToGroup(
  groupId: string,
  input: ExpenseInput
): Expense {
  const group = getGroup(groupId);
  if (!group) {
    throw new Error(`Unknown group: ${groupId}`);
  }
  const payer = group.members.find((m) => m.id === input.paidByMemberId);
  const expense: Expense = {
    id: `e${Date.now()}`,
    title: input.title.trim(),
    amount: toRupees(input.amountPaise),
    date: input.date ?? todayLabel(),
    paidBy: payer?.isYou ? 'you' : (payer?.name ?? 'you'),
    splitCount: input.shares.length,
    icon: 'receipt',
    splitMethod: input.splitMethod,
    shares: input.shares,
    receiptUri: input.receiptUri ?? null,
  };
  group.expenses.unshift(expense);
  group.totalExpenses += toRupees(input.amountPaise);
  emitGroupsChanged();
  return expense;
}

// ---------------------------------------------------------------------------
// Receipts (same reactive store family — one source of truth)
// ---------------------------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReceiptStatus = 'saved' | 'linked';

export type Receipt = {
  id: string;
  imageUri: string;
  /** ISO timestamp of when the bill was scanned. */
  createdAt: string;
  status: ReceiptStatus;
  linkedExpenseId?: string | null;
  groupId?: string | null;
  expenseName?: string | null;
  /** Paise integer, never a formatted string. */
  amountPaise?: number | null;
};

const RECEIPTS_STORAGE_KEY = 'jodtod.receipts.v1';

let RECEIPTS: Receipt[] = [];
let receiptsHydrated = false;

function persistReceipts(): void {
  try {
    const pending = AsyncStorage.setItem(
      RECEIPTS_STORAGE_KEY,
      JSON.stringify(RECEIPTS)
    );
    if (pending && typeof pending.catch === 'function') {
      pending.catch(() => {
        // Storage failure is non-fatal: the in-memory copy keeps working.
      });
    }
  } catch {
    // Storage unavailable (or failing synchronously) is non-fatal.
  }
}

/**
 * Load persisted receipt records once (image files live in the app cache).
 * Safe to call from any receipt screen's mount effect.
 */
export async function hydrateReceipts(): Promise<void> {
  if (receiptsHydrated) return;
  receiptsHydrated = true;
  try {
    const raw = await AsyncStorage.getItem(RECEIPTS_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        RECEIPTS = parsed.filter(
          (r): r is Receipt =>
            typeof r === 'object' &&
            r !== null &&
            typeof (r as Receipt).id === 'string' &&
            typeof (r as Receipt).imageUri === 'string'
        );
        emitGroupsChanged();
      }
    }
  } catch {
    // Corrupt storage is non-fatal: start empty.
  }
}

/** Reactive access to stored receipts. */
export function useReceipts(): Receipt[] {
  useSyncExternalStore(subscribeToGroups, () => groupsVersion);
  return RECEIPTS;
}

/** Plain snapshot access (newest first). */
export function getReceipts(): Receipt[] {
  return RECEIPTS;
}

export function getReceipt(id: string): Receipt | undefined {
  return RECEIPTS.find((r) => r.id === id);
}

function receiptDateLabel(iso: string): string {
  const d = new Date(iso);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export { receiptDateLabel };

/** Store a freshly scanned bill as an unassigned receipt. */
export function addReceipt(imageUri: string): Receipt {
  const receipt: Receipt = {
    id: `r${Date.now()}`,
    imageUri,
    createdAt: new Date().toISOString(),
    status: 'saved',
    linkedExpenseId: null,
    groupId: null,
    expenseName: null,
    amountPaise: null,
  };
  RECEIPTS.unshift(receipt);
  persistReceipts();
  emitGroupsChanged();
  return receipt;
}

export type ReceiptLink = {
  expenseId: string;
  groupId: string;
  expenseName?: string;
  amountPaise?: number;
};

/** Attach a receipt to a newly created expense (reuses the stored image URI). */
export function linkReceiptToExpense(
  receiptId: string,
  link: ReceiptLink
): Receipt | undefined {
  const receipt = getReceipt(receiptId);
  if (!receipt) return undefined;
  receipt.status = 'linked';
  receipt.linkedExpenseId = link.expenseId;
  receipt.groupId = link.groupId;
  if (link.expenseName !== undefined) receipt.expenseName = link.expenseName;
  if (link.amountPaise !== undefined) receipt.amountPaise = link.amountPaise;
  persistReceipts();
  emitGroupsChanged();
  return receipt;
}

/** Human-readable status for receipt pills and detail screens. */
export function linkReceiptStatusLabel(receipt: Receipt): string {
  return receipt.status === 'linked' ? 'Added to expense' : 'Saved for later';
}

/** Permanently remove a saved receipt (caller must confirm first). */
export function deleteReceipt(receiptId: string): void {
  RECEIPTS = RECEIPTS.filter((r) => r.id !== receiptId);
  persistReceipts();
  emitGroupsChanged();
}

// ---------------------------------------------------------------------------
// People, memberships, invitations, join tokens (same store family)
// ---------------------------------------------------------------------------

import * as Crypto from 'expo-crypto';

export type Person = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  avatar?: string | null;
  /** Linked JodTod account; null until the person registers. */
  userId?: string | null;
};

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export type GroupInvitation = {
  id: string;
  groupId: string;
  inviterName: string;
  personId?: string | null;
  invitedName: string;
  invitedPhone?: string | null;
  invitedEmail?: string | null;
  /** Opaque join token — the ONLY thing encoded in links/QR codes. */
  token: string;
  status: InvitationStatus;
  createdAt: string;
};

let PEOPLE: Person[] = [];
let peopleSeeded = false;
let INVITATIONS: GroupInvitation[] = [];

const normPhone = (p?: string | null): string =>
  (p ?? '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
const normEmail = (e?: string | null): string => (e ?? '').trim().toLowerCase();
const normName = (n?: string | null): string => (n ?? '').trim().toLowerCase();

function seedPeople(): void {
  if (peopleSeeded) return;
  peopleSeeded = true;
  for (const g of MOCK_GROUPS) {
    for (const m of g.members) {
      if (
        !PEOPLE.some(
          (p) =>
            (m.email && normEmail(p.email) === normEmail(m.email)) ||
            normName(p.name) === normName(m.name)
        )
      ) {
        PEOPLE.push({
          id: `p_${m.id}_${g.id}`,
          name: m.name,
          email: m.email || null,
          avatar: m.avatar || null,
          userId: m.isYou ? 'user_you' : null,
        });
      }
    }
  }
}

/** Everyone known to the current user (seeded from existing members). */
export function getPeople(): Person[] {
  seedPeople();
  return PEOPLE;
}

export function findPersonByContact(input: {
  phone?: string | null;
  email?: string | null;
  name?: string | null;
}): Person | undefined {
  seedPeople();
  const phone = normPhone(input.phone);
  const email = normEmail(input.email);
  if (phone) {
    const hit = PEOPLE.find((p) => p.phone && normPhone(p.phone) === phone);
    if (hit) return hit;
  }
  if (email) {
    const hit = PEOPLE.find((p) => p.email && normEmail(p.email) === email);
    if (hit) return hit;
  }
  if (input.name && normName(input.name)) {
    return PEOPLE.find((p) => normName(p.name) === normName(input.name));
  }
  return undefined;
}

/**
 * Create (or reuse) a person. Matching phone/email/name NEVER duplicates:
 * the existing record is returned with `isNew: false`.
 */
export function createPerson(input: {
  name: string;
  phone?: string | null;
  email?: string | null;
}): { person: Person; isNew: boolean } {
  const existing = findPersonByContact(input);
  if (existing) return { person: existing, isNew: false };
  const person: Person = {
    id: `p${Date.now()}`,
    name: input.name.trim(),
    phone: input.phone?.trim() ? input.phone.trim() : null,
    email: input.email?.trim() ? input.email.trim() : null,
    avatar: null,
    userId: null,
  };
  PEOPLE.unshift(person);
  emitGroupsChanged();
  return { person, isNew: true };
}

export function isValidPhone(phone: string): boolean {
  return normPhone(phone).length >= 10;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// --- join tokens (opaque; safe for links + QR) ---

export function getGroupJoinToken(groupId: string): string {
  const group = getGroup(groupId);
  if (!group) throw new Error(`Unknown group: ${groupId}`);
  if (!group.joinToken) {
    group.joinToken = `goa_${Crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    emitGroupsChanged();
  }
  return group.joinToken as string;
}

export function buildJoinLink(groupId: string): string {
  return `jodtod://join-group?token=${getGroupJoinToken(groupId)}`;
}

/** Rotate the join token (invalidates previously shared links/QRs). */
export function regenerateGroupJoinToken(groupId: string): string {
  const group = getGroup(groupId);
  if (!group) throw new Error(`Unknown group: ${groupId}`);
  group.joinToken = `goa_${Crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  emitGroupsChanged();
  return group.joinToken as string;
}

export function getGroupByJoinToken(token: string): Group | undefined {
  const clean = (token ?? '').trim();
  if (!clean) return undefined;
  return MOCK_GROUPS.find((g) => g.joinToken === clean);
}

/** Extract a join token from scanned text (link or raw token). */
export function parseJoinToken(scanned: string): string | null {
  const text = (scanned ?? '').trim();
  if (!text) return null;
  const m = text.match(/[?&]token=([^&\s]+)/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{8,64}$/.test(text)) return text;
  return null;
}

// --- memberships + invitations ---

export function getGroupInvitations(groupId: string): GroupInvitation[] {
  return INVITATIONS.filter((i) => i.groupId === groupId);
}

export function getInvitation(id: string): GroupInvitation | undefined {
  return INVITATIONS.find((i) => i.id === id);
}

/**
 * Add a person to a group. Never duplicates: an existing membership for the
 * same person (by personId or matching contact) is returned as-is.
 * New people enter as `pending` with a pending invitation; the membership
 * (and its expense history) is preserved when they later join.
 */
export function addMemberToGroup(
  groupId: string,
  personId: string,
  inviterName = 'Rohit'
): { member: Member; invitation: GroupInvitation; isNew: boolean } {
  const group = getGroup(groupId);
  if (!group) throw new Error(`Unknown group: ${groupId}`);
  seedPeople();
  const person = PEOPLE.find((p) => p.id === personId);
  if (!person) throw new Error(`Unknown person: ${personId}`);

  const dupe = group.members.find(
    (m) =>
      m.personId === person.id ||
      (person.email && normEmail(m.email) === normEmail(person.email)) ||
      (person.phone &&
        m.invitedPhone &&
        normPhone(m.invitedPhone) === normPhone(person.phone)) ||
      normName(m.name) === normName(person.name) ||
      (m.invitedName && normName(m.invitedName) === normName(person.name))
  );
  if (dupe) {
    const invitation =
      INVITATIONS.find(
        (i) =>
          i.groupId === groupId &&
          i.status === 'pending' &&
          (i.personId === person.id ||
            (person.email &&
              i.invitedEmail &&
              normEmail(i.invitedEmail) === normEmail(person.email)))
      ) ?? null;
    return {
      member: dupe,
      invitation:
        invitation ??
        ({
          id: `inv_existing_${dupe.id}`,
          groupId,
          inviterName,
          personId: person.id,
          invitedName: person.name,
          invitedPhone: person.phone ?? null,
          invitedEmail: person.email ?? null,
          token: getGroupJoinToken(groupId),
          status:
            memberStatus(dupe) === 'active' ? 'accepted' : 'pending',
          createdAt: new Date().toISOString(),
        } as GroupInvitation),
      isNew: false,
    };
  }

  const member: Member = {
    id: `gm${Date.now()}`,
    name: person.name,
    email: person.email ?? '',
    role: 'Member',
    avatar: person.avatar ?? '',
    status: 'pending',
    userId: person.userId ?? null,
    personId: person.id,
    invitedName: person.name,
    invitedPhone: person.phone ?? null,
    invitedEmail: person.email ?? null,
  };
  group.members.push(member);
  const invitation: GroupInvitation = {
    id: `inv${Date.now()}`,
    groupId,
    inviterName,
    personId: person.id,
    invitedName: person.name,
    invitedPhone: person.phone ?? null,
    invitedEmail: person.email ?? null,
    token: `inv_${Crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  INVITATIONS.unshift(invitation);
  emitGroupsChanged();
  return { member, invitation, isNew: true };
}

/**
 * Accept an invitation: pending membership becomes active IN PLACE, so all
 * expense history and balances attached to it are preserved (never recreated).
 */
export function acceptInvitation(invitationId: string): Member | undefined {
  const invitation = getInvitation(invitationId);
  if (!invitation || invitation.status !== 'pending') return undefined;
  const group = getGroup(invitation.groupId);
  if (!group) return undefined;
  const member = group.members.find(
    (m) =>
      (invitation.personId && m.personId === invitation.personId) ||
      (invitation.invitedEmail &&
        m.invitedEmail &&
        normEmail(m.invitedEmail) === normEmail(invitation.invitedEmail)) ||
      (m.invitedName &&
        normName(m.invitedName) === normName(invitation.invitedName))
  );
  if (!member) return undefined;
  member.status = 'active';
  invitation.status = 'accepted';
  emitGroupsChanged();
  return member;
}

export function declineInvitation(invitationId: string): void {
  const invitation = getInvitation(invitationId);
  if (!invitation || invitation.status !== 'pending') return;
  invitation.status = 'declined';
  emitGroupsChanged();
}

/**
 * Activate a pending group member (e.g. they installed JodTod and verified
 * the invited contact). Resolves the member's pending invitation and flips
 * the membership active in place — expense history is preserved.
 * Returns false when there is nothing pending to activate.
 */
export function activateGroupMember(
  groupId: string,
  memberId: string
): boolean {
  const group = getGroup(groupId);
  const member = group?.members.find((m) => m.id === memberId);
  if (!group || !member || memberStatus(member) !== 'pending') return false;
  const invitation = INVITATIONS.find(
    (i) =>
      i.groupId === groupId &&
      i.status === 'pending' &&
      ((member.personId && i.personId === member.personId) ||
        (member.invitedEmail &&
          i.invitedEmail &&
          normEmail(i.invitedEmail) === normEmail(member.invitedEmail)) ||
        (member.invitedName &&
          i.invitedName &&
          normName(i.invitedName) === normName(member.invitedName)))
  );
  if (invitation) {
    invitation.status = 'accepted';
  }
  member.status = 'active';
  emitGroupsChanged();
  return true;
}

/**
 * Join a group via its join token (link or QR). Current-device user joins as
 * themselves; already-a-member resolves to { status: 'already' }.
 * Backend seam: replace the local accept with a server call later.
 */
export function joinGroupByToken(
  token: string,
  displayName = 'Rohit'
): { status: 'joined' | 'already' | 'invalid'; group?: Group } {
  const group = getGroupByJoinToken(token);
  if (!group) return { status: 'invalid' };
  if (group.members.some((m) => m.isYou)) return { status: 'already', group };
  const member: Member = {
    id: `gm${Date.now()}`,
    name: displayName,
    email: '',
    role: 'Member',
    isYou: true,
    avatar: '',
    status: 'active',
    userId: 'user_you',
  };
  group.members.push(member);
  INVITATIONS.unshift({
    id: `inv${Date.now()}`,
    groupId: group.id,
    inviterName: '',
    invitedName: displayName,
    token: getGroupJoinToken(group.id),
    status: 'accepted',
    createdAt: new Date().toISOString(),
  });
  emitGroupsChanged();
  return { status: 'joined', group };
}
