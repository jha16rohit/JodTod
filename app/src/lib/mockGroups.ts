export type Member = { id: string; name: string; email: string; role: 'Admin' | 'Member'; isYou?: boolean };
export type Expense = { id: string; title: string; amount: number; paidBy: string; splitCount: number; date: string; icon: 'restaurant' | 'flash' | 'film' | 'bed' | 'car' };
export type Group = {
  id: string; name: string; status: 'Active' | 'Completed' | 'Archived'; dateRange: string;
  destination: string; description: string; budget: number; totalExpenses: number;
  youAreOwed: number; youOwe: number; members: Member[]; expenses: Expense[];
};

const members: Member[] = [
  { id: 'you', name: 'You', email: 'you@example.com', role: 'Admin', isYou: true },
  { id: 'riya', name: 'Riya Sharma', email: 'riya@example.com', role: 'Member' },
  { id: 'arjun', name: 'Arjun Mehta', email: 'arjun@example.com', role: 'Member' },
  { id: 'neha', name: 'Neha Kapoor', email: 'neha@example.com', role: 'Member' },
];

export const MOCK_GROUPS: Group[] = [
  {
    id: 'goa-trip', name: 'Goa Trip', status: 'Active', dateRange: 'Apr 10 - Apr 18, 2025',
    destination: 'Goa, India', description: 'A relaxing trip with friends.', budget: 50000,
    totalExpenses: 28450, youAreOwed: 1250, youOwe: 0, members,
    expenses: [
      { id: 'e1', title: 'Beach dinner', amount: 4200, paidBy: 'you', splitCount: 4, date: 'Apr 12, 2025', icon: 'restaurant' },
      { id: 'e2', title: 'Taxi to hotel', amount: 850, paidBy: 'Riya Sharma', splitCount: 4, date: 'Apr 11, 2025', icon: 'car' },
    ],
  },
  {
    id: 'flatmates', name: 'Flatmates', status: 'Active', dateRange: 'Jan 1 - Dec 31, 2025',
    destination: 'Bengaluru, India', description: 'Shared apartment expenses.', budget: 100000,
    totalExpenses: 16400, youAreOwed: 0, youOwe: 780, members,
    expenses: [{ id: 'e3', title: 'Electricity bill', amount: 2400, paidBy: 'Arjun Mehta', splitCount: 4, date: 'Mar 2, 2025', icon: 'flash' }],
  },
];

export function getGroup(id: string | undefined) {
  return MOCK_GROUPS.find((group) => group.id === id);
}
