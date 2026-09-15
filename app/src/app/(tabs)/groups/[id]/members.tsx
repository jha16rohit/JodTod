import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  BubbleBackdrop,
  ScreenHeader,
  GlassCard,
  Avatar,
  colors,
} from '@/components/groups/ui';
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
        onRightPress={() => router.push(`${base}/invites` as any)}
      />

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Invite banner */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`${base}/invites` as any)}>
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

        <GlassCard style={{ backgroundColor: '#fff' }}>
          <View style={{ paddingHorizontal: 16 }}>
            {group.members.map((m, i) => (
              <View
                key={m.id}
                className="flex-row items-center justify-between py-3.5"
                style={{
                  borderBottomWidth: i === group.members.length - 1 ? 0 : 1,
                  borderBottomColor: 'rgba(255,255,255,0.5)',
                }}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <Avatar name={m.name} size={42} />
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-bold" style={{ color: colors.textDark }}>
                        {m.name} {m.isYou ? '(You)' : ''}
                      </Text>
                      <RoleBadge role={m.role} />
                    </View>
                    <Text className="text-[12px]" style={{ color: colors.textMuted }} numberOfLines={1}>
                      {m.email}
                    </Text>
                  </View>
                </View>

                {!m.isYou && (
                  <TouchableOpacity onPress={() => setMenuFor(m)} className="p-2">
                    <Ionicons name="ellipsis-vertical" size={17} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
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
            <MenuItem icon="shield-checkmark-outline" label="Make Co-Admin" onPress={() => setMenuFor(null)} />
            <MenuItem icon="person-remove-outline" label="Remove from group" danger onPress={() => setMenuFor(null)} />
            <MenuItem icon="close" label="Cancel" onPress={() => setMenuFor(null)} />
          </View>
        </TouchableOpacity>
      </Modal>
    </BubbleBackdrop>
  );
}

function RoleBadge({ role }: { role: Member['role'] }) {
  const isYouAdmin = role === 'Admin';
  return (
    <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: isYouAdmin ? colors.successBg : colors.neutralBg }}>
      <Text className="text-[10px] font-bold" style={{ color: isYouAdmin ? colors.brandDark : colors.textMuted }}>
        {role}
      </Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} className="flex-row items-center gap-3 py-3">
      <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.textDark} />
      <Text className="text-sm font-semibold" style={{ color: danger ? colors.danger : colors.textDark }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
