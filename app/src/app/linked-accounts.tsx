import { View, Text, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LinkedAccounts() {
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
          <Text className="text-[22px] font-extrabold text-[#0B3D62]">Linked Accounts</Text>
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

        {/* Content */}
        <View className="space-y-8">
          {/* Google */}
          <View className="flex items-center gap-3 py-3 rounded-[12px] bg-white/50 backdrop-blur border border-white/20">
            <View className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
              <Ionicons name="logo-google" size={24} color="#EA4335" />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-[#14212B]">Google</Text>
              <Text className="mt-0.5 text-[12px] text-[#6B7280]">Connected</Text>
            </View>
          </View>

          {/* Phone */}
          <View className="flex items-center gap-3 py-3 rounded-[12px] bg-white/50 backdrop-blur border border-white/20">
            <View className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
              <Ionicons name="call-outline" size={24} color="#0B3D62" />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-[#14212B]">Phone Number</Text>
              <Text className="mt-0.5 text-[12px] text-[#6B7280]">Not connected</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}