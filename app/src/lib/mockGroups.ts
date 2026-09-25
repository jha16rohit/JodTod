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
  icon: 'restaurant' | 'flash' | 'film' | 'bed' | 'car';
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
    totalExpenses: 24850,
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
      { id: 'e1', title: "Dinner at Bruno's", amount: 2850, date: 'Apr 16, 2025', paidBy: 'you', splitCount: 4, icon: 'restaurant' },
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
    totalExpenses: 18400,
    youAreOwed: 0,
    youOwe: 680,
    members: [
      { id: 'm1', name: 'Rohit', email: 'rohit@example.com', role: 'Admin', isYou: true, avatar: 'https://i.pravatar.cc/100?img=12' },
      { id: 'm2', name: 'Ishaan', email: 'ishaan@example.com', role: 'Member', avatar: 'https://i.pravatar.cc/100?img=11' },
      { id: 'm3', name: 'Divya', email: 'divya@example.com', role: 'Member', avatar: 'https://i.pravatar.cc/100?img=26' },
      { id: 'm4', name: 'Aditi', email: 'aditi@example.com', role: 'Member', avatar: 'https://i.pravatar.cc/100?img=45' },
    ],
    expenses: [
      { id: 'e1', title: 'Groceries', amount: 3200, date: 'Sep 2, 2025', paidBy: 'you', splitCount: 4, icon: 'restaurant' },
      { id: 'e2', title: 'Internet Bill', amount: 999, date: 'Sep 1, 2025', paidBy: 'Ishaan', splitCount: 4, icon: 'flash' },
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
