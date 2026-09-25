import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, colors } from './ui';
import type { Member } from '@/lib/mockGroups';

export function RoleBadge({ role }: { role: Member['role'] }) {
  const isAdmin = role === 'Admin';
  return (
    <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: isAdmin ? colors.successBg : colors.neutralBg }}>
      <Text className="text-[10px] font-bold" style={{ color: isAdmin ? colors.brandDark : colors.textMuted }}>
        {role}
      </Text>
    </View>
  );
}

type MemberRowProps = {
  member: Member;
  isLast: boolean;
  onMenuPress?: (member: Member) => void;
};

export function MemberRow({ member: m, isLast, onMenuPress }: MemberRowProps) {
  return (
    <View
      className="flex-row items-center justify-between py-3.5"
      style={{
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: 'rgba(255,255,255,0.5)',
      }}
    >
      <View className="flex-row items-center gap-3 flex-1">
        <Avatar name={m.name} size={42} photoUri={m.avatar} />
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

      {!m.isYou && onMenuPress && (
        <TouchableOpacity onPress={() => onMenuPress(m)} className="p-2">
          <Ionicons name="ellipsis-vertical" size={17} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export function SheetMenuItem({
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
