import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientCTA, colors } from './ui';

type EmptyStateProps = {
  onCreate: () => void;
};

export function EmptyState({ onCreate }: EmptyStateProps) {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center px-8" style={{ marginTop: -40 }}>
      <View
        className="items-center justify-center rounded-full mb-6"
        style={{ width: 120, height: 120, backgroundColor: colors.successBg }}
      >
        <Ionicons name="bag-handle-outline" size={52} color={colors.brand} />
      </View>

      <Text className="text-lg font-extrabold mb-2" style={{ color: colors.textDark }}>
        No groups yet
      </Text>
      <Text className="text-[13px] text-center mb-8 leading-5" style={{ color: colors.textMuted }}>
        Create your first trip or join an existing group to start managing expenses together.
      </Text>

      <View style={{ width: '100%', gap: 12 }}>
        <GradientCTA onPress={onCreate} icon={null}>
          <Text className="text-white text-[15px] font-bold">Create a Group</Text>
        </GradientCTA>
        <GradientCTA variant="outline" onPress={() => router.push('/(tabs)/groups/join' as any)} icon={null}>
          <Text className="text-[15px] font-bold" style={{ color: colors.brandDark }}>
            Join with a Link / QR
          </Text>
        </GradientCTA>
      </View>
    </View>
  );
}
