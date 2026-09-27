import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BubbleBackdrop, ScreenHeader, GlassCard, colors } from '@/components/groups/ui';
import { MemberRow, SheetMenuItem } from '@/components/groups/MemberRow';
import { useAuth } from '@/context/AuthContext';
import { fetchGroupDetail, type GroupDetail } from '@/services/groups.api';
import { membersOf } from '@/lib/groupAdapters';
import type { Member } from '@/lib/mockGroups';

export default function GroupMembers() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const groupId = Array.isArray(id) ? id[0] : (id as string);
  const [menuFor, setMenuFor] = useState<Member | null>(null);
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const group = await fetchGroupDetail(groupId);
      if (!mountedRef.current) return;
      if (!group) {
        setError('Group not found.');
        setDetail(null);
      } else {
        setDetail(group);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : 'Could not load members.');
      setDetail(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      void load();
      return () => {
        mountedRef.current = false;
      };
    }, [load]),
  );

  const base = `/(tabs)/groups/${groupId}`;
  const members = detail ? membersOf(detail, user?.id ?? null) : [];

  return (
    <BubbleBackdrop>
      <ScreenHeader
        title="Members"
        rightIcon="person-add-outline"
        onRightPress={() => router.push(`${base}/invite` as any)}
      />

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Invite banner */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`${base}/invite` as any)}>
          <View
            className="flex-row items-center rounded-2xl px-4 py-3.5 mb-5"
            style={{ backgroundColor: colors.successBg }}
          >
            <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#fff' }}>
              <Ionicons name="share-social-outline" size={18} color={colors.brandDark} />
            </View>
            <View className="flex-1">
              <Text className="text-[13.5px] font-bold" style={{ color: colors.brandDark }}>
                Invite members
              </Text>
              <Text className="text-[12px]" style={{ color: colors.textMuted }}>
                Share a link or QR code to invite people to this group.
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator size="small" color={colors.textDark} />
          </View>
        ) : error || !detail ? (
          <View className="items-center py-12">
            <Text className="text-[14px]" style={{ color: colors.textMuted }}>
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
        ) : (
          <GlassCard>
            <View style={{ paddingHorizontal: 16 }}>
              {members.map((m, i) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  isLast={i === members.length - 1}
                  onMenuPress={setMenuFor}
                />
              ))}
            </View>
          </GlassCard>
        )}
      </ScrollView>

      {/* Manage-member action sheet (display only: role changes land with moderation tooling) */}
      <Modal visible={!!menuFor} transparent animationType="fade" onRequestClose={() => setMenuFor(null)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setMenuFor(null)}
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(11,61,98,0.35)' }}
        >
          <View className="bg-white rounded-t-[28px] px-5 pt-5 pb-8">
            <Text className="text-base font-bold mb-4" style={{ color: colors.textDark }}>
              {menuFor?.name}
            </Text>
            <SheetMenuItem icon="shield-checkmark-outline" label="Make Co-Admin" onPress={() => setMenuFor(null)} />
            <SheetMenuItem icon="person-remove-outline" label="Remove from group" danger onPress={() => setMenuFor(null)} />
            <SheetMenuItem icon="close" label="Cancel" onPress={() => setMenuFor(null)} />
          </View>
        </TouchableOpacity>
      </Modal>
    </BubbleBackdrop>
  );
}
