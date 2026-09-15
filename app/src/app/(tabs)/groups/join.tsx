import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import {
  BubbleBackdrop,
  ScreenHeader,
  LabeledField,
  GradientCTA,
  colors,
} from '@/components/groups/ui';

export default function JoinGroup() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const canJoin = inviteCode.trim().length > 0;

  const handleJoin = () => {
    if (!canJoin) return;
    router.replace('/(tabs)/groups' as any);
  };

  return (
    <BubbleBackdrop>
      <ScreenHeader title="Join a Group" />
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="mb-5 text-[14px]" style={{ color: colors.textMuted }}>
          Enter the invite code or link shared by a group member.
        </Text>
        <LabeledField
          label="Invite Code or Link"
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="e.g., ABC123"
          autoCapitalize="none"
        />
        <View style={{ marginTop: 8 }}>
          <GradientCTA onPress={handleJoin} disabled={!canJoin} icon={null}>
            <Text className="text-white text-[15px] font-bold">Join Group</Text>
          </GradientCTA>
        </View>
      </ScrollView>
    </BubbleBackdrop>
  );
}
