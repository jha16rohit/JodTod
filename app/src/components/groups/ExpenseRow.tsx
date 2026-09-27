import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, inr } from './ui';
import type { Expense } from '@/lib/mockGroups';

export const EXPENSE_ICONS: Record<Expense['icon'], { icon: keyof typeof Ionicons.glyphMap; colors: [string, string] }> = {
  restaurant: { icon: 'restaurant', colors: ['#FF9A8B', '#FF6A88'] },
  flash: { icon: 'flash', colors: ['#F6D365', '#FDA085'] },
  film: { icon: 'film', colors: ['#A18CD1', '#FBC2EB'] },
  bed: { icon: 'bed', colors: ['#4FACFE', '#00A9E0'] },
  car: { icon: 'car', colors: ['#84FAB0', '#8FD3F4'] },
};

export function groupExpensesByDate(expenses: Expense[]) {
  const map = new Map<string, Expense[]>();
  for (const e of expenses) {
    if (!map.has(e.date)) map.set(e.date, []);
    map.get(e.date)!.push(e);
  }
  return Array.from(map.entries());
}

export function ExpenseRow({ expense: e }: { expense: Expense }) {
  return (
    <TouchableOpacity activeOpacity={0.8}>
      <View
        className="flex-row items-center justify-between rounded-2xl border border-white/50 px-4 py-3.5"
        style={{ backgroundColor: 'rgba(255,255,255,0.35)' }}
      >
        <View className="flex-row items-center gap-3 flex-1">
          <LinearGradient
            colors={EXPENSE_ICONS[e.icon].colors}
            style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={EXPENSE_ICONS[e.icon].icon} size={19} color="#fff" />
          </LinearGradient>
          <View className="flex-1">
            <Text className="text-sm font-bold" style={{ color: colors.textDark }} numberOfLines={1}>
              {e.title}
            </Text>
            <Text className="text-[12px]" style={{ color: colors.textMuted }}>
              Paid by {e.paidBy === 'you' ? 'you' : e.paidBy} • {e.splitCount} people
            </Text>
          </View>
        </View>
        <Text className="text-[15px] font-extrabold" style={{ color: colors.textDark }}>
          {inr(e.amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
