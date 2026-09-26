import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BubbleBackdrop, GlassLayers, cardShadow, colors } from '@/components/groups/ui';
import { FilterTabs } from '@/components/groups/FilterTabs';
import { GroupCard } from '@/components/groups/GroupCard';
import { EmptyState } from '@/components/groups/EmptyState';
import { MOCK_GROUPS } from '@/lib/mockGroups';

type FilterTab = 'All' | 'Active' | 'Completed' | 'Archived';
const TABS: readonly FilterTab[] = ['All', 'Active', 'Completed', 'Archived'];

// Flip this to `true` to preview the Empty State screen (or just clear
// MOCK_GROUPS in lib/mockGroups.ts once wired to real data).
const FORCE_EMPTY_STATE = false;

export default function GroupsList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FilterTab>('All');

  const groups = FORCE_EMPTY_STATE ? [] : MOCK_GROUPS;

  const filtered = useMemo(() => {
    return groups.filter((g) => {
      const matchesTab = tab === 'All' || g.status === tab;
      const matchesQuery = g.name.toLowerCase().includes(query.toLowerCase());
      return matchesTab && matchesQuery;
    });
  }, [groups, tab, query]);

  return (
    <BubbleBackdrop>
      {/* paddingTop uses the device safe-area inset + a little extra, so the
          "+" button always sits clear of the notch/status bar instead of
          being pinned to the very top edge on tall Android phones. */}
      <View className="flex-1 px-5" style={{ paddingTop: insets.top + 14 }}>
        {/* Header — + button only, right aligned */}
        <View className="flex-row items-center justify-end mb-4">
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/groups/create' as any)}
            activeOpacity={0.9}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.brand,
              shadowColor: colors.brand,
              shadowOpacity: 0.35,
              shadowRadius: 9,
              shadowOffset: { width: 0, height: 5 },
              elevation: 4,
            }}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {groups.length > 0 && (
          <>
            {/* Search */}
            <View className="mb-3 rounded-full" style={[cardShadow, { backgroundColor: 'rgba(255,255,255,0.01)' }]}>
              <View className="h-12 flex-row items-center overflow-hidden rounded-full border border-white/70 px-4">
                <GlassLayers radius={24} />
                <View className="absolute inset-0 bg-white/25" />
                <Ionicons name="search" size={18} color={colors.textMuted} />
                <TextInput
                  className="ml-2.5 flex-1 text-[14px]"
                  style={{ color: colors.textDark }}
                  placeholder="Search groups..."
                  placeholderTextColor={colors.faint}
                  value={query}
                  onChangeText={setQuery}
                />
              </View>
            </View>

            {/* Filter tabs */}
            <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
          </>
        )}

        {groups.length === 0 ? (
          <EmptyState onCreate={() => router.push('/(tabs)/groups/create' as any)} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100, gap: 14 }}
          >
            {filtered.map((g) => (
              <GroupCard key={g.id} group={g} onPress={() => router.push(`/(tabs)/groups/${g.id}` as any)} />
            ))}
            {filtered.length === 0 && (
              <Text className="text-center mt-10 text-sm" style={{ color: colors.textMuted }}>
                No groups match &quot;{query}&quot;
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </BubbleBackdrop>
  );
}
