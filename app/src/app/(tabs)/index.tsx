import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  }

  if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  }

  if (hour >= 17 && hour < 21) {
    return 'Good Evening';
  }

  return 'Good Night';
};

const groups = [
  {
    name: 'Goa Trip',
    members: '5 members',
    icon: 'sunny',
    status: 'owed',
    amount: '₹2,450',
  },
  {
    name: 'Flatmates',
    members: '4 members',
    icon: 'home',
    status: 'owe',
    amount: '₹680',
  },
  {
    name: 'Office Group',
    members: '8 members',
    icon: 'briefcase',
    status: 'owed',
    amount: '₹1,920',
  },
  {
    name: 'Badminton',
    members: '6 members',
    icon: 'football',
    status: 'owe',
    amount: '₹320',
  },
];

const expenses = [
  {
    title: "Dinner at Bruno's",
    meta: 'Paid by you • 4 people',
    date: 'Apr 16, 2025',
    amount: '₹2,850',
    positive: false,
    icon: 'restaurant',
  },
  {
    title: 'Electricity Bill',
    meta: 'Paid by Aman • 3 people',
    date: 'Apr 14, 2025',
    amount: '₹1,200',
    positive: true,
    icon: 'flash',
  },
  {
    title: 'Movie Night',
    meta: 'Paid by Neha • 5 people',
    date: 'Apr 12, 2025',
    amount: '₹980',
    positive: false,
    icon: 'film',
  },
  {
    title: 'Grocery Run',
    meta: 'Paid by Karan • 3 people',
    date: 'Apr 10, 2025',
    amount: '₹540',
    positive: true,
    icon: 'cart',
  },
];

const moneyFlowLeft = [
  { name: 'Aman', amount: '+₹2,400' },
  { name: 'Priya', amount: '+₹1,800' },
  { name: 'Rohan', amount: '+₹1,500' },
];

const moneyFlowRight = [
  { name: 'Karan', amount: '-₹2,000' },
  { name: 'Neha', amount: '-₹1,200' },
  { name: 'Aditya', amount: '-₹900' },
];

const cardShadow = {
  shadowColor: '#0B3D62',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.1,
  shadowRadius: 9,
  elevation: 4,
};

const heroShadow = {
  shadowColor: '#0E6B5C',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.16,
  shadowRadius: 16,
  elevation: 8,
};

// ---------------------------------------------------------------------------
// Money Flow animated connection: a short translucent track with one slow
// liquid particle gliding along it. Green = incoming (Person -> You),
// coral = outgoing (You -> Person). Slow + eased + staggered, never game-like.
// ---------------------------------------------------------------------------
const TRACK_W = 26;
const DOT_SIZE = 6;

function FlowTrack({
  lineColor,
  dotColor,
  delay,
}: {
  lineColor: string;
  dotColor: string;
  delay: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, {
          duration: 2800,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        false
      )
    );
  }, [delay, progress]);

  const dotAnimated = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (TRACK_W - DOT_SIZE) }],
    opacity: 1 - progress.value * 0.4,
  }));

  return (
    <View style={{ width: TRACK_W, height: 14, justifyContent: 'center' }}>
      <View
        style={{
          height: 2,
          borderRadius: 2,
          backgroundColor: lineColor,
          opacity: 0.4,
        }}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 4,
            left: 0,
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: DOT_SIZE / 2,
            backgroundColor: dotColor,
            shadowColor: dotColor,
            shadowOpacity: 0.9,
            shadowRadius: 4,
            elevation: 3,
          },
          dotAnimated,
        ]}
      />
    </View>
  );
}

