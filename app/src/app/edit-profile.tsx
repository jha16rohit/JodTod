import { View, Text, Image, TouchableOpacity, ScrollView, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';

const { width: SCREEN_W } = Dimensions.get('window');

export default function EditProfile() {
  const router = useRouter();
  const [name, setName] = useState('Rohit');
  const [email, setEmail] = useState('rohit@example.com');
  const [phone, setPhone] = useState('');

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
          <Text className="text-[22px] font-extrabold text-[#0B3D62]">Edit Profile</Text>
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
        <View className="mb-6">
          <Text className="text-[16px] font-medium text-[#0B3D62] mb-2">Profile Photo</Text>
          <View className="relative">
            <Image
              source={require('../../assets/images/jodtod/people.png')}
              className="h-80 w-80 rounded-full object-cover border-2 border-white/30 shadow-lg"
            />
            <TouchableOpacity
              className="absolute bottom-2 right-2"
            >
              <View
                className="h-14 w-14 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center"
              >
                <Ionicons
                  name="camera"
                  size={20}
                  color="#FFFFFF"
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Name Input */}
        <View className="mb-4">
          <Text className="text-[15px] font-medium text-[#0B3D62] mb-2">Name</Text>
          <TextInput
            className="w-full rounded-[12px] border border-white/30 bg-white/50 px-4 py-3 focus:outline-none focus:border-[#00B894] transition-colors"
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#6B7280"
          />
        </View>

        {/* Email Input */}
        <View className="mb-4">
          <Text className="text-[15px] font-medium text-[#0B3D62] mb-2">Email</Text>
          <TextInput
            className="w-full rounded-[12px] border border-white/30 bg-white/50 px-4 py-3 focus:outline-none focus:border-[#00B894] transition-colors"
            placeholder="rohit@example.com"
            value={email}
            onChangeText={setEmail}
            placeholderTextColor="#6B7280"
            secureTextEntry={false}
          />
        </View>

        {/* Phone Input */}
        <View className="mb-6">
          <Text className="text-[15px] font-medium text-[#0B3D62] mb-2">Phone Number</Text>
          <TextInput
            className="w-full rounded-[12px] border border-white/30 bg-white/50 px-4 py-3 focus:outline-none focus:border-[#00B894] transition-colors"
            placeholder="+91 XXXX XXX XXX"
            value={phone}
            onChangeText={setPhone}
            placeholderTextColor="#6B7280"
            keyboardType="phone-pad"
          />
        </View>

        {/* Save Button */}
        <View className="mt-8">
          <TouchableOpacity
            className="w-full rounded-[24px] bg-[#00B894] py-3 flex items-center justify-center"
          >
            <Text className="text-[16px] font-bold text-white">Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}