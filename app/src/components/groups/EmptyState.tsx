import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg';
import { GradientCTA, colors } from './ui';

type EmptyStateProps = {
  onCreate: () => void;
};

function BackpackIllustration() {
  return (
    <View style={{ width: 240, height: 190, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={240} height={190} viewBox="0 0 240 190">
        {/* soft mint blob behind — same theme as successBg */}
        <Ellipse cx={120} cy={100} rx={96} ry={72} fill="#E3F1EB" />
        <Ellipse cx={66} cy={118} rx={36} ry={30} fill="#EAF5F0" />
        <Ellipse cx={176} cy={84} rx={44} ry={40} fill="#DDEBE4" opacity={0.8} />

        {/* backpack */}
        <G>
          {/* top handle */}
          <Path
            d="M102 34 C102 18 112 16 120 16 C128 16 138 18 138 34"
            fill="none"
            stroke="#0C4A3C"
            strokeWidth={7}
            strokeLinecap="round"
          />
          {/* main body */}
          <Rect x={82} y={32} width={76} height={104} rx={26} fill="#6EA5A1" />
          {/* right highlight */}
          <Rect x={118} y={32} width={40} height={104} rx={20} fill="#8CC2BD" opacity={0.85} />
          {/* left shade */}
          <Path
            d="M82 58 C82 44 92 32 106 32 L104 136 C92 136 82 124 82 110 Z"
            fill="#4E7F7C"
            opacity={0.9}
          />
          {/* white zip tag */}
          <Rect x={110} y={62} width={12} height={20} rx={6} fill="#F4FAF8" />
          <Rect x={114.2} y={68} width={3.6} height={6} rx={1.8} fill="#0B3D62" opacity={0.55} />

          {/* front pocket */}
          <Rect x={78} y={92} width={64} height={48} rx={12} fill="#7FBFB9" />
          <Rect x={78} y={92} width={64} height={48} rx={12} fill="none" stroke="#E3F1EB" strokeWidth={2} opacity={0.6} />
          {/* pocket bottom — dark navy like reference */}
          <Path
            d="M78 112 L142 112 L142 128 C142 135 136 140 129 140 L91 140 C84 140 78 135 78 128 Z"
            fill="#0E3A53"
          />
          <Rect x={78} y={108} width={64} height={8} fill="#EAF5F0" opacity={0.9} />
        </G>
      </Svg>
    </View>
  );
}

export function EmptyState({ onCreate }: EmptyStateProps) {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center px-8" style={{ marginTop: -40 }}>
      <BackpackIllustration />

      <Text
        className="font-extrabold mb-2 text-center"
        style={{ color: colors.textDark, fontSize: 22, lineHeight: 28 }}
      >
        No groups yet
      </Text>
      <Text
        className="text-center mb-8 leading-5"
        style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}
      >
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
