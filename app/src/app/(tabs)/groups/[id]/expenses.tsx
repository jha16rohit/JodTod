import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BubbleBackdrop, ScreenHeader, colors } from '@/components/groups/ui';
import { FilterTabs } from '@/components/groups/FilterTabs';
import { ExpenseRow, groupExpensesByDate } from '@/components/groups/ExpenseRow';
import { useAuth } from '@/context/AuthContext';
import {
  fetchGroupDetail,
  fetchGroupExpenses,
  type Expense as ApiExpense,
} from '@/services/groups.api';
import { expensesOf } from '@/lib/groupAdapters';
import type { Expense } from '@/lib/groupAdapters';

type FilterTab = 'All' | 'My Expenses' | 'By Day' | 'By Category';
const TABS: readonly FilterTab[] = ['All', 'My Expenses', 'By Day', 'By Category'];
const PAGE = 50;

export default function GroupExpenses() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const groupId = Array.isArray(id) ? id[0] : (id as string);
  const [tab, setTab] = useState<FilterTab>('All');
  const [groupName, setGroupName] = useState('Expenses');
  const [rows, setRows] = useState<ApiExpense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadPage = useCallback(async (offset: number) => {
    if (!groupId) {
      setError('Group not found.');
      setLoading(false);
      return;
    }
    if (offset === 0) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }
    try {
      // Group name + one expense page in parallel (independent).
      const [group, page] = offset === 0
        ? await Promise.all([fetchGroupDetail(groupId), fetchGroupExpenses(groupId, PAGE, 0)])
        : [null, await fetchGroupExpenses(groupId, PAGE, offset)];
      if (!mountedRef.current) return;
      if (offset === 0) {
        if (!group) {
          setError('Group not found.');
          setRows([]);
          return;
        }
        setGroupName(group.name);
      }
      setRows((prev) => (offset === 0 ? page.expenses : [...prev, ...page.expenses]));
      setTotal(page.total);
    } catch (e) {
      if (!mountedRef.current) return;
      if (offset === 0) {
        setError(e instanceof Error ? e.message : 'Could not load expenses.');
        setRows([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      void loadPage(0);
      return () => {
        mountedRef.current = false;
      };
    }, [loadPage]),
  );

  const myId = user?.id ?? null;
  const all: Expense[] = useMemo(() => expensesOf(rows, myId), [rows, myId]);

  const expenses = useMemo(() => {
    if (tab === 'My Expenses') return all.filter((e) => e.paidBy === 'you');
    return all;
  }, [all, tab]);

  return (
    <BubbleBackdrop>
      <ScreenHeader
        title={groupName}
        subtitle="Expenses"
        rightIcon="add"
        onRightPress={() =>
          router.push(`/add-expense?groupId=${groupId}` as any)
        }
      />

      <View className="px-5">
        <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 100 }}>
        {loading ? (
          <View className="items-center justify-center mt-20">
            <ActivityIndicator size="small" color={colors.textDark} />
            <Text className="mt-3 text-sm" style={{ color: colors.textMuted }}>
              Loading expenses…
            </Text>
          </View>
        ) : error ? (
          <View className="items-center justify-center mt-20">
            <Text className="text-sm" style={{ color: colors.textMuted }}>
              {error}
            </Text>
            <TouchableOpacity
              onPress={() => void loadPage(0)}
              activeOpacity={0.7}
              className="mt-4 rounded-full px-5 py-2.5"
              style={{ backgroundColor: colors.brandDark }}
            >
              <Text className="text-[13px] font-bold text-white">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : expenses.length === 0 ? (
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

        {!loading && !error && rows.length < total ? (
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={loadingMore}
            onPress={() => void loadPage(rows.length)}
            className="mt-2 items-center rounded-full border-2 py-3"
            style={{ borderColor: colors.brandDark }}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={colors.brandDark} />
            ) : (
              <Text className="text-[13px] font-bold" style={{ color: colors.brandDark }}>
                Load more ({total - rows.length} remaining)
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </BubbleBackdrop>
  );
}
