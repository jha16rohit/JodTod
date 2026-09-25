import React from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const BACKDROP_OPACITY = 0.4;

export const ADD_ACTION_COLORS = {
  primaryGreen: '#4CD3A5',
  primaryGreenLight: 'rgba(76, 211, 165, 0.15)',
  primaryGreenBorder: 'rgba(76, 211, 165, 0.3)',
  brandTeal: '#00B894',
  brandTealDark: '#00896B',
  textDark: '#14212B',
  textMuted: '#4B5A66',
  textLight: '#8A94A6',
  danger: '#E85D5D',
  dangerBg: 'rgba(232,93,93,0.12)',
  white: '#FFFFFF',
  glassBg: 'rgba(255, 255, 255, 0.25)',
  glassBorder: 'rgba(255, 255, 255, 0.35)',
  glassBorderStrong: 'rgba(255, 255, 255, 0.5)',
  backdropBg: 'rgba(0, 0, 0, 0.4)',
  comingSoonBg: 'rgba(138, 148, 166, 0.15)',
  comingSoonText: '#8A94A6',
};

interface ActionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  iconBgColor: string;
  iconColor: string;
  borderColor?: string;
  isPrimary?: boolean;
  comingSoon?: boolean;
  onPress: () => void;
}

function ActionCard({
  icon,
  title,
  subtitle,
  iconBgColor,
  iconColor,
  borderColor,
  isPrimary = false,
  comingSoon = false,
  onPress,
}: ActionCardProps) {
  const pressScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = () => {
    pressScale.value = withSpring(0.96, { damping: 20, stiffness: 200 });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 20, stiffness: 200 });
    runOnJS(onPress)();
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      activeOpacity={1}
      className="w-full"
    >
      <Animated.View style={animatedStyle}>
        <View
          className="
            flex-row
            items-center
            gap-4
            p-4
            rounded-2xl
            border
            border-white/30
            bg-white/20
          "
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            borderColor: borderColor || 'rgba(255, 255, 255, 0.35)',
          }}
        >
          <BlurView intensity={20} tint="light" style={actionCardStyles.iconBlur} />
          <View
            className="items-center justify-center"
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: iconBgColor,
            }}
          >
            <Ionicons name={icon} size={22} color={iconColor} />
          </View>

          <View className="flex-1 min-w-0">
            <Text
              className="text-base font-bold"
              style={{ color: ADD_ACTION_COLORS.textDark }}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              className="mt-0.5 text-sm"
              style={{ color: ADD_ACTION_COLORS.textMuted }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          </View>

          {comingSoon && (
            <View className="px-3 py-1 rounded-full border border-white/20" style={{ backgroundColor: 'rgba(138, 148, 166, 0.15)' }}>
              <Text className="font-semibold text-[11px]" style={{ color: ADD_ACTION_COLORS.comingSoonText }}>
                Coming Soon
              </Text>
            </View>
          )}

          {!comingSoon && (
            <Ionicons name="chevron-forward" size={18} color={ADD_ACTION_COLORS.textLight} />
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const actionCardStyles = StyleSheet.create({
  iconBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
});

export interface AddActionBottomSheetProps {
  visible: boolean;
  groupName: string;
  onClose: () => void;
  onAddExpense: () => void;
  onAddSettlement: () => void;
  onAddMember: () => void;
  onScanReceipt: () => void;
}

export default function AddActionBottomSheet({
  visible,
  groupName,
  onClose,
  onAddExpense,
  onAddSettlement,
  onAddMember,
  onScanReceipt,
}: AddActionBottomSheetProps) {
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const handleOpacity = useSharedValue(0);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      // Reset values before animating in
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;
      handleOpacity.value = 0;
      setIsMounted(true);

      translateY.value = withSpring(0, { damping: 22, stiffness: 160 });
      backdropOpacity.value = withTiming(BACKDROP_OPACITY, { duration: 200 });
      handleOpacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, { damping: 25, stiffness: 180 });
      backdropOpacity.value = withTiming(0, { duration: 150 });
      handleOpacity.value = withTiming(0, { duration: 100 });
      // Don't call onClose here - parent already handles closing
      // Use setTimeout to unmount after animation completes
      const timer = setTimeout(() => {
        setIsMounted(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleStyle = useAnimatedStyle(() => ({
    opacity: handleOpacity.value,
  }));

  // Use isMounted instead of reading shared value during render
  if (!visible && !isMounted) {
    return null;
  }

  const handleBackdropPress = () => {
    onClose();
  };

  const handleClosePress = () => {
    onClose();
  };

  return (
    <TouchableOpacity onPress={handleBackdropPress} activeOpacity={1} className="absolute inset-0 z-50">
      <Animated.View
        className="absolute inset-0"
        style={[sheetStyles.backdrop, backdropStyle]}
        pointerEvents="box-none"
      />

      <Animated.View
        className="absolute left-0 right-0 bottom-0 overflow-hidden"
        style={[
          sheetStyles.sheetContainer,
          sheetStyle,
          { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
        ]}
        pointerEvents="box-only"
      >
        <Animated.View style={[sheetStyles.dragHandleContainer, handleStyle]}>
          <View className="w-10 h-1.5 rounded-full bg-white/50" />
        </Animated.View>

        <BlurView intensity={80} tint="light" className="absolute inset-0" style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }} />

        <View
          className="px-5"
          style={{
            paddingTop: 8,
            paddingBottom: insets.bottom + 20,
          }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-[#14212B]" numberOfLines={1}>
              Add to {groupName}
            </Text>
            <TouchableOpacity
              onPress={handleClosePress}
              activeOpacity={0.7}
              className="w-10 h-10 rounded-full items-center justify-center border border-white/30 bg-white/30"
            >
              <Ionicons name="close" size={20} color="#14212B" />
            </TouchableOpacity>
          </View>

          <View className="gap-3 mb-4">
            <ActionCard
              icon="receipt-outline"
              title="Add Expense"
              subtitle="Record a new expense"
              iconBgColor="rgba(76, 211, 165, 0.15)"
              iconColor="#4CD3A5"
              borderColor="rgba(76, 211, 165, 0.3)"
              isPrimary
              onPress={onAddExpense}
            />

            <ActionCard
              icon="card-outline"
              title="Add Settlement"
              subtitle="Mark a payment as settled"
              iconBgColor="rgba(0, 184, 148, 0.12)"
              iconColor="#00896B"
              borderColor="rgba(0, 184, 148, 0.25)"
              onPress={onAddSettlement}
            />

            <ActionCard
              icon="person-add-outline"
              title="Add Member"
              subtitle="Invite someone to the trip"
              iconBgColor="rgba(79, 172, 254, 0.12)"
              iconColor="#3268A6"
              borderColor="rgba(79, 172, 254, 0.25)"
              onPress={onAddMember}
            />

            <ActionCard
              icon="scan-outline"
              title="Scan Receipt"
              subtitle="Extract details with OCR"
              iconBgColor="rgba(138, 148, 166, 0.12)"
              iconColor="#8A94A6"
              borderColor="rgba(138, 148, 166, 0.2)"
              comingSoon
              onPress={onScanReceipt}
            />
          </View>

          <TouchableOpacity
            onPress={handleClosePress}
            activeOpacity={0.8}
            className="w-full"
          >
            <View className="flex-row items-center justify-center py-3.5 rounded-2xl border border-white/30 bg-white/20">
              <Text className="text-base font-bold text-[#14212B]">Cancel</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetContainer: {
    overflow: 'hidden',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
});