// import { useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Image,
//   TouchableOpacity,
//   ScrollView,
//   ImageBackground,
// } from 'react-native';
// import { useRouter } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons';

// export default function Signup() {
//   const router = useRouter();
//   const [fullName, setFullName] = useState('');
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//   const [agreedToTerms, setAgreedToTerms] = useState(false);

//   return (
//     <View className="flex-1 bg-white">
//       <ScrollView showsVerticalScrollIndicator={false}>
//         <ImageBackground
//           source={require('../../assets/images/jodtod/plan-trips-login.png')}
//           className="h-[260px] px-6 pt-[50px]"
//           resizeMode="cover"
//         >
//           <TouchableOpacity
//             className="w-10 h-10 rounded-full bg-white items-center justify-center mb-5"
//             onPress={() => router.back()}
//           >
//             <Ionicons name="arrow-back" size={20} color="#0B3D62" />
//           </TouchableOpacity>

//           <Text className="text-2xl font-bold text-[#1a5d1b] mb-1.5">
//            Create a profile
//           </Text>
//           <Text className="text-sm text-[#3A5468] leading-5">
//             {/* Sign up to start planning trips{'\n'}and splitting expenses with friends */}
//             Sign up to plan trips{'\n'} and split bills {'\n'}with friends.
//           </Text>
//         </ImageBackground>

//         <View className="bg-white -mt-[30px] rounded-t-[28px] px-6 pt-8 pb-10">
//           <Text
//            className="text-2xl font-bold text-[#180a5c] mb-4"
//            style={{ letterSpacing: 0.8 }}
//              >
//            Create your account
//            </Text>

//           <Text className="text-[13px] text-[#3A5468] mb-2 font-semibold">
//             Full name
//           </Text>
//           <View className="flex-row items-center border border-[#E2E8EC] rounded-xl px-3.5 h-[52px] mb-[18px]">
//             <Ionicons
//               name="person-outline"
//               size={18}
//               color="#20A374"
//               style={{ marginRight: 10 }}
//             />
//             <TextInput
//               className="flex-1 text-sm text-[#0B3D62]"
//               placeholder="Enter your full name"
//               placeholderTextColor="#A0A0A0"
//               value={fullName}
//               onChangeText={setFullName}
//               autoCapitalize="words"
//             />
//           </View>

//           <Text className="text-[13px] text-[#3A5468] mb-2 font-semibold">
//             Email address
//           </Text>
//           <View className="flex-row items-center border border-[#E2E8EC] rounded-xl px-3.5 h-[52px] mb-[18px]">
//             <Ionicons
//               name="mail-outline"
//               size={18}
//               color="#20A374"
//               style={{ marginRight: 10 }}
//             />
//             <TextInput
//               className="flex-1 text-sm text-[#0B3D62]"
//               placeholder="Enter your email"
//               placeholderTextColor="#A0A0A0"
//               value={email}
//               onChangeText={setEmail}
//               keyboardType="email-address"
//               autoCapitalize="none"
//             />
//           </View>

//           <Text className="text-[13px] text-[#3A5468] mb-2 font-semibold">
//             Password
//           </Text>
//           <View className="flex-row items-center border border-[#E2E8EC] rounded-xl px-3.5 h-[52px] mb-[18px]">
//             <Ionicons
//               name="lock-closed-outline"
//               size={18}
//               color="#20A374"
//               style={{ marginRight: 10 }}
//             />
//             <TextInput
//               className="flex-1 text-sm text-[#0B3D62]"
//               placeholder="Create a password"
//               placeholderTextColor="#A0A0A0"
//               value={password}
//               onChangeText={setPassword}
//               secureTextEntry={!showPassword}
//             />
//             <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
//               <Ionicons
//                 name={showPassword ? 'eye-outline' : 'eye-off-outline'}
//                 size={18}
//                 color="#888"
//               />
//             </TouchableOpacity>
//           </View>

