import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  BubbleBackdrop,
  ScreenHeader,
  GlassCard,
  ActionRow,
  Avatar,
  StatusPill,
  GradientCTA,
  colors,
} from '@/components/groups/ui';
import { getGroup } from '@/lib/mockGroups';

type SheetMode = 'archive' | 'delete' | null;

export default function GroupSettings() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = getGroup(id as string);
  const [sheet, setSheet] = useState<SheetMode>(null);

  if (!group) return null;
  const base = `/(tabs)/groups/${group.id}`;

  return (
    <BubbleBackdrop>
      <ScreenHeader title="Group Settings" />

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Group summary strip */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`${base}/edit` as any)}>
          <GlassCard style={{ backgroundColor: '#fff', marginBottom: 18 }}>
            <View className="flex-row items-center justify-between px-4 py-4">
              <View className="flex-row items-center gap-3 flex-1">
                <Avatar name={group.name} size={46} />
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-[15px] font-bold" style={{ color: colors.textDark }}>
                      {group.name}
                    </Text>
                    <StatusPill status={group.status} />
                  </View>
                  <Text className="text-[12px]" style={{ color: colors.textMuted }}>
                    {group.dateRange}
                  </Text>
                  <Text className="text-[12px]" style={{ color: colors.textMuted }}>
                    {group.destination}
                  </Text>
                </View>
              </View>
              <Text className="text-[12px] font-bold" style={{ color: colors.brandDark }}>
                Change
              </Text>
            </View>
          </GlassCard>
        </TouchableOpacity>

        <GlassCard style={{ backgroundColor: '#fff', marginBottom: 18 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <ActionRow icon="create-outline" label="Edit Group Details" onPress={() => router.push(`${base}/edit` as any)} />
            <ActionRow icon="people-outline" label="Manage Members" onPress={() => router.push(`${base}/members` as any)} />
            <ActionRow icon="link-outline" label="Invite via Link" onPress={() => router.push(`${base}/invite` as any)} />
            <ActionRow icon="qr-code-outline" label="Invite via QR Code" onPress={() => router.push(`${base}/invite` as any)} />
            <ActionRow icon="wallet-outline" label="Budget Settings" onPress={() => router.push(`${base}/edit` as any)} />
            <View>
              <ActionRow icon="notifications-outline" label="Notification Preferences" onPress={() => {}} />
            </View>
          </View>
        </GlassCard>

        <GlassCard style={{ backgroundColor: '#fff' }}>
          <View style={{ paddingHorizontal: 16 }}>
            <ActionRow icon="archive-outline" label="Archive Group" onPress={() => setSheet('archive')} />
            <View>
              <ActionRow icon="trash-outline" label="Delete Group" danger onPress={() => setSheet('delete')} />
            </View>
          </View>
        </GlassCard>
      </ScrollView>

      {/* Archive / Delete confirmation sheet */}
      <Modal visible={!!sheet} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(11,61,98,0.4)' }}>
          <View className="bg-white rounded-t-[28px] px-5 pt-5 pb-8">
            {sheet === 'archive' ? (
              <>
                <View className="flex-row items-center gap-3 mb-2">
                  <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: colors.successBg }}>
                    <Ionicons name="archive-outline" size={19} color={colors.brandDark} />
                  </View>
                  <Text className="text-base font-bold" style={{ color: colors.textDark }}>
                    Archive Group
                  </Text>
                </View>
                <Text className="text-[13px] mb-6 leading-5" style={{ color: colors.textMuted }}>
                  Move this group to archive. You can restore it later.
                </Text>
              </>
            ) : (
              <>
                <View className="flex-row items-center gap-3 mb-2">
                  <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: colors.dangerBg }}>
                    <Ionicons name="trash-outline" size={19} color={colors.danger} />
                  </View>
                  <Text className="text-base font-bold" style={{ color: colors.textDark }}>
                    Delete Group
                  </Text>
                </View>
                <Text className="text-[13px] mb-6 leading-5" style={{ color: colors.textMuted }}>
                  This will permanently delete this group and all its data. This action cannot be undone.
                </Text>
              </>
            )}

            <View style={{ gap: 10 }}>
              <GradientCTA
                variant={sheet === 'delete' ? 'danger' : 'solid'}
                icon={null}
                onPress={() => {
                  setSheet(null);
                  router.replace('/(tabs)/groups' as any);
                }}
              >
                <Text className="text-white text-[14px] font-bold">
                  {sheet === 'archive' ? 'Archive Group' : 'Delete Group'}
                </Text>
              </GradientCTA>
              <TouchableOpacity onPress={() => setSheet(null)} className="items-center py-3">
                <Text className="text-[14px] font-semibold" style={{ color: colors.textMuted }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </BubbleBackdrop>
  );
}
