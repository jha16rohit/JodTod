import { View, Text, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassCard, GradientCTA, ActionRow, GlassLayers, ScreenBackground, cardShadow, colors } from '@/components/groups/ui';
import { StatusPill } from '@/components/groups/ui';
import { MemberStack } from '@/components/groups/MemberStack';
import { BalanceSummary } from '@/components/groups/BalanceSummary';
import { getGroup } from '@/lib/mockGroups';

const { width: SCREEN_W } = Dimensions.get('window');

export default function GroupDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = getGroup(id as string);

  if (!group) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <Text style={{ color: colors.textMuted }}>Group not found</Text>
      </View>
    );
  }

  const base = `/(tabs)/groups/${group.id}`;

  return (
    <View className="flex-1">
      <ScreenBackground />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Cover header — real group photo */}
        <View style={{ width: SCREEN_W, height: 220 }}>
          <Image source={{ uri: group.coverImage }} style={{ flex: 1 }} resizeMode="cover" />
          <View className="absolute inset-0" style={{ backgroundColor: 'rgba(11,61,98,0.15)' }} pointerEvents="none" />
          <View className="absolute inset-x-0 flex-row items-center justify-between px-5" style={{ paddingTop: insets.top + 10 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full items-center justify-center border border-white/60 overflow-hidden"
              style={[cardShadow, { backgroundColor: 'rgba(255,255,255,0.01)' }]}
            >
              <GlassLayers radius={20} />
              <View className="absolute inset-0 bg-white/20" />
              <Ionicons name="chevron-back" size={20} color={colors.textDark} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`${base}/settings` as any)}
              className="w-10 h-10 rounded-full items-center justify-center border border-white/60 overflow-hidden"
              style={[cardShadow, { backgroundColor: 'rgba(255,255,255,0.01)' }]}
            >
              <GlassLayers radius={20} />
              <View className="absolute inset-0 bg-white/20" />
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textDark} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Overview card, starting below the cover so the full photo stays visible */}
        <View style={{ marginTop: 14, paddingHorizontal: 20 }}>
          <GlassCard className="rounded-[24px]">
            <View style={{ padding: 20 }}>
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xl font-extrabold" style={{ color: colors.textDark }}>
                  {group.name}
                </Text>
                <StatusPill status={group.status} />
              </View>

              <View className="flex-row items-center gap-1.5 mb-1">
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                <Text className="text-[12.5px]" style={{ color: colors.textMuted }}>
                  {group.dateRange}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5 mb-3">
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text className="text-[12.5px]" style={{ color: colors.textMuted }}>
                  {group.destination}
                </Text>
              </View>

              <Text className="text-[13px] mb-4" style={{ color: colors.textMuted }}>
                {group.description}
              </Text>

              {/* Member avatars */}
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => router.push(`${base}/members` as any)}
              >
                <MemberStack members={group.members} max={4} size={30} />
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Balance boxes — standalone below the card, no box-in-box */}
          <View style={{ marginTop: 12 }}>
            <BalanceSummary
              youAreOwed={group.youAreOwed}
              youOwe={group.youOwe}
              totalExpenses={group.totalExpenses}
              variant="cards"
            />
          </View>

          {/* Quick links */}
          <View style={{ marginTop: 16 }}>
            <GlassCard>
              <View style={{ paddingHorizontal: 16 }}>
                <ActionRow icon="receipt-outline" label="Expenses" onPress={() => router.push(`${base}/expenses` as any)} />
                <ActionRow icon="people-outline" label="Members" onPress={() => router.push(`${base}/members` as any)} />
                <ActionRow icon="pie-chart-outline" label="Budget" onPress={() => router.push(`${base}/edit` as any)} />
                <ActionRow icon="bar-chart-outline" label="Reports" onPress={() => router.push(`${base}/expenses` as any)} />
                <View className="border-b-0">
                  <ActionRow icon="settings-outline" label="Group Settings" onPress={() => router.push(`${base}/settings` as any)} />
                </View>
              </View>
            </GlassCard>
          </View>

          <View style={{ marginTop: 20 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {}}
              className="flex-row items-center justify-center"
              style={{ height: 52, borderRadius: 26, backgroundColor: colors.dangerBg, gap: 8 }}
            >
              <Ionicons name="log-out-outline" size={17} color={colors.danger} />
              <Text className="text-[14px] font-bold" style={{ color: colors.danger }}>
                Leave Group
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
