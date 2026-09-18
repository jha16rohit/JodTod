import { View, Text, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HelpSupport() {
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
          <Text className="text-[22px] font-extrabold text-[#0B3D62]">Help & Support</Text>
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
        <ScrollView>
          {/* FAQs */}
          <View className="mb-4 pb-4 border-b border-white/10">
            <Text className="text-[18px] font-medium text-[#0B3D62]">FAQs</Text>
            <View className="mt-3 space-y-2">
              <View className="px-3 py-2 rounded bg-white/5 flex items-center justify-between">
                <Text className="text-[14px] text-[#14212B]">How do I reset my password?</Text>
                <Ionicons name="chevron-forward" size={16} color="#6B7280" />
              </View>
              <View className="px-3 py-2 rounded bg-white/5 flex items-center justify-between">
                <Text className="text-[14px] text-[#14212B]">How do I delete my account?</Text>
                <Ionicons name="chevron-forward" size={16} color="#6B7280" />
              </View>
            </View>
          </View>

          {/* Contact Support */}
          <View className="mt-6 pt-6 border-t border-white/10">
            <Text className="text-[18px] font-bold text-[#0B3D62] mb-4">Contact Support</Text>
            <View className="space-y-3">
              <View className="px-3 py-2 rounded bg-white/5 flex items-center gap-3">
                <Ionicons name="mail-outline" size={20} color="#6B7280" />
                <Text className="text-[14px] text-[#14212B]">support@jodtod.com</Text>
              </View>
              <View className="px-3 py-2 rounded bg-white/5 flex items-center gap-3">
                <Ionicons name="phone-portrait" size={20} color="#6B7280" />
                <Text className="text-[14px] text-[#14212B]">+91 98765 43210</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}