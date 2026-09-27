import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassCard, ActionRow, GlassLayers, ScreenBackground, Avatar, cardShadow, colors } from '@/components/groups/ui';
import { StatusPill } from '@/components/groups/ui';
import { MemberStack } from '@/components/groups/MemberStack';
import { BalanceSummary } from '@/components/groups/BalanceSummary';
import { useAuth } from '@/context/AuthContext';
import {
  fetchGroupDetail,
  fetchGroupExpenses,
  leaveGroup,
  type GroupDetail,
} from '@/services/groups.api';
import {
  avatarOrEmpty,
  groupStatusOf,
} from '@/lib/groupAdapters';

const { width: SCREEN_W } = Dimensions.get('window');

export default function GroupDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const groupId = Array.isArray(id) ? id[0] : (id as string);

  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!groupId) {
      setError('Group not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Detail + full expense list in parallel (independent).
      const [group, expenses] = await Promise.all([
        fetchGroupDetail(groupId),
        fetchGroupExpenses(groupId, 100, 0),
      ]);
      if (!mountedRef.current) return;
      if (!group) {
        setError('Group not found.');
        setDetail(null);
        return;
      }
      setDetail(group);
      setTotalExpenses(
        expenses.expenses.reduce((sum, row) => sum + Number(row.amount), 0),
      );
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : 'Could not load group.');
      setDetail(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [groupId]);

  // Single focus-driven load (focus fires on mount too — no double fetch).
  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      void load();
      return () => {
        mountedRef.current = false;
      };
    }, [load]),
  );

  const handleLeave = useCallback(() => {
    if (!groupId || leaving) return;
    Alert.alert(
      'Leave group?',
      'You will no longer see this group or its balances.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => void (async () => {
            setLeaving(true);
            try {
              await leaveGroup(groupId);
              router.replace('/(tabs)/groups' as any);
            } catch (e) {
              if (mountedRef.current) {
                setError(e instanceof Error ? e.message : 'Could not leave the group.');
              }
            } finally {
              if (mountedRef.current) setLeaving(false);
            }
          })(),
        },
      ],
    );
  }, [groupId, leaving, router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.textDark} />
        <Text className="mt-3 text-sm" style={{ color: colors.textMuted }}>
          Loading group…
        </Text>
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: colors.bg }}>
        <Text className="text-center" style={{ color: colors.textMuted }}>
          {error ?? 'Group not found'}
        </Text>
        <TouchableOpacity
          onPress={() => void load()}
          activeOpacity={0.7}
          className="mt-4 rounded-full px-5 py-2.5"
          style={{ backgroundColor: colors.brandDark }}
        >
          <Text className="text-[13px] font-bold text-white">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const myNet = Number(detail.my_net);
  const base = `/(tabs)/groups/${detail.id}`;
  const stackMembers = detail.members.map((m) => ({
    id: m.user_id,
    name: m.display_name,
    avatar: avatarOrEmpty(m.avatar_url) || undefined,
  }));

  return (
    <View className="flex-1">
      <ScreenBackground />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={{ width: SCREEN_W, height: 220, backgroundColor: 'rgba(255,255,255,0.25)' }}>
          <View className="absolute inset-0" style={{ backgroundColor: 'rgba(11,61,98,0.15)' }} pointerEvents="none" />
          <View className="absolute inset-0 items-center justify-center">
            <Avatar name={detail.name} size={84} photoUri={detail.image_url ?? undefined} />
          </View>
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

        <View style={{ marginTop: 14, paddingHorizontal: 20 }}>
          <GlassCard className="rounded-[24px]">
            <View style={{ padding: 20 }}>
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xl font-extrabold" style={{ color: colors.textDark }}>
                  {detail.name}
                </Text>
                <StatusPill status={groupStatusOf(detail)} />
              </View>

              {detail.description ? (
                <Text className="text-[13px] mb-4" style={{ color: colors.textMuted }}>
                  {detail.description}
                </Text>
              ) : null}

              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => router.push(`${base}/members` as any)}
              >
                <MemberStack members={stackMembers} max={4} size={30} />
              </TouchableOpacity>
              <Text className="mt-2 text-[12px]" style={{ color: colors.textMuted }}>
                {detail.member_count === 1 ? '1 member' : `${detail.member_count} members`}
              </Text>
            </View>
          </GlassCard>

          <View style={{ marginTop: 12 }}>
            <BalanceSummary
              youAreOwed={myNet > 0 ? myNet : 0}
              youOwe={myNet < 0 ? -myNet : 0}
              totalExpenses={totalExpenses}
              variant="cards"
            />
          </View>

          <View style={{ marginTop: 16 }}>
            <GlassCard>
              <View style={{ paddingHorizontal: 16 }}>
                <ActionRow icon="receipt-outline" label="Expenses" onPress={() => router.push(`${base}/expenses` as any)} />
                <ActionRow icon="people-outline" label="Members" onPress={() => router.push(`${base}/members` as any)} />
                <ActionRow icon="person-add-outline" label="Invite Members" onPress={() => router.push(`${base}/invite` as any)} />
                <ActionRow icon="cash-outline" label="Settle Up" onPress={() => router.push({ pathname: '/(tabs)/settle', params: { groupId: detail.id } } as any)} />
                <ActionRow icon="time-outline" label="Settlement History" onPress={() => router.push({ pathname: '/(tabs)/settle', params: { groupId: detail.id } } as any)} />
                <View className="border-b-0">
                  <ActionRow icon="settings-outline" label="Group Settings" onPress={() => router.push(`${base}/settings` as any)} />
                </View>
              </View>
            </GlassCard>
          </View>

          <View style={{ marginTop: 20 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={leaving}
              onPress={() => void handleLeave()}
              className="flex-row items-center justify-center"
              style={{ height: 52, borderRadius: 26, backgroundColor: colors.dangerBg, gap: 8, opacity: leaving ? 0.6 : 1 }}
            >
              {leaving ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Ionicons name="log-out-outline" size={17} color={colors.danger} />
              )}
              <Text className="text-[14px] font-bold" style={{ color: colors.danger }}>
                {leaving ? 'Leaving…' : 'Leave Group'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
