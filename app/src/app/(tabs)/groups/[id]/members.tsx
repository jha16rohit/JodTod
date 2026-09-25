import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BubbleBackdrop, ScreenHeader, GlassCard, colors } from '@/components/groups/ui';
import { MemberRow, SheetMenuItem } from '@/components/groups/MemberRow';
import { getGroup, Member } from '@/lib/mockGroups';

export default function GroupMembers() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = getGroup(id as string);
  const [menuFor, setMenuFor] = useState<Member | null>(null);

  if (!group) return null;
  const base = `/(tabs)/groups/${group.id}`;

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

        <GlassCard>
          <View style={{ paddingHorizontal: 16 }}>
            {group.members.map((m, i) => (
              <MemberRow
                key={m.id}
                member={m}
                isLast={i === group.members.length - 1}
                onMenuPress={setMenuFor}
              />
            ))}
          </View>
        </GlassCard>
      </ScrollView>

      {/* Manage-member action sheet */}
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
