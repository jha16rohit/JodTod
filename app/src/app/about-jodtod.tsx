import { View, Text, TouchableOpacity, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AboutJodTod() {
  const router = useRouter();

  return (
    <SafeAreaView
      edges={['bottom']}
      className="flex-1 bg-[#F5F9FC]"
    >
      {/* Background */}
      <Image
        source={require('../../assets/images/jodtod/background_animation.png')}
        resizeMode="cover"
        className="absolute inset-0 h-full w-full"
      />

      {/* Content wrapper */}
      <View className="flex-1 relative p-6">
        {/* Header */}
        <View className="mb-6 flex justify-between items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex items-center"
          >
            <Ionicons
              name="arrow-back-outline"
              size={24}
              color="#6B7280"
            />
          </TouchableOpacity>
          <Text className="text-[22px] font-extrabold text-[#0B3D62]">About JodTod</Text>
          <TouchableOpacity
            className="flex items-center gap-2"
          >
            <Ionicons
              name="close"
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>

        {/* About content */}
        <View className="space-y-8">
          <View>
            <Text className="text-[28px] font-extrabold text-[#0B3D62]">JodTod</Text>
            <Text className="mt-1 text-[16px] text-[#4B5A66]">Your trip expense manager</Text>
          </View>

          <View className="mt-6 pt-6 border-t border-white/10">
            <Text className="text-[18px] font-bold text-[#0B3D62]">Version</Text>
            <Text className="mt-1 text-[16px] text-[#4B5A66]">Version 1.0.0</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}