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

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  return (
    <View className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={require('../../assets/images/jodtod/plan-trips-login.png')}
          className="h-[320px] px-6 pt-[50px]"
          resizeMode="cover"
        >
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white items-center justify-center mb-5"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#0B3D62" />
          </TouchableOpacity>

          <Text className="text-2xl font-bold text-[#10032f] mb-1.5">
            Hey, you're back!
          </Text>
          <Text className="text-sm text-[#0B3D62] leading-5">
            {/* Login to continue managing{'\n'}your trips and expenses */}
            Log in to keep tracking {'\n'} your trips and expenses.
          </Text>
        </ImageBackground>

        <View className="bg-white -mt-[30px] rounded-t-[28px] px-6 pt-8 pb-10">
         <Text
  className="text-2xl font-bold text-[#180a5c] mb-4"
  style={{ letterSpacing: 0.8 }}
>
  Login to your account
</Text>

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
              placeholder="Enter your password"
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

          <View className="flex-row items-center justify-between mb-6">
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View
                className={
                  rememberMe
                    ? 'w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-[#20A374] items-center justify-center mr-2 bg-[#20A374]'
                    : 'w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-[#20A374] items-center justify-center mr-2'
                }
              >
                {rememberMe && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>
              <Text className="text-[13px] text-[#3A5468]">Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text className="text-[13px] text-[#20A374] font-semibold">
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="bg-[#1E8F6F] rounded-xl h-[52px] items-center justify-center mb-6"
            onPress={() => router.push('/(tabs)' as any)}
          >
            <Text className="text-white text-base font-bold">Login</Text>
          </TouchableOpacity>

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
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text className="text-[13px] text-[#20A374] font-bold">Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}