import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Signup() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  return (
    <View className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={require('../../assets/images/jodtod/plan-trips-login.png')}
          className="h-[260px] px-6 pt-[50px]"
          resizeMode="cover"
        >
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white items-center justify-center mb-5"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#0B3D62" />
          </TouchableOpacity>

          <Text className="text-2xl font-bold text-[#0B3D62] mb-1.5">
            Create account
          </Text>
          <Text className="text-sm text-[#3A5468] leading-5">
            Sign up to start planning trips{'\n'}and splitting expenses with friends
          </Text>
        </ImageBackground>

        <View className="bg-white -mt-[30px] rounded-t-[28px] px-6 pt-8 pb-10">
          <Text className="text-xl font-bold text-[#0B3D62] mb-6">
            Create your account
          </Text>

          <Text className="text-[13px] text-[#3A5468] mb-2 font-semibold">
            Full name
          </Text>
          <View className="flex-row items-center border border-[#E2E8EC] rounded-xl px-3.5 h-[52px] mb-[18px]">
            <Ionicons
              name="person-outline"
              size={18}
              color="#20A374"
              style={{ marginRight: 10 }}
            />
            <TextInput
              className="flex-1 text-sm text-[#0B3D62]"
              placeholder="Enter your full name"
              placeholderTextColor="#A0A0A0"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          <Text className="text-[13px] text-[#3A5468] mb-2 font-semibold">
            Email address
          </Text>
          <View className="flex-row items-center border border-[#E2E8EC] rounded-xl px-3.5 h-[52px] mb-[18px]">
            <Ionicons
              name="mail-outline"
              size={18}
              color="#20A374"
              style={{ marginRight: 10 }}
            />
            <TextInput
              className="flex-1 text-sm text-[#0B3D62]"
              placeholder="Enter your email"
              placeholderTextColor="#A0A0A0"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Text className="text-[13px] text-[#3A5468] mb-2 font-semibold">
            Password
          </Text>
          <View className="flex-row items-center border border-[#E2E8EC] rounded-xl px-3.5 h-[52px] mb-[18px]">
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="#20A374"
              style={{ marginRight: 10 }}
            />
            <TextInput
              className="flex-1 text-sm text-[#0B3D62]"
              placeholder="Create a password"
              placeholderTextColor="#A0A0A0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color="#888"
              />
            </TouchableOpacity>
          </View>

          <Text className="text-[13px] text-[#3A5468] mb-2 font-semibold">
            Confirm password
          </Text>
          <View className="flex-row items-center border border-[#E2E8EC] rounded-xl px-3.5 h-[52px] mb-[18px]">
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="#20A374"
              style={{ marginRight: 10 }}
            />
            <TextInput
              className="flex-1 text-sm text-[#0B3D62]"
              placeholder="Re-enter your password"
              placeholderTextColor="#A0A0A0"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons
                name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color="#888"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="flex-row items-start mb-6"
            onPress={() => setAgreedToTerms(!agreedToTerms)}
          >
            <View
              className={
                agreedToTerms
                  ? 'w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-[#20A374] items-center justify-center mr-2.5 mt-0.5 bg-[#20A374]'
                  : 'w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-[#20A374] items-center justify-center mr-2.5 mt-0.5'
              }
            >
              {agreedToTerms && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text className="flex-1 text-[13px] text-[#3A5468] leading-[19px]">
              I agree to the{' '}
              <Text className="text-[#20A374] font-semibold">Terms of Service</Text> and{' '}
              <Text className="text-[#20A374] font-semibold">Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-[#1E8F6F] rounded-xl h-[52px] items-center justify-center mb-6"
            onPress={() => router.push('/(tabs)' as any)}
          >
            <Text className="text-white text-base font-bold">Sign Up</Text>
          </TouchableOpacity>

          <View className="flex-row items-center justify-center mb-4">
            <Image
              source={require('../../assets/images/jodtod/jodtod-text.png')}
              className="w-[110px] h-8"
              resizeMode="contain"
            />
          </View>

          <View className="flex-row items-center mb-5">
            <View className="flex-1 h-px bg-[#E2E8EC]" />
            <Text className="text-xs text-[#888] mx-3">or continue with</Text>
            <View className="flex-1 h-px bg-[#E2E8EC]" />
          </View>

          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity className="flex-1 flex-row items-center justify-center border border-[#E2E8EC] rounded-xl h-12 gap-2">
              <Ionicons name="logo-google" size={18} color="#DB4437" />
              <Text className="text-sm font-semibold text-[#0B3D62]">Google</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 flex-row items-center justify-center border border-[#E2E8EC] rounded-xl h-12 gap-2">
              <Ionicons name="logo-apple" size={20} color="#000" />
              <Text className="text-sm font-semibold text-[#0B3D62]">Apple</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mb-6">
            <Text className="text-[13px] text-[#3A5468]">
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text className="text-[13px] text-[#20A374] font-bold">Login</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row bg-[#EAF6F1] rounded-2xl p-3.5 items-start gap-3">
            <View className="w-[34px] h-[34px] rounded-full bg-white items-center justify-center">
              <Ionicons name="shield-checkmark" size={20} color="#20A374" />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-bold text-[#0B3D62] mb-0.5">
                Your data is safe with us
              </Text>
              <Text className="text-xs text-[#5A7385] leading-[17px]">
                We never share your personal information with anyone.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}