import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Image,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;
const { width: SCREEN_W } = Dimensions.get('window');

type Step = 'form' | 'otp' | 'verifying' | 'verified';

// ---------------------------------------------------------------------------
// Palette — clean white card, single vivid green accent, no heavy tinted glass
// ---------------------------------------------------------------------------

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
// Simple pill input — light grey fill, hairline border, icon + text
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
// Full-bleed bubble backdrop — this is the actual page background, it stays
// visible the whole way down (no plain white page background anywhere)
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
// Header photo — shown at full strength, no white wash over it. Only the
// title/subtitle get a small text-shadow so they stay legible on the photo.
// ---------------------------------------------------------------------------

function HeaderVisual({ height }: { height: number }) {
  return (
    <View style={{ width: SCREEN_W, height, overflow: 'hidden' }}>
      <Image
        source={require('../../assets/images/jodtod/plan-trips-login.png')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: SCREEN_W,
          height: '100%',
        }}
        resizeMode="cover"
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Login screen
// ---------------------------------------------------------------------------

export default function Login() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('form');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [phone, setPhone] = useState('');

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  const otp = digits.join('');
  const isOtpComplete = otp.length === OTP_LENGTH;

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
  }, [step, scale, spin]);

  useEffect(() => {
    if (step !== 'verified') return;

    const redirectTimer = setTimeout(() => {
      router.replace('/(tabs)' as any);
    }, 1400);

    return () => clearTimeout(redirectTimer);
  }, [step, router]);

  const rotateInterpolate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const switchMethod = (method: 'email' | 'phone') => {
    setLoginMethod(method);
  };

  const handleSendOtp = () => {
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
    setDigits(Array(OTP_LENGTH).fill(''));
    setSecondsLeft(RESEND_SECONDS);
    inputRefs.current[0]?.focus();
  };

  const handleVerify = () => {
    if (!isOtpComplete) return;
    setStep('verifying');
  };

  return (
    <View className="flex-1">
      {step === 'form' ? (
        <BubbleBackdrop>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
          >
            {/* Header — full bleed photo, shown at full strength */}
            <View style={{ position: 'relative', width: SCREEN_W }}>
              <HeaderVisual height={340} />

              {/* Text overlay — absolute, sits on top of full-bleed image */}
              <View
                style={{
                  position: 'absolute',
                  top: 120,
                  left: 18,
                  right: 20,
                }}
              >
                <Text
                  className="text-2xl font-extrabold mb-1.5"
                  style={{
                    color: HEADER_TITLE,
                    letterSpacing: 0.3,
                    textShadowColor: 'rgba(255,255,255,0.85)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 6,
                  }}
                >
                  Hey, you're back!
                </Text>

                <Text
                  className="text-sm font-semibold leading-5"
                  style={{
                    color: HEADER_SUB,
                    textShadowColor: 'rgba(255,255,255,0.85)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 6,
                  }}
                >
                  Log in to keep tracking{'\n'} your trips and expenses.
                </Text>
              </View>
            </View>

            {/* Clean white login card, floated up slightly over the photo */}
            <View style={{ marginTop: -28, marginHorizontal: 18 }}>
              <GlassCard radius={28}>
                <View className="px-6 pt-7 pb-8">
                  <Text
                    className="text-2xl font-bold mb-5"
                    style={{ letterSpacing: 0.4, color: TEXT_DARK }}
                  >
                    Login to your account
                  </Text>

                  {/* Email / Phone toggle — light pill segmented control */}
                  <View
                    style={{
                      marginBottom: 20,
                      padding: 4,
                      borderRadius: 16,
                      backgroundColor: INPUT_BG,
                      borderWidth: 1,
                      borderColor: INPUT_BORDER,
                    }}
                  >
                    <View className="flex-row">
                      <TouchableOpacity
                        className="flex-1 h-10 items-center justify-center"
                        style={{ borderRadius: 12, overflow: 'hidden' }}
                        onPress={() => switchMethod('email')}
                      >
                        {loginMethod === 'email' ? (
                          <LinearGradient
                            colors={[BRAND_GREEN_LIGHT, BRAND_GREEN_DARK]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              borderRadius: 12,
                            }}
                          />
                        ) : null}

                        <Text
                          className="text-sm font-semibold"
                          style={{
                            color: loginMethod === 'email' ? '#FFFFFF' : TEXT_MUTED,
                          }}
                        >
                          Email
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        className="flex-1 h-10 items-center justify-center"
                        style={{ borderRadius: 12, overflow: 'hidden' }}
                        onPress={() => switchMethod('phone')}
                      >
                        {loginMethod === 'phone' ? (
                          <LinearGradient
                            colors={[BRAND_GREEN_LIGHT, BRAND_GREEN_DARK]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              borderRadius: 12,
                            }}
                          />
                        ) : null}

                        <Text
                          className="text-sm font-semibold"
                          style={{
                            color: loginMethod === 'phone' ? '#FFFFFF' : TEXT_MUTED,
                          }}
                        >
                          Phone
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {loginMethod === 'email' ? (
                    <>
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
                      </GlassInput>

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
                              borderColor: BRAND_GREEN_DARK,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 8,
                              backgroundColor: rememberMe ? BRAND_GREEN : 'transparent',
                            }}
                          >
                            {rememberMe && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                          </View>
                          <Text className="text-[13px]" style={{ color: TEXT_MUTED }}>
                            Remember me
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity>
                          <Text className="text-[13px] font-semibold" style={{ color: BRAND_GREEN_DARK }}>
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

                      <GlassInput style={{ marginBottom: 18 }}>
                        <View className="flex-row items-center px-3.5 h-[52px]">
                          <Ionicons
                            name="call-outline"
                            size={18}
                            color={BRAND_GREEN_DARK}
                            style={{ marginRight: 10 }}
                          />
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
                      </GlassInput>

                      <View style={{ marginBottom: 24 }}>
                        <GradientCTA onPress={handleSendOtp}>
                          <Text className="text-white text-base font-bold">Send OTP</Text>
                        </GradientCTA>
                      </View>
                    </>
                  )}

                  {/* Divider */}
                  <View className="flex-row items-center mb-5">
                    <View className="flex-1 h-px" style={{ backgroundColor: INPUT_BORDER }} />
                    <Text className="text-xs mx-3" style={{ color: TEXT_MUTED }}>
                      or continue with
                    </Text>
                    <View className="flex-1 h-px" style={{ backgroundColor: INPUT_BORDER }} />
                  </View>

                  {/* Social buttons — simple bordered pills */}
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

                  {/* Signup */}
                  <View className="flex-row justify-center mb-2">
                    <Text className="text-[13px]" style={{ color: TEXT_MUTED }}>
                      Don't have an account?{' '}
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/signup')}>
                      <Text className="text-[13px] font-bold" style={{ color: BRAND_GREEN_DARK }}>
                        Sign up
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassCard>
            </View>
          </ScrollView>
        </BubbleBackdrop>
      ) : (
        // ---------------------------------------------------------------------
        // OTP entry / verifying / verified screens
        // ---------------------------------------------------------------------
        <BubbleBackdrop>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1"
          >
            <View className="flex-1 px-6 pt-[60px]">
              <View className="flex-1 items-center justify-center">
                {step === 'otp' && (
                  <GlassCard radius={28} style={{ width: '100%' }}>
                    <View className="px-7 py-10 items-center">
                      <Text className="text-2xl font-bold mb-3" style={{ color: TEXT_DARK }}>
                        Verify your number
                      </Text>

                      <View className="flex-row items-center mb-8">
                        <Text className="text-base font-semibold mr-2" style={{ color: BRAND_GREEN_DARK }}>
                          {phone || '+91 00000 00000'}
                        </Text>
                        <TouchableOpacity onPress={() => setStep('form')}>
                          <Ionicons name="pencil" size={16} color={BRAND_GREEN_DARK} />
                        </TouchableOpacity>
                      </View>

                      <View className="flex-row gap-2 mb-8">
                        {digits.map((digit, index) => (
                          <View
                            key={index}
                            style={{
                              width: 46,
                              height: 58,
                              borderRadius: 14,
                              backgroundColor: digit ? '#F0FBF6' : INPUT_BG,
                              borderWidth: 1.6,
                              borderColor: digit ? BRAND_GREEN : INPUT_BORDER,
                              overflow: 'hidden',
                            }}
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
                              className="flex-1 text-xl font-bold text-center"
                              style={{ color: TEXT_DARK, backgroundColor: 'transparent' }}
                              placeholder=""
                            />
                          </View>
                        ))}
                      </View>

                      {secondsLeft > 0 ? (
                        <Text className="text-[13px] mb-8" style={{ color: TEXT_MUTED }}>
                          Resend OTP in 00:{secondsLeft < 10 ? '0' : ''}
                          {secondsLeft}
                        </Text>
                      ) : (
                        <TouchableOpacity onPress={handleResend} className="mb-8">
                          <Text className="text-[13px] font-bold" style={{ color: BRAND_GREEN_DARK }}>
                            Resend OTP
                          </Text>
                        </TouchableOpacity>
                      )}

                      <View style={{ width: '100%' }}>
                        <GradientCTA onPress={handleVerify} disabled={!isOtpComplete}>
                          <Text
                            className="text-base font-bold"
                            style={{ color: isOtpComplete ? '#FFFFFF' : TEXT_MUTED }}
                          >
                            Verify
                          </Text>
                        </GradientCTA>
                      </View>

                      <Text className="text-[12px] text-center mt-6 leading-5" style={{ color: TEXT_MUTED }}>
                        We will never share your number with anyone.
                      </Text>
                    </View>
                  </GlassCard>
                )}

                {(step === 'verifying' || step === 'verified') && (
                  <GlassCard radius={28} style={{ width: '100%' }}>
                    <View className="px-8 py-12 items-center">
                      {step === 'verifying' ? (
                        <>
                          <Animated.View
                            style={{
                              transform: [{ rotate: rotateInterpolate }],
                              width: 60,
                              height: 60,
                              borderRadius: 30,
                              borderWidth: 4,
                              borderColor: BRAND_GREEN,
                              borderTopColor: INPUT_BORDER,
                              marginBottom: 24,
                            }}
                          />
                          <Text className="text-lg font-bold mb-2" style={{ color: TEXT_DARK }}>
                            Verifying OTP
                          </Text>
                          <Text className="text-[13px] text-center" style={{ color: TEXT_MUTED }}>
                            {phone ? `Confirming the code sent to ${phone}` : 'Confirming your code'}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Animated.View style={{ transform: [{ scale }], marginBottom: 24 }}>
                            <LinearGradient
                              colors={[BRAND_GREEN_LIGHT, BRAND_GREEN, BRAND_GREEN_DARK]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={{
                                width: 64,
                                height: 64,
                                borderRadius: 32,
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: BRAND_GREEN,
                                shadowOpacity: 0.4,
                                shadowRadius: 14,
                                shadowOffset: { width: 0, height: 0 },
                                elevation: 6,
                              }}
                            >
                              <Ionicons name="checkmark" size={34} color="#FFFFFF" />
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
                  </GlassCard>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </BubbleBackdrop>
      )}
    </View>
  );
}