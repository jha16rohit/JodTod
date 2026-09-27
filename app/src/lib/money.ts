/**
 * Paise-safe money helpers for expense flows.
 *
 * Pure computation only (no mock data, no store): every amount is an
 * integer number of paise so split shares always sum to exactly the
 * expense total. Formatting to display text happens only at the edges;
 * backend payloads use 2dp decimal strings ("1234.56").
 */

export type SplitMethod = 'equal' | 'unequal' | 'percentage' | 'item-wise';

export type ExpenseShare = {
  memberId: string;
  /** Share in paise (integer). Sum must equal the expense total. */
  amountPaise: number;
};

export const toPaise = (rupees: number): number => Math.round(rupees * 100);

export const toRupees = (paise: number): number => paise / 100;

/** Display-only rupee rendering (never for persistence/calculation). */
export const formatINR = (paise: number): string =>
  `₹${toRupees(paise).toLocaleString('en-IN')}`;

export const formatINRInput = (paise: number): string =>
  (paise / 100).toString();

/** Backend 2dp decimal string ("1234.56") for one paise integer. */
export function paiseToDecimalString(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(Math.round(paise));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/**
 * Parse user input ("1,234.56", "₹450") or a backend 2dp string
 * ("1234.56", "-12.50") into paise. Returns null when invalid.
 * allowNegative is for reading backend balances, never for inputs.
 */
export function parseAmountToPaise(
  raw: string,
  opts?: { allowNegative?: boolean; allowZero?: boolean },
): number | null {
  const cleaned = raw.replace(/[₹,\s]/g, '');
  if (!cleaned || !/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const negative = cleaned.startsWith('-');
  if (negative && !opts?.allowNegative) return null;
  const paise = Math.round(parseFloat(cleaned) * 100);
  if (!opts?.allowZero && paise === 0) return null;
  if (paise < 0 && !opts?.allowNegative) return null;
  return paise;
}

/**
 * Split a total (paise) equally among members. The integer remainder is
 * distributed +1 paise to the leading members so the sum is always exact.
 */
export function equalSplit(
  amountPaise: number,
  memberIds: string[],
): ExpenseShare[] {
  if (memberIds.length === 0) return [];
  const base = Math.floor(amountPaise / memberIds.length);
  const remainder = amountPaise - base * memberIds.length;
  return memberIds.map((memberId, i) => ({
    memberId,
    amountPaise: base + (i < remainder ? 1 : 0),
  }));
}

/** Exact paise sum of shares (integer arithmetic, never float). */
export function sumShares(shares: Pick<ExpenseShare, 'amountPaise'>[]): number {
  return shares.reduce((sum, s) => sum + s.amountPaise, 0);
}

/**
 * Monetary shares (paise) for percentage inputs. Rounds each share to
 * the nearest paise, then pushes any rounding drift onto the largest
 * share so the total is exact.
 */
export function percentageShares(
  totalPaise: number,
  entries: { memberId: string; percent: number }[],
): ExpenseShare[] {
  const included = entries.filter((e) => e.percent > 0);
  if (included.length === 0) return [];
  const shares = included.map((e) => ({
    memberId: e.memberId,
    amountPaise: Math.round((e.percent / 100) * totalPaise),
  }));
  const drift = totalPaise - sumShares(shares);
  if (drift !== 0) {
    let target = 0;
    for (let i = 1; i < shares.length; i += 1) {
      if (shares[i].amountPaise > shares[target].amountPaise) target = i;
    }
    shares[target] = {
      ...shares[target],
      amountPaise: shares[target].amountPaise + drift,
    };
  }
  return shares;
}

/** Backend-compatible custom-split payload from paise shares. */
export function sharesToPayload(
  shares: ExpenseShare[],
): { user_id: string; share_amount: string }[] {
  return shares.map((s) => ({
    user_id: s.memberId,
    share_amount: paiseToDecimalString(s.amountPaise),
  }));
}
