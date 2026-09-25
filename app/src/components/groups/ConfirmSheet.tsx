import { Text, TouchableOpacity, View, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientCTA, colors } from './ui';

type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant?: 'solid' | 'danger';
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmSheet({
  visible,
  title,
  message,
  icon,
  variant = 'solid',
  confirmLabel,
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  const iconBg = variant === 'danger' ? colors.dangerBg : colors.successBg;
  const iconFg = variant === 'danger' ? colors.danger : colors.brandDark;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(11,61,98,0.4)' }}>
        <View className="bg-white rounded-t-[28px] px-5 pt-5 pb-8">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: iconBg }}>
              <Ionicons name={icon} size={19} color={iconFg} />
            </View>
            <Text className="text-base font-bold" style={{ color: colors.textDark }}>
              {title}
            </Text>
          </View>
          <Text className="text-[13px] mb-6 leading-5" style={{ color: colors.textMuted }}>
            {message}
          </Text>
          <View style={{ gap: 10 }}>
            <GradientCTA variant={variant} icon={null} onPress={onConfirm}>
              <Text className="text-white text-[14px] font-bold">{confirmLabel}</Text>
            </GradientCTA>
            <TouchableOpacity onPress={onClose} className="items-center py-3">
              <Text className="text-[14px] font-semibold" style={{ color: colors.textMuted }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
