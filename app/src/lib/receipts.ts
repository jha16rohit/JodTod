/**
 * Saved-receipt queue (camera/gallery captures awaiting an expense).
 *
 * Local pre-submit UI state only: image files live in the app cache and
 * records persist in AsyncStorage on this device. Nothing here claims
 * server persistence — a receipt is "linked" locally once the expense
 * it was attached to is created on the backend. There is no backend
 * receipt/file upload endpoint, so no OCR or server upload is attempted.
 */

import { useSyncExternalStore } from 'react';
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
  /** "Expense title • Group name" snapshot taken at link time. */
  expenseName?: string | null;
  /** Paise integer, never a formatted string. */
  amountPaise?: number | null;
};

const RECEIPTS_STORAGE_KEY = 'jodtod.receipts.v1';

let RECEIPTS: Receipt[] = [];
let receiptsHydrated = false;

type ReceiptsListener = () => void;

const receiptsListeners = new Set<ReceiptsListener>();
let receiptsVersion = 0;

function emitReceiptsChanged(): void {
  receiptsVersion += 1;
  receiptsListeners.forEach((l) => l());
}

function subscribeToReceipts(listener: ReceiptsListener): () => void {
  receiptsListeners.add(listener);
  return () => {
    receiptsListeners.delete(listener);
  };
}

function persistReceipts(): void {
  try {
    const pending = AsyncStorage.setItem(
      RECEIPTS_STORAGE_KEY,
      JSON.stringify(RECEIPTS),
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
            typeof (r as Receipt).imageUri === 'string',
        );
        emitReceiptsChanged();
      }
    }
  } catch {
    // Corrupt storage is non-fatal: start empty.
  }
}

/** Reactive access to stored receipts. */
export function useReceipts(): Receipt[] {
  useSyncExternalStore(subscribeToReceipts, () => receiptsVersion);
  return RECEIPTS;
}

/** Plain snapshot access (newest first). */
export function getReceipts(): Receipt[] {
  return RECEIPTS;
}

export function getReceipt(id: string): Receipt | undefined {
  return RECEIPTS.find((r) => r.id === id);
}

export function receiptDateLabel(iso: string): string {
  const d = new Date(iso);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

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
  emitReceiptsChanged();
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
  link: ReceiptLink,
): Receipt | undefined {
  const receipt = getReceipt(receiptId);
  if (!receipt) return undefined;
  receipt.status = 'linked';
  receipt.linkedExpenseId = link.expenseId;
  receipt.groupId = link.groupId;
  if (link.expenseName !== undefined) receipt.expenseName = link.expenseName;
  if (link.amountPaise !== undefined) receipt.amountPaise = link.amountPaise;
  persistReceipts();
  emitReceiptsChanged();
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
  emitReceiptsChanged();
}
