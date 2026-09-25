import { Text, View } from 'react-native';
import { Avatar, colors } from './ui';

type StackMember = { id: string; name: string; avatar?: string };

type MemberStackProps = {
  members: StackMember[];
  max?: number;
  size?: number;
};

export function MemberStack({ members, max = 3, size = 28 }: MemberStackProps) {
  const visible = members.slice(0, max);
  const extra = members.length - max;
  return (
    <View className="flex-row" style={{ marginLeft: 2 }}>
      {visible.map((m, i) => (
        <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
          <Avatar name={m.name} size={size} photoUri={m.avatar} />
        </View>
      ))}
      {extra > 0 && (
        <View
          className="items-center justify-center rounded-full border-2 border-white"
          style={{ width: size, height: size, marginLeft: -10, backgroundColor: colors.neutralBg }}
        >
          <Text className="text-[10px] font-bold" style={{ color: colors.textMuted }}>
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
}
