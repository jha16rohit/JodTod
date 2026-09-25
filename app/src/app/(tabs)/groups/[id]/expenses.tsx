import { useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BubbleBackdrop, ScreenHeader, colors } from '@/components/groups/ui';
import { FilterTabs } from '@/components/groups/FilterTabs';
import { ExpenseRow, groupExpensesByDate } from '@/components/groups/ExpenseRow';
import { getGroup } from '@/lib/mockGroups';

type FilterTab = 'All' | 'My Expenses' | 'By Day' | 'By Category';
const TABS: readonly FilterTab[] = ['All', 'My Expenses', 'By Day', 'By Category'];

export default function GroupExpenses() {
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
        <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
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
          groupExpensesByDate(expenses).map(([date, items]) => (
            <View key={date} style={{ marginBottom: 18 }}>
              <Text className="text-[12px] font-bold mb-2" style={{ color: colors.textMuted }}>
                {date}
              </Text>
              <View style={{ gap: 10 }}>
                {items.map((e) => (
                  <ExpenseRow key={e.id} expense={e} />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </BubbleBackdrop>
  );
}
