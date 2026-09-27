import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView, BlurTargetView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Svg, Path, Defs, Marker, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';

const GREEN = '#34D399';
const CYAN = '#22D3EE';
const CORAL = '#FB7185';

// ---------------------------------------------------------------------------
// Static display data (reference content; backend integration comes later)
// ---------------------------------------------------------------------------

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning,';
  if (hour >= 12 && hour < 17) return 'Good Afternoon,';
  if (hour >= 17 && hour < 21) return 'Good Evening,';
  return 'Good Night,';
};

const groups = [
  { name: 'Goa Trip', members: '5 members', amount: '₹12,450', icon: 'airplane', tint: '#34D399' },
  { name: 'Flatmates', members: '4 members', amount: '₹8,320', icon: 'home', tint: '#38BDF8' },
];

const expenses = [
  {
    title: 'Cafe Coffee Day',
    meta: 'Goa Trip • Today, 8:24 AM',
    amount: '₹450',
    status: 'You paid',
    statusStyle: 'paid' as const,
    icon: 'cafe',
    iconColor: '#FB923C',
  },
  {
    title: 'Dinner at Marina',
    meta: 'Flatmates • Yesterday, 9:12 PM',
    amount: '₹1,200',
    status: 'Split equally',
    statusStyle: 'split' as const,
    icon: 'restaurant',
    iconColor: '#C084FC',
  },
  {
    title: 'Groceries',
    meta: 'Flatmates • Apr 14, 2025',
    amount: '₹980',
    status: 'You paid',
    statusStyle: 'paid' as const,
    icon: 'cart',
    iconColor: '#34D399',
  },
];

const flowLeft = [
  { name: 'AMAN', amount: '₹1,200', initial: 'A', tint: '#34D399' },
  { name: 'NEHA', amount: '₹850', initial: 'N', tint: '#22D3EE' },
  { name: 'ROHIT', amount: '₹650', initial: 'R', tint: '#A78BFA' },
];

const flowRight = [
  { name: 'RAHUL', amount: '₹500', initial: 'R', tint: '#38BDF8' },
  { name: 'PRIYA', amount: '₹300', initial: 'P', tint: '#FB7185' },
  { name: 'KARAN', amount: '₹180', initial: 'K', tint: '#FBBF24' },
];

// OWE-direction datasets: people the user must pay (outgoing amounts).
const oweLeft = [
  { name: 'AMAN', amount: '₹900', initial: 'A', tint: '#FB7185' },
  { name: 'NEHA', amount: '₹420', initial: 'N', tint: '#F59E0B' },
  { name: 'ROHIT', amount: '₹310', initial: 'R', tint: '#FB7185' },
];

const oweRight = [
  { name: 'RAHUL', amount: '₹380', initial: 'R', tint: '#F59E0B' },
  { name: 'PRIYA', amount: '₹260', initial: 'P', tint: '#FB7185' },
  { name: 'KARAN', amount: '₹150', initial: 'K', tint: '#F59E0B' },
];

// Connector geometry in the 320x250 map space. TOWARD curves run pill edge
// -> avatar edge (arrowhead lands just outside the face = money flowing in).
// AWAY curves are the exact geometric reverse (money flowing out).
// Center avatar occupies roughly x 122-198, so endpoints stop short of it.
type Cubic = [number, number, number, number, number, number, number, number];

const FLOW_TOWARD_LEFT: Cubic[] = [
  [90, 44, 100, 58, 114, 74, 132, 93],
  [90, 125, 100, 125, 110, 125, 118, 125],
  [90, 208, 100, 194, 114, 176, 133, 157],
];

const FLOW_TOWARD_RIGHT: Cubic[] = [
  [230, 44, 220, 58, 206, 74, 188, 93],
  [230, 125, 220, 125, 210, 125, 202, 125],
  [230, 208, 220, 194, 206, 176, 187, 157],
];

const reverseCubic = (c: Cubic): Cubic => [c[6], c[7], c[4], c[5], c[2], c[3], c[0], c[1]];

const FLOW_AWAY_LEFT: Cubic[] = FLOW_TOWARD_LEFT.map(reverseCubic);
const FLOW_AWAY_RIGHT: Cubic[] = FLOW_TOWARD_RIGHT.map(reverseCubic);

