import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  GlassCard,
  GradientCTA,
  Avatar,
  StatusPill,
  ActionRow,
  colors,
  inr,
} from '@/components/groups/ui';
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

  const extra = group.members.length - 4;
  const base = `/(tabs)/groups/${group.id}`;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Cover header */}
        <View style={{ width: SCREEN_W, height: 220 }}>
          <LinearGradient
            colors={['#0EA98A', '#0B7EA8', '#0B3D62']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          >
            <View className="flex-row items-center justify-between px-5" style={{ paddingTop: insets.top + 10 }}>
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
              >
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`${base}/settings` as any)}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Overview card, overlapping the header like the reference */}
        <View style={{ marginTop: -28, paddingHorizontal: 20 }}>
          <GlassCard style={{ backgroundColor: '#fff' }} className="rounded-[24px]">
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
                className="flex-row items-center mb-5"
                onPress={() => router.push(`${base}/members` as any)}
              >
                {group.members.slice(0, 4).map((m, i) => (
                  <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                    <Avatar name={m.name} size={30} />
                  </View>
                ))}
                {extra > 0 && (
                  <View
                    className="items-center justify-center rounded-full border-2 border-white"
                    style={{ width: 30, height: 30, marginLeft: -10, backgroundColor: colors.neutralBg }}
                  >
                    <Text className="text-[10px] font-bold" style={{ color: colors.textMuted }}>
                      +{extra}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Total expenses */}
              <View className="rounded-2xl px-4 py-3.5 mb-3" style={{ backgroundColor: colors.neutralBg }}>
                <Text className="text-[12px] mb-1" style={{ color: colors.textMuted }}>
                  Total Expenses
                </Text>
                <Text className="text-2xl font-extrabold" style={{ color: colors.textDark }}>
                  {inr(group.totalExpenses)}
                </Text>
              </View>

              {/* Owed / Owe split */}
              <View className="flex-row gap-3 mb-2">
                <View className="flex-1 rounded-2xl px-4 py-3" style={{ backgroundColor: colors.successBg }}>
                  <Text className="text-[12px] font-semibold mb-1" style={{ color: colors.brandDark }}>
                    You're owed
                  </Text>
                  <Text className="text-lg font-extrabold" style={{ color: colors.brandDark }}>
                    {inr(group.youAreOwed)}
                  </Text>
                </View>
                <View className="flex-1 rounded-2xl px-4 py-3" style={{ backgroundColor: colors.dangerBg }}>
                  <Text className="text-[12px] font-semibold mb-1" style={{ color: colors.danger }}>
                    You owe
                  </Text>
                  <Text className="text-lg font-extrabold" style={{ color: colors.danger }}>
                    {inr(group.youOwe)}
                  </Text>
                </View>
              </View>
            </View>
          </GlassCard>

          {/* Quick links */}
          <View style={{ marginTop: 16 }}>
            <GlassCard style={{ backgroundColor: '#fff' }}>
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
            <GradientCTA variant="outline" icon="log-out-outline" outlineColor={colors.danger} onPress={() => {}}>
              <Text className="text-[14px] font-bold" style={{ color: colors.danger }}>
                Leave Group
              </Text>
            </GradientCTA>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
