import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import {
  BubbleBackdrop,
  ScreenHeader,
  GlassCard,
  ActionRow,
  Avatar,
  StatusPill,
  colors,
} from '@/components/groups/ui';
import { ConfirmSheet } from '@/components/groups/ConfirmSheet';
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
          <GlassCard style={{ marginBottom: 18 }}>
            <View className="flex-row items-center justify-between px-4 py-4">
              <View className="flex-row items-center gap-3 flex-1">
                <Avatar name={group.name} size={46} photoUri={group.coverImage} />
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

        <GlassCard style={{ marginBottom: 18 }}>
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

        <GlassCard>
          <View style={{ paddingHorizontal: 16 }}>
            <ActionRow icon="archive-outline" label="Archive Group" onPress={() => setSheet('archive')} />
            <View>
              <ActionRow icon="trash-outline" label="Delete Group" danger onPress={() => setSheet('delete')} />
            </View>
          </View>
        </GlassCard>
      </ScrollView>

      {/* Archive / Delete confirmation sheet */}
      <ConfirmSheet
        visible={!!sheet}
        title={sheet === 'archive' ? 'Archive Group' : 'Delete Group'}
        message={
          sheet === 'archive'
            ? 'Move this group to archive. You can restore it later.'
            : 'This will permanently delete this group and all its data. This action cannot be undone.'
        }
        icon={sheet === 'archive' ? 'archive-outline' : 'trash-outline'}
        variant={sheet === 'delete' ? 'danger' : 'solid'}
        confirmLabel={sheet === 'archive' ? 'Archive Group' : 'Delete Group'}
        onConfirm={() => {
          setSheet(null);
          router.replace('/(tabs)/groups' as any);
        }}
        onClose={() => setSheet(null)}
      />
    </BubbleBackdrop>
  );
}