// Gentle breathing scale on the YOU node — very slow, barely perceptible.
function YouNode() {
  const breath = useSharedValue(1);

  useEffect(() => {
    breath.value = withRepeat(
      withTiming(1.045, {
        duration: 3400,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [breath]);

  const pulse = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
  }));

  return (
    <Animated.View
      className="h-[90px] w-[90px] items-center justify-center"
      style={pulse}
    >
      <View
        className="h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white/30"
        style={cardShadow}
      >
        <BlurView
          intensity={45}
          tint="default"
          style={[StyleSheet.absoluteFill, { borderRadius: 45 }]}
        />
        <LinearGradient
          colors={[
            'rgba(32,184,121,0.20)',
            'rgba(240,79,56,0.15)',
            'rgba(108,99,255,0.10)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 45 }]}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.5 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 45 }]}
        />
        <Ionicons name="person" size={38} color="#0B3D62" />
      </View>
    </Animated.View>
  );
}

const quickActions = [
  { label: 'Scan Bill', icon: 'barcode', color: '#FF8EAB' },
  { label: 'Add Expense', icon: 'add', color: '#20B879' },
  { label: 'Settle Up', icon: 'reload', color: '#F04F38' },
  { label: 'Create Group', icon: 'people', color: '#39D59A' },
  { label: 'View Reports', icon: 'grid', color: '#6C63FF' },
] as const;

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const displayName = user?.name?.split(' ')[0] || 'there';

  const handleProfilePress = () => {
    router.push('/profile');
  };

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../../../assets/images/jodtod/background_onboarding.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="px-5"
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Header - almost floating, minimal glass */}
          <View className="mb-4 flex-row items-center justify-between">
            {/* Greeting */}
            <View className="flex-row items-center">
              <View>
                <View className="flex-row items-center">
                  <Text className="text-[17px] font-semibold text-[#20B879]">
                    {getGreeting()},
                  </Text>

                  <Text className="ml-1.5 text-[23px] font-extrabold text-[#FF5A36]">
                    {displayName}
                  </Text>
                </View>

                <Text className="mt-1 text-[11px] font-medium text-[#20B879]">
                  Split Smart. Stay Together.
                </Text>
              </View>
            </View>

            {/* Header Actions - Search, Notifications, Profile - NO logout */}
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                activeOpacity={0.8}
                className="h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5"
              >
                <Ionicons name="search" size={20} color="#0B3D62" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                className="h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5"
              >
                <Ionicons name="notifications" size={20} color="#0B3D62" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleProfilePress}
                className="h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5"
              >
                <Ionicons name="person" size={20} color="#0B3D62" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Balance Hero Card - one large glass surface */}
          <View className="mb-5 rounded-[32px]" style={heroShadow}>
            <View className="overflow-hidden rounded-[32px] border border-white/20">
              <BlurView
                intensity={50}
                tint="dark"
                style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
              />
              <LinearGradient
                colors={[
                  'rgba(28,120,148,0.35)',
                  'rgba(8,123,118,0.3)',
                  'rgba(24,168,110,0.35)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
              />
              <LinearGradient
                colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 0.6 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
              />

              <View className="p-6">
                <View className="flex-row items-center">
                  {/* You Owe - left */}
                  <View className="flex-1">
                    <View className="mb-2 flex-row items-center">
                      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10">
                        <Ionicons name="arrow-down" size={20} color="#FFFFFF" />
                      </View>
                      <Text className="text-[12px] font-medium text-white">
                        You owe
                      </Text>
                    </View>
                    <Text className="text-[26px] font-extrabold text-white">
                      ₹1,230
                    </Text>
                    <Text className="text-[11px] text-white/40">
                      Across 3 groups
                    </Text>
                  </View>

                  {/* Subtle divider - very faint */}
                  <View className="mx-3 h-16 w-px bg-white/5" />

                  {/* You're Owed - right */}
                  <View className="flex-1">
                    <View className="mb-2 flex-row items-center">
                      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10">
                        <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                      </View>
                      <Text className="text-[12px] font-medium text-white">
                        You're owed
                      </Text>
                    </View>
                    <Text className="text-[26px] font-extrabold text-white">
                      ₹3,680
                    </Text>
                    <Text className="text-[11px] text-white/40">
                      Across 5 groups
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row items-center justify-between">
                  <View className="h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10">
                    <Ionicons name="bar-chart" size={17} color="#FFFFFF" />
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    className="flex-row items-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5"
                  >
                    <Text className="mr-1 text-[11px] font-bold text-white">
                      View details
                    </Text>
                    <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Actions - individual floating glass tiles */}
          <View className="mb-4">
            <Text className="mb-2 text-[20px] font-extrabold text-[#0B3D62]">
              Quick Actions
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}
            >
              {quickActions.map((action) => (
                <View
                  key={action.label}
                  className="w-[92px] shrink-0 overflow-hidden rounded-[14px] border border-white/20"
                >
                  <BlurView
                    intensity={30}
                    tint="default"
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={[
                      'rgba(255,255,255,0.16)',
                      'rgba(255,255,255,0.06)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View className="items-center p-3">
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
                      <Ionicons
                        name={action.icon as any}
                        size={18}
                        color={action.color}
                      />
                    </View>
                    <Text className="mt-1.5 text-center text-[10px] font-semibold text-[#0B3D62]">
                      {action.label}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Your Groups - floating glass cards */}
          <View className="mb-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-[20px] font-extrabold text-[#0B3D62]">
                Your Groups
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                className="flex-row items-center"
              >
                <Text className="mr-1 text-[13px] font-bold text-[#149C73]">
                  See all
                </Text>
                <Ionicons name="chevron-forward" size={15} color="#149C73" />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-1"
              contentContainerClassName="px-1"
            >
              {groups.map((group) => (
                <View
                  key={group.name}
                  className="mr-2.5 w-[150px] rounded-[18px]"
                  style={cardShadow}
                >
                  <View className="overflow-hidden rounded-[18px] border border-white/20">
                    <BlurView
                      intensity={40}
                      tint="default"
                      style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                    />
                    <LinearGradient
                      colors={[
                        'rgba(255,255,255,0.22)',
                        'rgba(198,228,222,0.14)',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                    />
                    <LinearGradient
                      colors={[
                        'rgba(255,255,255,0.35)',
                        'rgba(255,255,255,0)',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 0.5 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                    />

                    <TouchableOpacity activeOpacity={0.9} className="p-3">
                      <View className="flex-row items-center">
                        <View className="mr-2 h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10">
                          <Ionicons
                            name={group.icon as any}
                            size={16}
                            color="#0B3D62"
                          />
                        </View>
                        <View className="flex-1">
                          <Text
                            numberOfLines={1}
                            className="text-[13px] font-extrabold text-[#0B3D62]"
                          >
                            {group.name}
                          </Text>
                          <Text className="mt-0.5 text-[10px] text-[#5B7C93]">
                            {group.members}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color="#7DA0B1"
                        />
                      </View>

                      <View
                        className={
                          group.status === 'owed'
                            ? 'mt-2 rounded-xl border border-[#149C73]/20 bg-[#E7F7F2]/60 px-2.5 py-1.5'
                            : 'mt-2 rounded-xl border border-[#E84D39]/20 bg-[#FDEDEA]/60 px-2.5 py-1.5'
                        }
                      >
                        <Text
                          className={
                            group.status === 'owed'
                              ? 'text-[9px] font-medium text-[#15866C]'
                              : 'text-[9px] font-medium text-[#E05A45]'
                          }
                        >
                          {group.status === 'owed' ? "You're owed" : 'You owe'}
                        </Text>
                        <Text
                          className={
                            group.status === 'owed'
                              ? 'mt-0.5 text-[13px] font-extrabold text-[#149C73]'
                              : 'mt-0.5 text-[13px] font-extrabold text-[#E84D39]'
                          }
                        >
                          {group.amount}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Recent Expenses - one unified glass container */}
          <View className="mb-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-[20px] font-extrabold text-[#0B3D62]">
                Recent Expenses
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                className="flex-row items-center"
              >
                <Text className="mr-1 text-[13px] font-bold text-[#149C73]">
                  See all
                </Text>
                <Ionicons name="chevron-forward" size={15} color="#149C73" />
              </TouchableOpacity>
            </View>

            <View className="rounded-[24px]" style={cardShadow}>
              <View className="overflow-hidden rounded-[24px] border border-white/20">
                <BlurView
                  intensity={40}
                  tint="default"
                  style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                />
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0.22)',
                    'rgba(198,228,222,0.14)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                />
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0.35)',
                    'rgba(255,255,255,0)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 0.4 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                />

                <View className="px-3">
                  {expenses.map((expense) => (
                    <TouchableOpacity
                      key={expense.title}
                      activeOpacity={0.8}
                      className="flex-row items-center py-3"
                    >
                      <View className="mr-3 h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10">
                        <Ionicons
                          name={expense.icon as any}
                          size={18}
                          color={expense.positive ? '#149C73' : '#E84D39'}
                        />
                      </View>

                      <View className="flex-1">
                        <Text
                          numberOfLines={1}
                          className="text-[14px] font-bold text-[#0B3D62]"
                        >
                          {expense.title}
                        </Text>
                        <Text
                          numberOfLines={1}
                          className="mt-0.5 text-[11px] text-[#5B7C93]"
                        >
                          {expense.meta}
                        </Text>
                      </View>

                      <View className="ml-3 items-end">
                        <Text className="text-[10px] text-[#7C93A5]">
                          {expense.date}
                        </Text>
                        <Text
                          className={`text-[14px] font-extrabold ${
                            expense.positive
                              ? 'text-[#149C73]'
                              : 'text-[#E84D39]'
                          }`}
                        >
                          {expense.amount}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={15}
                        color="#7C93A5"
                        className="ml-2"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Money Flow - OPEN visual relationship map, NOT a vertical list */}
          <View className="mb-6">
            <View className="mb-3">
              <Text className="text-[20px] font-extrabold text-[#0B3D62]">
                Money Flow
              </Text>
              <Text className="mt-1 text-[12px] text-[#5B7C93]">
                Who pays you, and who you pay
              </Text>
            </View>

            {/* Horizontal layout: LEFT -> CENTER -> RIGHT */}
            <View className="flex-row items-center justify-between px-1 py-4">
              {/* LEFT COLUMN: People who owe YOU (incoming, green) */}
              <View className="flex-1 items-start">
                {moneyFlowLeft.map((person, i) => (
                  <View
                    key={person.name}
                    className="mb-4 flex-row items-center"
                  >
                    <View
                      className="overflow-hidden rounded-2xl border border-white/20"
                      style={{ minWidth: 96 }}
                    >
                      <BlurView
                        intensity={35}
                        tint="default"
                        style={StyleSheet.absoluteFill}
                      />
                      <LinearGradient
                        colors={[
                          'rgba(32,184,121,0.10)',
                          'rgba(20,156,115,0.05)',
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <View className="flex-row items-center px-2.5 py-2">
                        <View className="mr-2 h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                          <Ionicons
                            name="person"
                            size={14}
                            color="#149C73"
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[11px] font-bold text-[#0B3D62]">
                            {person.name}
                          </Text>
                          <Text className="text-[13px] font-extrabold text-[#149C73]">
                            {person.amount}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="ml-1">
                      <FlowTrack
                        lineColor="#20B879"
                        dotColor="#20B879"
                        delay={i * 450}
                      />
                    </View>
                  </View>
                ))}
              </View>

              {/* CENTER: YOU */}
              <View className="mx-2 items-center">
                <YouNode />
                <Text className="mt-2 text-[13px] font-extrabold text-[#0B3D62]">
                  YOU
                </Text>
              </View>

              {/* RIGHT COLUMN: People YOU owe (outgoing, coral) */}
              <View className="flex-1 items-end">
                {moneyFlowRight.map((person, i) => (
                  <View
                    key={person.name}
                    className="mb-4 flex-row items-center"
                  >
                    <View className="mr-1">
                      <FlowTrack
                        lineColor="#E84D39"
                        dotColor="#E84D39"
                        delay={i * 450 + 200}
                      />
                    </View>

                    <View
                      className="overflow-hidden rounded-2xl border border-white/20"
                      style={{ minWidth: 96 }}
                    >
                      <BlurView
                        intensity={35}
                        tint="default"
                        style={StyleSheet.absoluteFill}
                      />
                      <LinearGradient
                        colors={[
                          'rgba(232,77,57,0.10)',
                          'rgba(240,79,56,0.05)',
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <View className="flex-row items-center px-2.5 py-2">
                        <View className="mr-2 h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                          <Ionicons
                            name="person"
                            size={14}
                            color="#E84D39"
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[11px] font-bold text-[#0B3D62]">
                            {person.name}
                          </Text>
                          <Text className="text-[13px] font-extrabold text-[#E84D39]">
                            {person.amount}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* View full flow button */}
            <View className="mt-2 items-center">
              <TouchableOpacity
                activeOpacity={0.8}
                className="flex-row items-center overflow-hidden rounded-full border border-white/20"
              >
                <BlurView
                  intensity={30}
                  tint="default"
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0.15)',
                    'rgba(198,228,222,0.12)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View className="flex-row items-center px-4 py-2">
                  <Text className="mr-1.5 text-[12px] font-bold text-[#0B3D62]">
                    View full flow
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#149C73" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Insight - small glass surface */}
          <View className="mb-3 rounded-[24px]" style={cardShadow}>
            <View className="overflow-hidden rounded-[24px] border border-white/20">
              <BlurView
                intensity={35}
                tint="default"
                style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
              />
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.20)',
                  'rgba(214,206,245,0.14)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
              />

              <View className="flex-row items-center justify-between p-3">
                <View className="mr-3 flex-1 flex-row items-center">
                  <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-white/10">
                    <Ionicons name="bulb" size={18} color="#6C63FF" />
                  </View>
                  <Text
                    className="flex-1 text-[12px] font-bold"
                    style={{ color: '#3B2FA0' }}
                  >
                    Great job! You received ₹3,200 more than you spent this
                    month.
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="flex-row items-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5"
                >
                  <Text className="mr-1 text-[11px] font-bold text-white">
                    Details
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
