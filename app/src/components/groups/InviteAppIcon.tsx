import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './ui';

type InviteAppIconProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
};

export function InviteAppIcon({ icon, label, color, onPress }: InviteAppIconProps) {
  return (
    <TouchableOpacity onPress={onPress} className="items-center flex-1">
      <View
        className="items-center justify-center rounded-2xl mb-1.5"
        style={{ width: 52, height: 52, backgroundColor: 'rgba(255,255,255,0.35)', borderWidth: 1, borderColor: colors.inputBorder }}
      >
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text className="text-[11px] font-semibold" style={{ color: colors.textMuted }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