//           <Text className="text-[13px] text-[#3A5468] mb-2 font-semibold">
//             Confirm password
//           </Text>
//           <View className="flex-row items-center border border-[#E2E8EC] rounded-xl px-3.5 h-[52px] mb-[18px]">
//             <Ionicons
//               name="lock-closed-outline"
//               size={18}
//               color="#20A374"
//               style={{ marginRight: 10 }}
//             />
//             <TextInput
//               className="flex-1 text-sm text-[#0B3D62]"
//               placeholder="Re-enter your password"
//               placeholderTextColor="#A0A0A0"
//               value={confirmPassword}
//               onChangeText={setConfirmPassword}
//               secureTextEntry={!showConfirmPassword}
//             />
//             <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
//               <Ionicons
//                 name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
//                 size={18}
//                 color="#888"
//               />
//             </TouchableOpacity>
//           </View>

//           <TouchableOpacity
//             className="flex-row items-start mb-6"
//             onPress={() => setAgreedToTerms(!agreedToTerms)}
//           >
//             <View
//               className={
//                 agreedToTerms
//                   ? 'w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-[#20A374] items-center justify-center mr-2.5 mt-0.5 bg-[#20A374]'
//                   : 'w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-[#20A374] items-center justify-center mr-2.5 mt-0.5'
//               }
//             >
//               {agreedToTerms && <Ionicons name="checkmark" size={13} color="#fff" />}
//             </View>
//             <Text className="flex-1 text-[13px] text-[#3A5468] leading-[19px]">
//               I agree to the{' '}
//               <Text className="text-[#20A374] font-semibold">Terms of Service</Text> and{' '}
//               <Text className="text-[#20A374] font-semibold">Privacy Policy</Text>
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             className="bg-[#1E8F6F] rounded-xl h-[52px] items-center justify-center mb-6"
//             onPress={() => router.push('/(tabs)' as any)}
//           >
//             <Text className="text-white text-base font-bold">Sign Up</Text>
//           </TouchableOpacity>

//           <View className="flex-row items-center justify-center mb-4">
//             {/* <Image
//               source={require('../../assets/images/jodtod/jodtod-text.png')}
//               className="w-[110px] h-8"
//               resizeMode="contain"
//             /> */}
//           </View>

//           <View className="flex-row items-center mb-5">
//             <View className="flex-1 h-px bg-[#E2E8EC]" />
//             <Text className="text-xs text-[#888] mx-3">or continue with</Text>
//             <View className="flex-1 h-px bg-[#E2E8EC]" />
//           </View>

//           <View className="flex-row gap-3 mb-6">
//             <TouchableOpacity className="flex-1 flex-row items-center justify-center border border-[#E2E8EC] rounded-xl h-12 gap-2">
//               <Ionicons name="logo-google" size={18} color="#DB4437" />
//               <Text className="text-sm font-semibold text-[#0B3D62]">Google</Text>
//             </TouchableOpacity>
//             <TouchableOpacity className="flex-1 flex-row items-center justify-center border border-[#E2E8EC] rounded-xl h-12 gap-2">
//               <Ionicons name="logo-apple" size={20} color="#000" />
//               <Text className="text-sm font-semibold text-[#0B3D62]">Apple</Text>
//             </TouchableOpacity>
//           </View>

//           <View className="flex-row justify-center mb-6">
//             <Text className="text-[13px] text-[#3A5468]">
//               Already have an account?{' '}
//             </Text>
//             <TouchableOpacity onPress={() => router.push('/login')}>
//               <Text className="text-[13px] text-[#20A374] font-bold">Login</Text>
//             </TouchableOpacity>
//           </View>

//           {/* <View className="flex-row bg-[#EAF6F1] rounded-2xl p-3.5 items-start gap-3">
//             <View className="w-[34px] h-[34px] rounded-full bg-white items-center justify-center">
//               <Ionicons name="shield-checkmark" size={20} color="#20A374" />
//             </View>
//             <View className="flex-1">
          
//             </View> */}
//           {/* </View> */}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Same "liquid glass" palette as login.tsx
const GLOW_FROM = '#2DD4BF'; // teal
const GLOW_TO = '#8B5CF6'; // violet
const CTA_FROM = '#14B8A6'; // teal
const CTA_TO = '#0D9488'; // deep teal
const GLASS_BG = 'rgba(255,255,255,0.55)';
const GLASS_BG_STRONG = 'rgba(255,255,255,0.75)';
const TEXT_DARK = '#14212B';
const TEXT_MUTED = '#4B5A66';

