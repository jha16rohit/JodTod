import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  BubbleBackdrop,
  ScreenHeader,
  colors,
  inr,
} from '@/components/groups/ui';
import { getGroup, Expense } from '@/lib/mockGroups';

type FilterTab = 'All' | 'My Expenses' | 'By Day' | 'By Category';
const TABS: FilterTab[] = ['All', 'My Expenses', 'By Day', 'By Category'];

const ICONS: Record<Expense['icon'], { icon: keyof typeof Ionicons.glyphMap; colors: [string, string] }> = {
  restaurant: { icon: 'restaurant', colors: ['#FF9A8B', '#FF6A88'] },
  flash: { icon: 'flash', colors: ['#F6D365', '#FDA085'] },
  film: { icon: 'film', colors: ['#A18CD1', '#FBC2EB'] },
  bed: { icon: 'bed', colors: ['#4FACFE', '#00A9E0'] },
  car: { icon: 'car', colors: ['#84FAB0', '#8FD3F4'] },
};

export default function GroupExpenses() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = getGroup(id as string);
  const [tab, setTab] = useState<FilterTab>('All');

  const expenses = useMemo(() => {
    if (!group) return [];
    if (tab === 'My Expenses') return group.expenses.filter((e) => e.paidBy === 'you');
    return group.expenses;
  }, [group, tab]);

  if (!group) return null;

  return (
    <BubbleBackdrop>
      <ScreenHeader title={group.name} subtitle="Expenses" rightIcon="add" onRightPress={() => {}} />

      <View className="px-5">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
          {TABS.map((t) => {
            const active = t === tab;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                className="px-4 h-9 rounded-full items-center justify-center border"
                style={{
                  backgroundColor: active ? colors.brand : 'rgba(255,255,255,0.5)',
                  borderColor: active ? colors.brand : colors.inputBorder,
                }}
              >
                <Text className="text-[13px] font-semibold" style={{ color: active ? '#fff' : colors.textMuted }}>
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 100 }}>
        {expenses.length === 0 ? (
          <View className="items-center justify-center mt-20">
            <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
            <Text className="mt-3 text-sm" style={{ color: colors.textMuted }}>
              No expenses yet
            </Text>
          </View>
        ) : (
          groupByDate(expenses).map(([date, items]) => (
            <View key={date} style={{ marginBottom: 18 }}>
              <Text className="text-[12px] font-bold mb-2" style={{ color: colors.textMuted }}>
                {date}
              </Text>
              <View style={{ gap: 10 }}>
                {items.map((e) => (
                  <TouchableOpacity key={e.id} activeOpacity={0.8}>
                    <View
                      className="flex-row items-center justify-between rounded-2xl border border-white/50 px-4 py-3.5"
                      style={{ backgroundColor: 'rgba(255,255,255,0.6)' }}
                    >
                      <View className="flex-row items-center gap-3 flex-1">
                        <LinearGradient
                          colors={ICONS[e.icon].colors}
                          style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Ionicons name={ICONS[e.icon].icon} size={19} color="#fff" />
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
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </BubbleBackdrop>
  );
}

function groupByDate(expenses: Expense[]) {
  const map = new Map<string, Expense[]>();
  for (const e of expenses) {
    if (!map.has(e.date)) map.set(e.date, []);
    map.get(e.date)!.push(e);
  }
  return Array.from(map.entries());
}
