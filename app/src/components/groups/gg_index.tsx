import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  BubbleBackdrop,
  GlassCard,
  GlassInput,
  GradientCTA,
  Avatar,
  StatusPill,
  colors,
  inr,
} from '@/components/groups/ui';
import { MOCK_GROUPS, Group } from '@/lib/mockGroups';

type FilterTab = 'All' | 'Active' | 'Completed' | 'Archived';
const TABS: FilterTab[] = ['All', 'Active', 'Completed', 'Archived'];

// Flip this to `true` to preview the Empty State screen (or just clear
// MOCK_GROUPS in lib/mockGroups.ts once wired to real data).
const FORCE_EMPTY_STATE = false;

export default function GroupsList() {
  const router = useRouter();
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
      <View className="flex-1 px-5 pt-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-extrabold" style={{ color: colors.headerTitle }}>
            Groups
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/groups/create' as any)}
            style={{
              shadowColor: colors.brand,
              shadowOpacity: 0.4,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 5,
            }}
          >
            <LinearGradient
              colors={[colors.brandLight, colors.brand, colors.brandDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {groups.length > 0 && (
          <>
            {/* Search */}
            <GlassInput style={{ marginBottom: 14 }}>
              <View className="flex-row items-center px-3.5 h-11">
                <Ionicons name="search" size={17} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  className="flex-1 text-sm"
                  style={{ color: colors.textDark }}
                  placeholder="Search groups..."
                  placeholderTextColor="rgba(20,33,43,0.4)"
                  value={query}
                  onChangeText={setQuery}
                />
              </View>
            </GlassInput>

            {/* Filter tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
            >
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
                    <Text
                      className="text-[13px] font-semibold"
                      style={{ color: active ? '#fff' : colors.textMuted }}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {groups.length === 0 ? (
          <EmptyState onCreate={() => router.push('/(tabs)/groups/create' as any)} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, gap: 14 }}>
            {filtered.map((g) => (
              <GroupCard key={g.id} group={g} onPress={() => router.push(`/(tabs)/groups/${g.id}` as any)} />
            ))}
            {filtered.length === 0 && (
              <Text className="text-center mt-10 text-sm" style={{ color: colors.textMuted }}>
                No groups match "{query}"
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </BubbleBackdrop>
  );
}

function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const extra = group.members.length - 3;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <GlassCard>
        <View style={{ padding: 16 }}>
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-3">
              <Avatar name={group.name} size={44} />
              <View>
                <Text className="text-[15px] font-bold" style={{ color: colors.textDark }}>
                  {group.name}
                </Text>
                <Text className="text-[12px]" style={{ color: colors.textMuted }}>
                  {group.members.length} members
                </Text>
              </View>
            </View>
            <StatusPill status={group.status} />
          </View>

          <Text className="text-[12px] mb-3" style={{ color: colors.textMuted }}>
            {group.dateRange}
          </Text>

          <View className="flex-row items-center justify-between">
            <View className="flex-row" style={{ marginLeft: 2 }}>
              {group.members.slice(0, 3).map((m, i) => (
                <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                  <Avatar name={m.name} size={28} />
                </View>
              ))}
              {extra > 0 && (
                <View
                  className="items-center justify-center rounded-full border-2 border-white"
                  style={{ width: 28, height: 28, marginLeft: -10, backgroundColor: colors.neutralBg }}
                >
                  <Text className="text-[10px] font-bold" style={{ color: colors.textMuted }}>
                    +{extra}
                  </Text>
                </View>
              )}
            </View>

            {group.youAreOwed > 0 ? (
              <View className="items-end">
                <Text className="text-[11px]" style={{ color: colors.textMuted }}>You're owed</Text>
                <Text className="text-[15px] font-extrabold" style={{ color: colors.brandDark }}>
                  {inr(group.youAreOwed)}
                </Text>
              </View>
            ) : group.youOwe > 0 ? (
              <View className="items-end">
                <Text className="text-[11px]" style={{ color: colors.textMuted }}>You owe</Text>
                <Text className="text-[15px] font-extrabold" style={{ color: colors.danger }}>
                  {inr(group.youOwe)}
                </Text>
              </View>
            ) : (
              <View className="items-end">
                <Text className="text-[12px] font-semibold" style={{ color: colors.textMuted }}>Settled up</Text>
              </View>
            )}
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center px-8" style={{ marginTop: -40 }}>
      <View
        className="items-center justify-center rounded-full mb-6"
        style={{ width: 120, height: 120, backgroundColor: colors.successBg }}
      >
        <Ionicons name="bag-handle-outline" size={52} color={colors.brand} />
      </View>

      <Text className="text-lg font-extrabold mb-2" style={{ color: colors.textDark }}>
        No groups yet
      </Text>
      <Text className="text-[13px] text-center mb-8 leading-5" style={{ color: colors.textMuted }}>
        Create your first trip or join an existing group to start managing expenses together.
      </Text>

      <View style={{ width: '100%', gap: 12 }}>
        <GradientCTA onPress={onCreate} icon={null}>
          <Text className="text-white text-[15px] font-bold">Create a Group</Text>
        </GradientCTA>
        <GradientCTA variant="outline" onPress={() => router.push('/(tabs)/groups/join' as any)} icon={null}>
          <Text className="text-[15px] font-bold" style={{ color: colors.brandDark }}>
            Join with a Link / QR
          </Text>
        </GradientCTA>
      </View>
    </View>
  );
}