function GlowBorder({
  children,
  radius = 14,
  borderWidth = 1.4,
  style,
  glow = true,
}: {
  children: React.ReactNode;
  radius?: number;
  borderWidth?: number;
  style?: any;
  glow?: boolean;
}) {
  return (
    <LinearGradient
      colors={[GLOW_FROM, GLOW_TO]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        { borderRadius: radius, padding: borderWidth },
        glow
          ? {
              shadowColor: GLOW_TO,
              shadowOpacity: 0.35,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 0 },
              elevation: 5,
            }
          : null,
        style,
      ]}
    >
      <View style={{ borderRadius: radius - borderWidth, overflow: 'hidden' }}>
        {children}
      </View>
    </LinearGradient>
  );
}

function GradientCTA({
  children,
  onPress,
  disabled,
  radius = 14,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  radius?: number;
}) {
  return (
    <GlowBorder radius={radius} borderWidth={1.4} glow={!disabled}>
      <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85}>
        <LinearGradient
          colors={disabled ? ['#D8DEE3', '#C6CDD3'] : [CTA_FROM, CTA_TO]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 52, alignItems: 'center', justifyContent: 'center' }}
        >
          {children}
        </LinearGradient>
      </TouchableOpacity>
    </GlowBorder>
  );
}

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
    <View className="flex-1" style={{ backgroundColor: '#FFFFFF' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={require('../../assets/images/jodtod/plan-trips-login.png')}
          className="h-[300px] px-6 pt-[50px]"
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.55)']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          <TouchableOpacity
            className="w-10 h-10 rounded-full items-center justify-center mb-5"
            style={{ backgroundColor: 'rgba(255,255,255,0.85)' }}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={CTA_TO} />
          </TouchableOpacity>

          <Text
            className="text-[28px] font-extrabold text-white mb-2"
            style={{
              letterSpacing: 0.3,
              textShadowColor: 'rgba(0,0,0,0.35)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 8,
            }}
          >
            Create a <Text style={{ color: GLOW_FROM }}>profile</Text>
          </Text>
          <Text
            className="text-[15px] text-white/90 leading-6"
            style={{
              letterSpacing: 0.2,
              textShadowColor: 'rgba(0,0,0,0.3)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 6,
            }}
          >
            Sign up to plan trips{'\n'}and split bills with friends.
          </Text>
        </ImageBackground>

        {/* Glass card, overlapping the header image */}
        <View style={{ marginTop: -40 }}>
          <LinearGradient
            colors={[GLOW_FROM, GLOW_TO]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 2, marginHorizontal: 24, borderRadius: 2, opacity: 0.9 }}
          />
          <BlurView
            intensity={50}
            tint="light"
            style={{
              borderBottomLeftRadius: 28,
              borderBottomRightRadius: 28,
              overflow: 'hidden',
            }}
          >
            <View
              className="px-6 pt-8 pb-10"
              style={{ backgroundColor: GLASS_BG_STRONG }}
            >
              <Text
                className="text-2xl font-bold mb-4"
                style={{ letterSpacing: 0.6, color: TEXT_DARK }}
              >
                Create your account
              </Text>

              <Text className="text-[13px] mb-2 font-semibold" style={{ color: TEXT_MUTED }}>
                Full name
              </Text>
              <GlowBorder radius={14} borderWidth={1.2} glow={false} style={{ marginBottom: 18 }}>
                <View
                  className="flex-row items-center px-3.5 h-[52px]"
                  style={{ backgroundColor: GLASS_BG }}
                >
                  <Ionicons name="person-outline" size={18} color={CTA_TO} style={{ marginRight: 10 }} />
                  <TextInput
                    className="flex-1 text-sm"
                    style={{ color: TEXT_DARK }}
                    placeholder="Enter your full name"
                    placeholderTextColor="rgba(20,33,43,0.4)"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              </GlowBorder>

              <Text className="text-[13px] mb-2 font-semibold" style={{ color: TEXT_MUTED }}>
                Email address
              </Text>
              <GlowBorder radius={14} borderWidth={1.2} glow={false} style={{ marginBottom: 18 }}>
                <View
                  className="flex-row items-center px-3.5 h-[52px]"
                  style={{ backgroundColor: GLASS_BG }}
                >
                  <Ionicons name="mail-outline" size={18} color={CTA_TO} style={{ marginRight: 10 }} />
                  <TextInput
                    className="flex-1 text-sm"
                    style={{ color: TEXT_DARK }}
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(20,33,43,0.4)"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </GlowBorder>

              <Text className="text-[13px] mb-2 font-semibold" style={{ color: TEXT_MUTED }}>
                Password
              </Text>
              <GlowBorder radius={14} borderWidth={1.2} glow={false} style={{ marginBottom: 18 }}>
                <View
                  className="flex-row items-center px-3.5 h-[52px]"
                  style={{ backgroundColor: GLASS_BG }}
                >
                  <Ionicons name="lock-closed-outline" size={18} color={CTA_TO} style={{ marginRight: 10 }} />
                  <TextInput
                    className="flex-1 text-sm"
                    style={{ color: TEXT_DARK }}
                    placeholder="Create a password"
                    placeholderTextColor="rgba(20,33,43,0.4)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={TEXT_MUTED}
                    />
                  </TouchableOpacity>
                </View>
              </GlowBorder>

              <Text className="text-[13px] mb-2 font-semibold" style={{ color: TEXT_MUTED }}>
                Confirm password
              </Text>
              <GlowBorder radius={14} borderWidth={1.2} glow={false} style={{ marginBottom: 18 }}>
                <View
                  className="flex-row items-center px-3.5 h-[52px]"
                  style={{ backgroundColor: GLASS_BG }}
                >
                  <Ionicons name="lock-closed-outline" size={18} color={CTA_TO} style={{ marginRight: 10 }} />
                  <TextInput
                    className="flex-1 text-sm"
                    style={{ color: TEXT_DARK }}
                    placeholder="Re-enter your password"
                    placeholderTextColor="rgba(20,33,43,0.4)"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={TEXT_MUTED}
                    />
                  </TouchableOpacity>
                </View>
              </GlowBorder>

              <TouchableOpacity
                className="flex-row items-start mb-6"
                onPress={() => setAgreedToTerms(!agreedToTerms)}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    borderWidth: 1.4,
                    borderColor: CTA_TO,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                    marginTop: 2,
                    backgroundColor: agreedToTerms ? CTA_FROM : 'transparent',
                  }}
                >
                  {agreedToTerms && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text className="flex-1 text-[13px] leading-[19px]" style={{ color: TEXT_MUTED }}>
                  I agree to the{' '}
                  <Text className="font-semibold" style={{ color: GLOW_TO }}>Terms of Service</Text> and{' '}
                  <Text className="font-semibold" style={{ color: GLOW_TO }}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              <View style={{ marginBottom: 24 }}>
                <GradientCTA onPress={() => router.push('/(tabs)' as any)}>
                  <Text className="text-white text-base font-bold">Sign Up</Text>
                </GradientCTA>
              </View>

              <View className="flex-row items-center mb-5">
                <View className="flex-1 h-px" style={{ backgroundColor: 'rgba(20,33,43,0.12)' }} />
                <Text className="text-xs mx-3" style={{ color: TEXT_MUTED }}>
                  or continue with
                </Text>
                <View className="flex-1 h-px" style={{ backgroundColor: 'rgba(20,33,43,0.12)' }} />
              </View>

              <View className="flex-row gap-3 mb-6">
                <GlowBorder radius={12} borderWidth={1.2} glow={false} style={{ flex: 1 }}>
                  <TouchableOpacity
                    className="flex-row items-center justify-center h-12 gap-2"
                    style={{ backgroundColor: GLASS_BG }}
                  >
                    <Ionicons name="logo-google" size={18} color="#DB4437" />
                    <Text className="text-sm font-semibold" style={{ color: TEXT_DARK }}>Google</Text>
                  </TouchableOpacity>
                </GlowBorder>
                <GlowBorder radius={12} borderWidth={1.2} glow={false} style={{ flex: 1 }}>
                  <TouchableOpacity
                    className="flex-row items-center justify-center h-12 gap-2"
                    style={{ backgroundColor: GLASS_BG }}
                  >
                    <Ionicons name="logo-apple" size={20} color={TEXT_DARK} />
                    <Text className="text-sm font-semibold" style={{ color: TEXT_DARK }}>Apple</Text>
                  </TouchableOpacity>
                </GlowBorder>
              </View>

              <View className="flex-row justify-center mb-2">
                <Text className="text-[13px]" style={{ color: TEXT_MUTED }}>
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                  <Text className="text-[13px] font-bold" style={{ color: GLOW_TO }}>
                    Login
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </ScrollView>
    </View>
  );
}