import { useState, type ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Image,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Palette — matches the restyled login.tsx
// ---------------------------------------------------------------------------

const GLOW_FROM = '#2DD4BF';
const GLOW_TO = '#8B5CF6';

const BRAND_GREEN_LIGHT = '#22D48A';
const BRAND_GREEN = '#12B57A';
const BRAND_GREEN_DARK = '#0E9F6E';

const TEXT_DARK = '#14212B';
const TEXT_MUTED = '#4B5A66';

const HEADER_TITLE = '#0B3D62';
const HEADER_SUB = '#2A5A82';

const INPUT_BG = 'rgba(255,255,255,0.38)';
const INPUT_BORDER = 'rgba(255,255,255,0.6)';

// ---------------------------------------------------------------------------
// Glass card — blurred and translucent so the bubble background's own color
// shows through it, instead of reading as a flat white box
// ---------------------------------------------------------------------------

function GlassCard({
  children,
  radius = 28,
  style,
}: {
  children: ReactNode;
  radius?: number;
  style?: any;
}) {
  return (
    <View
      style={[
        {
          borderRadius: radius,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.5)',
          shadowColor: '#5FA8B4',
          shadowOpacity: 0.25,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 10,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <BlurView intensity={35} tint="light" style={{ borderRadius: radius }}>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>{children}</View>
      </BlurView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Simple pill input — translucent fill so it sits as a layer on the glass card
// ---------------------------------------------------------------------------

function GlassInput({
  children,
  style,
}: {
  children: ReactNode;
  style?: any;
}) {
  return (
    <View
      style={[
        {
          borderRadius: 16,
          backgroundColor: INPUT_BG,
          borderWidth: 1,
          borderColor: INPUT_BORDER,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Gradient CTA — solid vivid green pill with trailing arrow
// ---------------------------------------------------------------------------

function GradientCTA({
  children,
  onPress,
  disabled,
  radius = 28,
  icon = 'arrow-forward',
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  radius?: number;
  icon?: keyof typeof Ionicons.glyphMap | null;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.9}
      style={{
        borderRadius: radius,
        shadowColor: disabled ? 'transparent' : BRAND_GREEN,
        shadowOpacity: disabled ? 0 : 0.35,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: disabled ? 0 : 6,
      }}
    >
      <LinearGradient
        colors={
          disabled
            ? ['#D7E0E0', '#C7D2D2']
            : [BRAND_GREEN_LIGHT, BRAND_GREEN, BRAND_GREEN_DARK]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          height: 54,
          borderRadius: radius,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {children}
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={disabled ? TEXT_MUTED : '#FFFFFF'}
          />
        ) : null}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Full-bleed bubble backdrop (same asset & treatment as login.tsx)
// ---------------------------------------------------------------------------

function BubbleBackdrop({ children }: { children: ReactNode }) {
  return (
    <ImageBackground
      source={require('../../assets/images/jodtod/background_onboarding.png')}
      resizeMode="cover"
      style={{ flex: 1, width: SCREEN_W }}
    >
      {children}
    </ImageBackground>
  );
}

// ---------------------------------------------------------------------------
// Header photo — the new split-expenses illustration, given a little extra
// height and vertical breathing room, plus a light blend at the very bottom
// so it settles into the card instead of cutting off sharply
// ---------------------------------------------------------------------------

function HeaderVisual({ height }: { height: number }) {
  return (
    <View style={{ width: SCREEN_W, height, overflow: 'hidden' }}>
      <Image
        source={require('../../assets/images/jodtod/split-expenses.png')}
        style={{
          position: 'absolute',
          top: -10,
          left: 0,
          width: SCREEN_W,
          height: '110%',
        }}
        resizeMode="cover"
      />

      {/* Soft blend into the card below — light, not a wash */}
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.5)']}
        locations={[0.8, 1] as any}
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '24%',
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Signup screen
// ---------------------------------------------------------------------------

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
    <View className="flex-1">
      <BubbleBackdrop>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        >
          {/* Header — full bleed photo, given a bit more height for the new art */}
          <View style={{ position: 'relative', width: SCREEN_W }}>
            <HeaderVisual height={370} />

            {/* Back button only — overlay title/subtitle stay removed */}
            <View
              style={{
                position: 'absolute',
                top: 54,
                left: 18,
              }}
            >
              <TouchableOpacity
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.85)',
                  shadowColor: '#000',
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 3,
                }}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={20} color={BRAND_GREEN_DARK} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Glass signup card, floated up slightly over the photo */}
          <View style={{ marginTop: -28, marginHorizontal: 18 }}>
            <GlassCard radius={28}>
              <View className="px-6 pt-7 pb-8">
                <Text
                  className="text-2xl font-bold mb-5"
                  style={{ letterSpacing: 0.4, color: TEXT_DARK }}
                >
                  Create your account
                </Text>

                {/* Full name */}
                <Text className="text-[13px] mb-2 font-semibold" style={{ color: TEXT_MUTED }}>
                  Full name
                </Text>
                <GlassInput style={{ marginBottom: 18 }}>
                  <View className="flex-row items-center px-3.5 h-[52px]">
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={BRAND_GREEN_DARK}
                      style={{ marginRight: 10 }}
                    />
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
                </GlassInput>

                {/* Email */}
                <Text className="text-[13px] mb-2 font-semibold" style={{ color: TEXT_MUTED }}>
                  Email address
                </Text>
                <GlassInput style={{ marginBottom: 18 }}>
                  <View className="flex-row items-center px-3.5 h-[52px]">
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={BRAND_GREEN_DARK}
                      style={{ marginRight: 10 }}
                    />
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
                </GlassInput>

                {/* Password */}
                <Text className="text-[13px] mb-2 font-semibold" style={{ color: TEXT_MUTED }}>
                  Password
                </Text>
                <GlassInput style={{ marginBottom: 18 }}>
                  <View className="flex-row items-center px-3.5 h-[52px]">
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={BRAND_GREEN_DARK}
                      style={{ marginRight: 10 }}
                    />
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
                </GlassInput>

                {/* Confirm password */}
                <Text className="text-[13px] mb-2 font-semibold" style={{ color: TEXT_MUTED }}>
                  Confirm password
                </Text>
                <GlassInput style={{ marginBottom: 18 }}>
                  <View className="flex-row items-center px-3.5 h-[52px]">
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={BRAND_GREEN_DARK}
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      className="flex-1 text-sm"
                      style={{ color: TEXT_DARK }}
                      placeholder="Re-enter your password"
                      placeholderTextColor="rgba(20,33,43,0.4)"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={18}
                        color={TEXT_MUTED}
                      />
                    </TouchableOpacity>
                  </View>
                </GlassInput>

                {/* Terms */}
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
                      borderColor: BRAND_GREEN_DARK,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                      marginTop: 2,
                      backgroundColor: agreedToTerms ? BRAND_GREEN : 'transparent',
                    }}
                  >
                    {agreedToTerms && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                  <Text className="flex-1 text-[13px] leading-[19px]" style={{ color: TEXT_MUTED }}>
                    I agree to the{' '}
                    <Text className="font-semibold" style={{ color: GLOW_TO }}>
                      Terms of Service
                    </Text>{' '}
                    and{' '}
                    <Text className="font-semibold" style={{ color: GLOW_TO }}>
                      Privacy Policy
                    </Text>
                  </Text>
                </TouchableOpacity>

                <View style={{ marginBottom: 24 }}>
                  <GradientCTA onPress={() => router.push('/(tabs)' as any)}>
                    <Text className="text-white text-base font-bold">Sign Up</Text>
                  </GradientCTA>
                </View>

                {/* Divider */}
                <View className="flex-row items-center mb-5">
                  <View className="flex-1 h-px" style={{ backgroundColor: 'rgba(20,33,43,0.14)' }} />
                  <Text className="text-xs mx-3" style={{ color: TEXT_MUTED }}>
                    or continue with
                  </Text>
                  <View className="flex-1 h-px" style={{ backgroundColor: 'rgba(20,33,43,0.14)' }} />
                </View>

                {/* Social buttons */}
                <View className="flex-row gap-3 mb-6">
                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-center h-12 gap-2"
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: INPUT_BORDER,
                      backgroundColor: 'rgba(255,255,255,0.45)',
                    }}
                  >
                    <Ionicons name="logo-google" size={18} color="#DB4437" />
                    <Text className="text-sm font-semibold" style={{ color: TEXT_DARK }}>
                      Google
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-center h-12 gap-2"
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: INPUT_BORDER,
                      backgroundColor: 'rgba(255,255,255,0.45)',
                    }}
                  >
                    <Ionicons name="logo-apple" size={20} color={TEXT_DARK} />
                    <Text className="text-sm font-semibold" style={{ color: TEXT_DARK }}>
                      Apple
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Login link */}
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
            </GlassCard>
          </View>
        </ScrollView>
      </BubbleBackdrop>
    </View>
  );
}