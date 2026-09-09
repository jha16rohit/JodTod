import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

// Unified "liquid glass" palette used across every screen in this file.
const GLOW_FROM = '#2DD4BF'; // teal
const GLOW_TO = '#8B5CF6'; // violet
const CTA_FROM = '#14B8A6'; // teal
const CTA_TO = '#0D9488'; // deep teal
const GLASS_BG = 'rgba(255,255,255,0.55)';
const GLASS_BG_STRONG = 'rgba(255,255,255,0.75)';
const TEXT_DARK = '#14212B';
const TEXT_MUTED = '#4B5A66';

type Step = 'form' | 'otp' | 'verifying' | 'verified';

// ---------------------------------------------------------------------------
// Purely visual helpers. No app logic lives here.
// ---------------------------------------------------------------------------
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

export default function Login() {
  const router = useRouter();

  // ----- step control (form -> otp -> verifying -> verified) -----
  const [step, setStep] = useState<Step>('form');

  // ----- email/password form state -----
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [phone, setPhone] = useState('');

  // ----- otp entry state -----
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const otp = digits.join('');
  const isOtpComplete = otp.length === OTP_LENGTH;

  // ----- verifying/verified animation state -----
  const spin = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step !== 'otp') return;
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, secondsLeft]);

  useEffect(() => {
    if (step !== 'verifying') return;

    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();

    // Simulate the OTP verification API call.
    // Swap this timeout for your real verify-OTP request.
    const verifyTimer = setTimeout(() => {
      loop.stop();
      scale.setValue(0);
      setStep('verified');
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }, 1800);

    return () => {
      clearTimeout(verifyTimer);
      loop.stop();
    };
  }, [step]);

  useEffect(() => {
    if (step !== 'verified') return;
    const redirectTimer = setTimeout(() => {
      router.replace('/(tabs)' as any);
    }, 1400);
    return () => clearTimeout(redirectTimer);
  }, [step]);

  const rotateInterpolate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // ----- handlers -----
  const switchMethod = (method: 'email' | 'phone') => {
    setLoginMethod(method);
  };

  const handleSendOtp = () => {
    // TODO: hook up real OTP send API call here
    setDigits(Array(OTP_LENGTH).fill(''));
    setSecondsLeft(RESEND_SECONDS);
    setStep('otp');
  };

  const handleChangeDigit = (text: string, index: number) => {
    const value = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[index] = value;
    setDigits(next);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
    }
  };

  const handleResend = () => {
    // TODO: hook up real resend-OTP API call here
    setDigits(Array(OTP_LENGTH).fill(''));
    setSecondsLeft(RESEND_SECONDS);
    inputRefs.current[0]?.focus();
  };

  const handleVerify = () => {
    if (!isOtpComplete) return;
    setStep('verifying');
  };

  return (
    <View className="flex-1" style={{ backgroundColor: '#FFFFFF' }}>
      {step === 'form' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <ImageBackground
            source={require('../../assets/images/jodtod/plan-trips-login.png')}
            className="h-[320px] px-6 pt-[60px]"
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.55)']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            <Text className="text-2xl font-bold text-white mb-1.5" style={{ textShadowColor: 'rgba(0,77,22,0.25)', textShadowRadius: 6 }}>
              Hey, you're back!
            </Text>
            <Text className="text-sm text-white/90 leading-5" style={{ textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 6 }}>
              Log in to keep tracking {'\n'} your trips and expenses.
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
                  Login to your account
                </Text>

                {/* Email / Phone toggle */}
                <GlowBorder radius={14} borderWidth={1.4} style={{ marginBottom: 20 }}>
                  <View
                    className="flex-row p-1"
                    style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
                  >
                    <TouchableOpacity
                      className="flex-1 h-10 items-center justify-center"
                      style={{ borderRadius: 10, overflow: 'hidden' }}
                      onPress={() => switchMethod('email')}
                    >
                      {loginMethod === 'email' ? (
                        <LinearGradient
                          colors={[CTA_FROM, CTA_TO]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            borderRadius: 10,
                          }}
                        />
                      ) : null}
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: loginMethod === 'email' ? '#fff' : TEXT_MUTED }}
                      >
                        Email
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 h-10 items-center justify-center"
                      style={{ borderRadius: 10, overflow: 'hidden' }}
                      onPress={() => switchMethod('phone')}
                    >
                      {loginMethod === 'phone' ? (
                        <LinearGradient
                          colors={[CTA_FROM, CTA_TO]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            borderRadius: 10,
                          }}
                        />
                      ) : null}
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: loginMethod === 'phone' ? '#fff' : TEXT_MUTED }}
                      >
                        Phone
                      </Text>
                    </TouchableOpacity>
                  </View>
                </GlowBorder>

                {loginMethod === 'email' ? (
                  <>
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
                          placeholder="Enter your password"
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

                    <View className="flex-row items-center justify-between mb-6">
                      <TouchableOpacity
                        className="flex-row items-center"
                        onPress={() => setRememberMe(!rememberMe)}
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
                            marginRight: 8,
                            backgroundColor: rememberMe ? CTA_FROM : 'transparent',
                          }}
                        >
                          {rememberMe && <Ionicons name="checkmark" size={13} color="#fff" />}
                        </View>
                        <Text className="text-[13px]" style={{ color: TEXT_MUTED }}>
                          Remember me
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity>
                        <Text className="text-[13px] font-semibold" style={{ color: GLOW_TO }}>
                          Forgot password?
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ marginBottom: 24 }}>
                      <GradientCTA onPress={() => router.push('/(tabs)' as any)}>
                        <Text className="text-white text-base font-bold">Login</Text>
                      </GradientCTA>
                    </View>
                  </>
                ) : (
                  <>
                    <Text className="text-[13px] mb-2 font-semibold" style={{ color: TEXT_MUTED }}>
                      Phone number
                    </Text>
                    <GlowBorder radius={14} borderWidth={1.2} glow={false} style={{ marginBottom: 18 }}>
                      <View
                        className="flex-row items-center px-3.5 h-[52px]"
                        style={{ backgroundColor: GLASS_BG }}
                      >
                        <Ionicons name="call-outline" size={18} color={CTA_TO} style={{ marginRight: 10 }} />
                        <TextInput
                          className="flex-1 text-sm"
                          style={{ color: TEXT_DARK }}
                          placeholder="Enter your phone number"
                          placeholderTextColor="rgba(20,33,43,0.4)"
                          value={phone}
                          onChangeText={setPhone}
                          keyboardType="phone-pad"
                        />
                      </View>
                    </GlowBorder>

                    <View style={{ marginBottom: 24 }}>
                      <GradientCTA onPress={handleSendOtp}>
                        <Text className="text-white text-base font-bold">Send OTP</Text>
                      </GradientCTA>
                    </View>
                  </>
                )}

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
                    Don't have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={() => router.push('/signup')}>
                    <Text className="text-[13px] font-bold" style={{ color: GLOW_TO }}>
                      Sign up
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </View>
        </ScrollView>
      ) : (
        // ----- OTP entry / verifying / verified screens -----
        <ImageBackground
          source={require('../../assets/images/jodtod/plan-trips-login.png')}
          className="flex-1"
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.7)']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1"
          >
            <View className="flex-1 px-6 pt-[60px]">
              <View className="flex-1 items-center justify-center">
                {step === 'otp' && (
                  <GlowBorder radius={28} borderWidth={1.4} style={{ width: '100%' }}>
                    <BlurView intensity={55} tint="light">
                      <View className="px-7 py-10 items-center" style={{ backgroundColor: GLASS_BG_STRONG }}>
                        <Text className="text-2xl font-bold mb-3" style={{ color: TEXT_DARK }}>
                          Verify your number
                        </Text>

                        <View className="flex-row items-center mb-8">
                          <Text className="text-base font-semibold mr-2" style={{ color: TEXT_DARK }}>
                            {phone || '+91 00000 00000'}
                          </Text>
                          <TouchableOpacity onPress={() => setStep('form')}>
                            <Ionicons name="pencil" size={16} color={CTA_TO} />
                          </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-2 mb-8">
                          {digits.map((digit, index) => (
                            <GlowBorder
                              key={index}
                              radius={12}
                              borderWidth={1.4}
                              glow={digit !== ''}
                            >
                              <TextInput
                                ref={(ref) => {
                                  inputRefs.current[index] = ref;
                                }}
                                value={digit}
                                onChangeText={(text) => handleChangeDigit(text, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                keyboardType="number-pad"
                                maxLength={1}
                                className="w-11 h-[52px] text-lg font-bold text-center"
                                style={{ backgroundColor: GLASS_BG, color: TEXT_DARK }}
                              />
                            </GlowBorder>
                          ))}
                        </View>

                        {secondsLeft > 0 ? (
                          <Text className="text-[13px] mb-8" style={{ color: TEXT_MUTED }}>
                            Resend OTP in 00:{secondsLeft < 10 ? '0' : ''}
                            {secondsLeft}
                          </Text>
                        ) : (
                          <TouchableOpacity onPress={handleResend} className="mb-8">
                            <Text className="text-[13px] font-bold" style={{ color: CTA_TO }}>
                              Resend OTP
                            </Text>
                          </TouchableOpacity>
                        )}

                        <View style={{ width: '100%' }}>
                          <GradientCTA onPress={handleVerify} disabled={!isOtpComplete}>
                            <Text
                              className="text-base font-bold"
                              style={{ color: isOtpComplete ? '#fff' : TEXT_MUTED }}
                            >
                              Verify
                            </Text>
                          </GradientCTA>
                        </View>

                        <Text
                          className="text-[12px] text-center mt-6 leading-5"
                          style={{ color: TEXT_MUTED }}
                        >
                          We will never share your number with anyone.
                        </Text>
                      </View>
                    </BlurView>
                  </GlowBorder>
                )}

                {(step === 'verifying' || step === 'verified') && (
                  <GlowBorder radius={28} borderWidth={1.4} style={{ width: '100%' }}>
                    <BlurView intensity={60} tint="light">
                      <View className="px-8 py-12 items-center" style={{ backgroundColor: GLASS_BG_STRONG }}>
                        {step === 'verifying' ? (
                          <>
                            <Animated.View
                              style={{
                                transform: [{ rotate: rotateInterpolate }],
                                width: 64,
                                height: 64,
                                borderRadius: 32,
                                borderWidth: 4,
                                borderColor: CTA_TO,
                                borderTopColor: 'transparent',
                                marginBottom: 24,
                              }}
                            />
                            <Text className="text-lg font-bold mb-2" style={{ color: TEXT_DARK }}>
                              Verifying OTP
                            </Text>
                            <Text className="text-[13px] text-center" style={{ color: TEXT_MUTED }}>
                              {phone
                                ? `Confirming the code sent to ${phone}`
                                : 'Confirming your code'}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Animated.View style={{ transform: [{ scale }], marginBottom: 24 }}>
                              <LinearGradient
                                colors={[CTA_FROM, CTA_TO]}
                                style={{
                                  width: 64,
                                  height: 64,
                                  borderRadius: 32,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Ionicons name="checkmark" size={34} color="#fff" />
                              </LinearGradient>
                            </Animated.View>
                            <Text className="text-lg font-bold mb-2" style={{ color: TEXT_DARK }}>
                              Verified!
                            </Text>
                            <Text className="text-[13px] text-center" style={{ color: TEXT_MUTED }}>
                              Taking you to your trips...
                            </Text>
                          </>
                        )}
                      </View>
                    </BlurView>
                  </GlowBorder>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </ImageBackground>
      )}
    </View>
  );
}