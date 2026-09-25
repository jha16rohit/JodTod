import { Image, Text, TouchableOpacity, View } from 'react-native';
import { GlassCard, StatusPill, colors } from './ui';
import { BalanceSummary } from './BalanceSummary';
import { MemberStack } from './MemberStack';
import type { Group } from '@/lib/mockGroups';

type GroupCardProps = {
  group: Group;
  onPress: () => void;
};

export function GroupCard({ group, onPress }: GroupCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <GlassCard>
        <View style={{ padding: 16 }}>
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-3">
              <Image source={{ uri: group.coverImage }} style={{ width: 56, height: 56, borderRadius: 16 }} />
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
            <MemberStack members={group.members} max={3} size={28} />
            <BalanceSummary youAreOwed={group.youAreOwed} youOwe={group.youOwe} variant="row" />
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}