const cubicD = (c: Cubic) =>
  `M${c[0]},${c[1]} C${c[2]},${c[3]} ${c[4]},${c[5]} ${c[6]},${c[7]}`;

type Pt = { x: number; y: number };

// Sampled once at module level — the particle worklet lerps between these.
const sampleCubic = (c: Cubic, n = 56): Pt[] => {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push({
      x:
        u * u * u * c[0] +
        3 * u * u * t * c[2] +
        3 * u * t * t * c[4] +
        t * t * t * c[6],
      y:
        u * u * u * c[1] +
        3 * u * u * t * c[3] +
        3 * u * t * t * c[5] +
        t * t * t * c[7],
    });
  }
  return pts;
};

// ---------------------------------------------------------------------------
// Shared dark-glass shell (real Android blur via blurTarget)
// ---------------------------------------------------------------------------

function GlassShell({
  children,
  radius,
  intensity = 55,
  blurTarget,
  style,
}: {
  children: React.ReactNode;
  radius: number;
  intensity?: number;
  blurTarget: React.RefObject<View | null>;
  style?: object;
}) {
  return (
    <View
      className="overflow-hidden border border-white/20"
      style={[
        { borderRadius: radius },
        {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 14,
          elevation: 7,
        },
        style,
      ]}
    >
      <BlurView
        blurTarget={blurTarget}
        blurMethod="dimezisBlurView"
        intensity={intensity}
        tint="dark"
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(10,35,55,0.38)', borderRadius: radius },
        ]}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 14,
          right: 14,
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.16)',
        }}
      />
      {children}
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View className="mb-2.5 flex-row items-center justify-between">
      <Text className="text-[17px] font-extrabold text-white">{title}</Text>
      <TouchableOpacity activeOpacity={0.7} className="flex-row items-center">
        <Text className="mr-1 text-[12px] font-semibold text-white/70">See all</Text>
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Energy particle: travels the ACTUAL sampled cubic (never straight-line
// left/top animation). Runs fully on the UI thread: one linear withTiming
// loop, opacity fades at both ends so the loop reset is invisible.
// ---------------------------------------------------------------------------

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const positionAlong = (pts: Pt[], t: number, opacityScale: number) => {
  'worklet';
  const n = pts.length - 1;
  const clamped = Math.min(Math.max(t, 0), 1);
  const scaled = clamped * n;
  const i = Math.min(Math.floor(scaled), n - 1);
  const f = scaled - i;
  const a = pts[i];
  const b = pts[i + 1];
  const fade = Math.sin(clamped * Math.PI);
  return {
    cx: a.x + (b.x - a.x) * f,
    cy: a.y + (b.y - a.y) * f,
    opacity: (0.12 + 0.88 * fade) * opacityScale,
  };
};

function FlowDots({
  curve,
  color,
  delay,
  duration = 2100,
}: {
  curve: Cubic;
  color: string;
  delay: number;
  duration?: number;
}) {
  // Module-level curve identity is stable, so this samples exactly once.
  const samples = React.useMemo(() => sampleCubic(curve, 56), [curve]);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, [delay, duration, progress]);

  const dotProps = useAnimatedProps(() => positionAlong(samples, progress.value, 1));
  const haloProps = useAnimatedProps(() => positionAlong(samples, progress.value, 0.32));

  return (
    <>
      <AnimatedCircle r={7} fill={color} animatedProps={haloProps} />
      <AnimatedCircle r={3} fill="#FFFFFF" animatedProps={dotProps} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Home screen (content only — tab bar lives in the parent layout)
// ---------------------------------------------------------------------------

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const displayName = user?.name?.split(' ')[0] || 'Rohit';
  const backgroundRef = useRef<View>(null);
  const [flowTab, setFlowTab] = useState<'get' | 'owe'>('get');

  // Single source of truth for the financial direction. Header pill,
  // balance card, people amounts, and arrow geometry all read from this.
  const isGet = flowTab === 'get';
  const fin = {
    label: isGet ? 'You will get' : 'You owe',
    amount: isGet ? '₹3,680' : '₹1,250',
    sub: isGet ? 'Across 5 people • 4 groups' : 'Across 3 people • 2 groups',
    arrow: isGet ? 'arrow-up' : 'arrow-down',
    accent: isGet ? '#34D399' : '#FB7185',
    accentSoft: isGet ? 'rgba(52,211,153,0.16)' : 'rgba(251,113,133,0.16)',
    gradient: (isGet ? ['#34D399', '#0E9F6E'] : ['#FB7185', '#EA580C']) as [
      string,
      string,
    ],
    left: isGet ? flowLeft : oweLeft,
    right: isGet ? flowRight : oweRight,
    amountLeft: isGet ? GREEN : '#FB7185',
    amountRight: isGet ? CYAN : '#FB7185',
    strokeLeft: isGet ? GREEN : '#FB7185',
    strokeRight: isGet ? CYAN : '#F59E0B',
    markerLeft: isGet ? 'arrowG' : 'arrowR',
    markerRight: isGet ? 'arrowC' : 'arrowO',
    pathsLeft: isGet ? FLOW_TOWARD_LEFT : FLOW_AWAY_LEFT,
    pathsRight: isGet ? FLOW_TOWARD_RIGHT : FLOW_AWAY_RIGHT,
    particleLeft: isGet ? '#6EE7B7' : '#FDA4AF',
    particleRight: isGet ? '#67E8F9' : '#FDBA74',
  } as const;

  const handleProfilePress = () => {
    router.push('/profile');
  };

  return (
    <View style={{ flex: 1 }}>
      <BlurTargetView ref={backgroundRef} style={StyleSheet.absoluteFill}>
        <Image
          source={require('../../../assets/images/jodtod/background_home.png')}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        />
      </BlurTargetView>

      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="px-4"
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {/* Header — profile left, Search + Notification top-right */}
          <View className="mb-3 mt-1 flex-row items-center justify-between">
            <View className="mr-2 flex-row min-w-0 flex-1 items-center">
              <TouchableOpacity activeOpacity={0.85} onPress={handleProfilePress}>
                <View
                  className="h-16 w-16 overflow-hidden rounded-full border-2 border-white/30"
                  style={{
                    shadowColor: '#22D3EE',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.45,
                    shadowRadius: 12,
                    elevation: 7,
                  }}
                >
                  <Image
                    source={require('../../../assets/images/jodtod/people.png')}
                    resizeMode="cover"
                    style={{ width: '100%', height: '100%' }}
                  />
                </View>
                <View
                  className="absolute bottom-0.5 right-0.5 h-[14px] w-[14px] rounded-full border-2 border-white"
                  style={{
                    backgroundColor: '#22C55E',
                    shadowColor: '#22C55E',
                    shadowOpacity: 0.9,
                    shadowRadius: 5,
                    elevation: 3,
                  }}
                />
              </TouchableOpacity>

              <View className="ml-3 flex-1">
                <Text className="text-[14px] font-medium text-white">
                  {getGreeting()}
                </Text>
                <Text
                  className="text-[30px] font-extrabold leading-[34px] text-white"
                  numberOfLines={1}
                >
                  {displayName} 👋
                </Text>
                <Text className="text-[13px] text-white/80" numberOfLines={1}>
                  Split Smart. Stay Together.
                </Text>
                <View className="mt-1.5 h-[3px] w-[40px] rounded-full bg-white opacity-90" />
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                activeOpacity={0.8}
                className="h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10"
              >
                <Ionicons name="search" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              className="h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10"
            >
              <Ionicons name="notifications" size={20} color="#FFFFFF" />
              <View
                className="absolute right-2.5 top-2.5 h-[12px] w-[12px] rounded-full border border-white"
                style={{
                  backgroundColor: '#EF4444',
                  shadowColor: '#EF4444',
                  shadowOpacity: 0.9,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              />
            </TouchableOpacity>
            </View>
          </View>

          {/* Get / Owe toggle — both states always visible, tap either half */}
          <View className="mb-3">
            <View className="w-full overflow-hidden rounded-[28px] border border-white/20">
              <BlurView
                blurTarget={backgroundRef}
                blurMethod="dimezisBlurView"
                intensity={50}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: 'rgba(10,35,55,0.4)' },
                ]}
              />
              <View className="flex-row p-1">
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setFlowTab('get')}
                  className="flex-1"
                >
                  <View
                    className="flex-row items-center justify-center rounded-full py-2.5"
                    style={
                      isGet
                        ? {
                            shadowColor: '#34D399',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.55,
                            shadowRadius: 10,
                            elevation: 5,
                          }
                        : undefined
                    }
                  >
                    {isGet && (
                      <LinearGradient
                        colors={['#34D399', '#22D3EE']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
                      />
                    )}
                    <Ionicons
                      name="arrow-up"
                      size={16}
                      color={isGet ? '#FFFFFF' : 'rgba(255,255,255,0.55)'}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      className="text-[15px] font-bold"
                      style={{ color: isGet ? '#FFFFFF' : 'rgba(255,255,255,0.55)' }}
                    >
                      You will get
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setFlowTab('owe')}
                  className="flex-1"
                >
                  <View
                    className="flex-row items-center justify-center rounded-full py-2.5"
                    style={
                      !isGet
                        ? {
                            shadowColor: '#FB7185',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.55,
                            shadowRadius: 10,
                            elevation: 5,
                          }
                        : undefined
                    }
                  >
                    {!isGet && (
                      <LinearGradient
                        colors={['#FB7185', '#EA580C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
                      />
                    )}
                    <Ionicons
                      name="arrow-down"
                      size={16}
                      color={!isGet ? '#FFFFFF' : 'rgba(255,255,255,0.55)'}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      className="text-[15px] font-bold"
                      style={{ color: !isGet ? '#FFFFFF' : 'rgba(255,255,255,0.55)' }}
                    >
                      You owe
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Main balance card */}
          <View className="mb-3">
            <GlassShell radius={26} blurTarget={backgroundRef}>
              <LinearGradient
                colors={[
                  `${fin.accent}1A`,
                  'rgba(255,255,255,0)',
                  `${fin.accent}1A`,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View className="flex-row items-center p-4">
                <View
                  className="h-16 w-16 items-center justify-center rounded-full"
                  style={{
                    shadowColor: fin.accent,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.7,
                    shadowRadius: 14,
                    elevation: 7,
                  }}
                >
                  <LinearGradient
                    colors={fin.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
                  />
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 5,
                      left: 12,
                      right: 12,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'rgba(255,255,255,0.35)',
                    }}
                  />
                  <Ionicons name={fin.arrow as any} size={30} color="#FFFFFF" />
                </View>

                <View className="ml-3 min-w-0 flex-1">
                  <Text className="text-[13px] text-white/85">{fin.label}</Text>
                  <Text
                    className="text-[34px] font-extrabold leading-[38px] text-white"
                    numberOfLines={1}
                  >
                    {fin.amount}
                  </Text>
                  <Text className="text-[12px] text-white/70" numberOfLines={1}>
                    {fin.sub}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  className="ml-2 h-[44px] w-[118px] flex-row items-center justify-center rounded-full border border-white/25 bg-white/10"
                >
                  <Text className="mr-1 text-[11px] font-bold text-white">
                    View details
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </GlassShell>
          </View>

          {/* People / Money flow */}
          <View className="mb-4">
            <GlassShell radius={24} blurTarget={backgroundRef}>
              <View className="px-3 pb-4 pt-4">
                <View style={{ height: 250 }}>
                  <View className="flex-1 flex-row items-stretch justify-between gap-1.5">
                    {/* Left people */}
                    <View className="flex-[30] justify-between py-1">
                      {(isGet ? flowLeft : oweLeft).map((p) => (
                        <View
                          key={p.name}
                          className="flex-row items-center rounded-xl border border-white/20 bg-white/10 px-1.5 py-1.5"
                        >
                          <View
                            className="h-9 w-9 items-center justify-center rounded-full border border-white/30"
                            style={{ backgroundColor: `${p.tint}33` }}
                          >
                            <Text className="text-[13px] font-extrabold text-white">
                              {p.initial}
                            </Text>
                          </View>
                          <View className="ml-1.5 min-w-0 flex-1">
                            <Text
                              className="text-[12px] font-bold text-white"
                              numberOfLines={1}
                            >
                              {p.name}
                            </Text>
                            <Text
                              className="text-[14px] font-extrabold"
                              style={{ color: fin.amountLeft }}
                              numberOfLines={1}
                            >
                              {p.amount}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Center user */}
                    <View className="flex-[34] items-center justify-center">
                      <View
                        className="items-center justify-center rounded-full border-2 border-cyan-200/70"
                        style={{
                          width: 72,
                          height: 72,
                          shadowColor: CYAN,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.65,
                          shadowRadius: 16,
                          elevation: 8,
                        }}
                      >
                        <Image
                          source={require('../../../assets/images/jodtod/people.png')}
                          resizeMode="cover"
                          style={{ width: 64, height: 64, borderRadius: 32 }}
                        />
                      </View>
                      <Text className="mt-1.5 text-[13px] font-bold text-white">
                        You
                      </Text>
                    </View>

                    {/* Right people */}
                    <View className="flex-[30] justify-between py-1">
                      {(isGet ? flowRight : oweRight).map((p) => (
                        <View
                          key={p.name}
                          className="flex-row items-center rounded-xl border border-white/20 bg-white/10 px-1.5 py-1.5"
                        >
                          <View
                            className="h-9 w-9 items-center justify-center rounded-full border border-white/30"
                            style={{ backgroundColor: `${p.tint}33` }}
                          >
                            <Text className="text-[13px] font-extrabold text-white">
                              {p.initial}
                            </Text>
                          </View>
                          <View className="ml-1.5 min-w-0 flex-1">
                            <Text
                              className="text-[12px] font-bold text-white"
                              numberOfLines={1}
                            >
                              {p.name}
                            </Text>
                            <Text
                              className="text-[14px] font-extrabold"
                              style={{ color: fin.amountRight }}
                              numberOfLines={1}
                            >
                              {p.amount}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Curved glowing connectors */}
                  <Svg
                    style={StyleSheet.absoluteFill}
                    viewBox="0 0 320 250"
                    preserveAspectRatio="none"
                    pointerEvents="none"
                  >
                    <Defs>
                      <Marker
                        id="arrowG"
                        markerWidth="7"
                        markerHeight="7"
                        refX="5"
                        refY="3.5"
                        orient="auto"
                      >
                        <Path d="M0,0 L7,3.5 L0,7 Z" fill={GREEN} opacity={0.95} />
                      </Marker>
                      <Marker
                        id="arrowC"
                        markerWidth="7"
                        markerHeight="7"
                        refX="5"
                        refY="3.5"
                        orient="auto"
                      >
                        <Path d="M0,0 L7,3.5 L0,7 Z" fill={CYAN} opacity={0.95} />
                      </Marker>
                      <Marker
                        id="arrowR"
                        markerWidth="7"
                        markerHeight="7"
                        refX="5"
                        refY="3.5"
                        orient="auto"
                      >
                        <Path d="M0,0 L7,3.5 L0,7 Z" fill="#FB7185" opacity={0.95} />
                      </Marker>
                      <Marker
                        id="arrowO"
                        markerWidth="7"
                        markerHeight="7"
                        refX="5"
                        refY="3.5"
                        orient="auto"
                      >
                        <Path d="M0,0 L7,3.5 L0,7 Z" fill="#F59E0B" opacity={0.95} />
                      </Marker>
                    </Defs>
                    {fin.pathsLeft.map((c, i) => (
                      <React.Fragment key={`l${i}`}>
                        <Path
                          d={cubicD(c)}
                          stroke={fin.strokeLeft}
                          strokeWidth={5}
                          fill="none"
                          opacity={0.22}
                          strokeLinecap="round"
                        />
                        <Path
                          d={cubicD(c)}
                          stroke={fin.strokeLeft}
                          strokeWidth={1.5}
                          fill="none"
                          opacity={0.9}
                          strokeLinecap="round"
                          markerEnd={`url(#${fin.markerLeft})`}
                        />
                        <FlowDots
                          curve={c}
                          color={fin.particleLeft}
                          delay={i * 280}
                        />
                      </React.Fragment>
                    ))}
                    {fin.pathsRight.map((c, i) => (
                      <React.Fragment key={`r${i}`}>
                        <Path
                          d={cubicD(c)}
                          stroke={fin.strokeRight}
                          strokeWidth={5}
                          fill="none"
                          opacity={0.22}
                          strokeLinecap="round"
                        />
                        <Path
                          d={cubicD(c)}
                          stroke={fin.strokeRight}
                          strokeWidth={1.5}
                          fill="none"
                          opacity={0.9}
                          strokeLinecap="round"
                          markerEnd={`url(#${fin.markerRight})`}
                        />
                        <FlowDots
                          curve={c}
                          color={fin.particleRight}
                          delay={i * 280 + 140}
                        />
                      </React.Fragment>
                    ))}
                  </Svg>
                </View>
              </View>
            </GlassShell>
          </View>

          {/* Your Groups */}
          <View className="mb-4">
            <SectionHeader title="Your Groups" />
            <View className="flex-row gap-2.5">
              {groups.map((group) => (
                <View key={group.name} className="flex-1">
                  <GlassShell radius={24} blurTarget={backgroundRef}>
                    <TouchableOpacity activeOpacity={0.9} className="p-3.5">
                      <View className="flex-row items-center">
                        <View
                          className="h-[52px] w-[52px] items-center justify-center rounded-full border border-white/30"
                          style={{
                            backgroundColor: `${group.tint}26`,
                            shadowColor: group.tint,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.5,
                            shadowRadius: 8,
                            elevation: 4,
                          }}
                        >
                          <Ionicons
                            name={group.icon as any}
                            size={24}
                            color="#FFFFFF"
                          />
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="rgba(255,255,255,0.6)"
                          style={{ marginLeft: 'auto' }}
                        />
                      </View>
                      <Text
                        className="mt-2.5 text-[16px] font-extrabold text-white"
                        numberOfLines={1}
                      >
                        {group.name}
                      </Text>
                      <Text className="mt-0.5 text-[12px] text-white/65">
                        {group.members}
                      </Text>
                      <Text className="mt-0.5 text-[22px] font-extrabold text-white">
                        {group.amount}
                      </Text>
                    </TouchableOpacity>
                    <LinearGradient
                      colors={[`${group.tint}30`, 'rgba(255,255,255,0)']}
                      start={{ x: 0, y: 1 }}
                      end={{ x: 1, y: 0 }}
                      pointerEvents="none"
                      style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                    />
                  </GlassShell>
                </View>
              ))}
            </View>
          </View>

          {/* Recent Expenses */}
          <View className="mb-2">
            <SectionHeader title="Recent Expenses" />
            <GlassShell radius={24} blurTarget={backgroundRef}>
              <View className="px-3.5 py-1.5">
                {expenses.map((expense, index) => (
                  <View
                    key={expense.title}
                    className="flex-row items-center py-3"
                    style={
                      index < expenses.length - 1
                        ? {
                            borderBottomWidth: 1,
                            borderBottomColor: 'rgba(255,255,255,0.08)',
                          }
                        : undefined
                    }
                  >
                    <View
                      className="mr-2.5 h-11 w-11 items-center justify-center rounded-full border border-white/20"
                      style={{ backgroundColor: `${expense.iconColor}22` }}
                    >
                      <Ionicons
                        name={expense.icon as any}
                        size={20}
                        color={expense.iconColor}
                      />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text
                        className="text-[15px] font-bold text-white"
                        numberOfLines={1}
                      >
                        {expense.title}
                      </Text>
                      <Text
                        className="mt-0.5 text-[12px] text-white/60"
                        numberOfLines={1}
                      >
                        {expense.meta}
                      </Text>
                    </View>
                    <View className="ml-2 items-end">
                      <Text className="text-[17px] font-extrabold text-white">
                        {expense.amount}
                      </Text>
                      <View
                        className="mt-1 rounded-full border px-2 py-0.5"
                        style={{
                          borderColor:
                            expense.statusStyle === 'paid'
                              ? 'rgba(52,211,153,0.35)'
                              : 'rgba(255,255,255,0.2)',
                          backgroundColor:
                            expense.statusStyle === 'paid'
                              ? 'rgba(52,211,153,0.14)'
                              : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        <Text
                          className="text-[12px] font-semibold"
                          style={{
                            color:
                              expense.statusStyle === 'paid'
                                ? GREEN
                                : 'rgba(255,255,255,0.75)',
                          }}
                        >
                          {expense.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </GlassShell>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
