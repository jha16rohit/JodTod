import { View, Text, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AppSettings() {
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
          <Text className="text-[22px] font-extrabold text-[#0B3D62]">App Settings</Text>
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

        {/* Scrollable content */}
        <ScrollView className="space-y-8">
          {/* Language */}
          <View className="flex items-center justify-between">
            <Text className="text-[15px] font-medium text-[#0B3D62]">Language</Text>
            <Text className="text-[15px] text-[#6B7280]">English</Text>
          </View>

          {/* Privacy */}
          <View className="flex items-center justify-between my-4">
            <Text className="text-[15px] font-medium text-[#0B3D62]">Privacy</Text>
          </View>

          {/* Data */}
          <View className="flex items-center justify-between">
            <Text className="text-[15px] font-medium text-[#0B3D62]">Data</Text>
            <Text className="text-[15px] text-[#6B7280]">Manage</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}