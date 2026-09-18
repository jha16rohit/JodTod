import { View, Text, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width: SCREEN_W } = Dimensions.get('window');

export default function PersonalInformation() {
  const router = useRouter();
  const userName = 'Rohit';
  const userEmail = 'rohit@example.com';
  const userPhone = '+91 98765 43210';

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
      <View className="flex-1 relative z-10 p-6">
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
          <Text className="text-[22px] font-extrabold text-[#0B3D62]">Personal Information</Text>
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

        {/* Profile Photo */}
        <View className="mb-6 align-center">
          <Image
            source={require('../../assets/images/jodtod/people.png')}
            className="h-64 w-64 rounded-full object-cover border-2 border-white/30 shadow-lg"
          />
        </View>

        {/* Name */}
        <View className="mb-4">
          <Text className="text-[15px] font-medium text-[#0B3D62] mb-2">Name</Text>
          <Text className="text-[22px] font-extrabold text-[#14212B]">{userName}</Text>
          <TouchableOpacity
            className="mt-2 flex items-center gap-2 text-[13px] underline text-[#00B894]"
          >
            <Ionicons name="create" size={16} color="#00B894" />
            <Text>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Email */}
        <View className="mb-4">
          <Text className="text-[15px] font-medium text-[#0B3D62] mb-2">Email</Text>
          <Text className="text-[15px] text-[#4B5A66]">{userEmail}</Text>
          <TouchableOpacity
            className="mt-2 flex items-center gap-2 text-[13px] underline text-[#00B894]"
          >
            <Ionicons name="create" size={16} color="#00B894" />
            <Text>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Phone */}
        <View className="mb-6">
          <Text className="text-[15px] font-medium text-[#0B3D62] mb-2">Phone Number</Text>
          <Text className="text-[15px] text-[#4B5A66]">{userPhone}</Text>
          <TouchableOpacity
            className="mt-2 flex items-center gap-2 text-[13px] underline text-[#00B894]"
          >
            <Ionicons name="create" size={16} color="#00B894" />
            <Text>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}