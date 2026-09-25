import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
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

const moneyGet = [
  { name: 'Aman', amount: '₹2,400', tag: 'Dinner', icon: 'restaurant' },
  { name: 'Priya', amount: '₹1,800', tag: 'Trip', icon: 'airplane' },
  { name: 'Rohan', amount: '₹1,500', tag: 'Rent', icon: 'home' },
  { name: 'Sneha', amount: '₹1,200', tag: 'Movie', icon: 'film' },
  { name: 'Others', amount: '₹1,500', tag: '3 people', icon: 'people' },
];

const moneyGive = [
  { name: 'Karan', amount: '₹2,000', tag: 'Cab', icon: 'car' },
  { name: 'Neha', amount: '₹1,200', tag: 'Food', icon: 'restaurant' },
  { name: 'Aditya', amount: '₹900', tag: 'Shopping', icon: 'bag' },
  { name: 'Office Group', amount: '₹600', tag: 'Snacks', icon: 'people' },
  {
    name: 'Others',
    amount: '₹500',
    tag: '2 people',
    icon: 'ellipsis-horizontal',
  },
];

// Glass-panel shadows, tiered by panel size so none of them balloon outward
// into a visible "halo". Each is paired with a separate clipping wrapper
// (overflow:hidden) so Android never draws the shadow as a square box.
const iconShadow = {
  shadowColor: '#0B3D62',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 2,
};

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

export default function Home() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [flowTab, setFlowTab] = useState<'get' | 'give'>('get');
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = user?.name?.split(' ')[0] || 'there';

  const isGet = flowTab === 'get';
  const flowRows = isGet ? moneyGet : moneyGive;

  const handleLogoutPress = () => {
    if (loggingOut) return;
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setLoggingOut(true);
            try {
              await logout();
              router.replace('/login' as any);
            } finally {
              setLoggingOut(false);
            }
          })();
        },
      },
    ]);
  };

  const handleProfilePress = () => {
    Alert.alert('Account', user?.email ?? user?.phone ?? 'Signed in', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await logout();
            router.replace('/login' as any);
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F5F9FC]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-5"
        contentContainerClassName="pb-44 pt-3"
      >
        {/* Header */}
        <View className="mb-6 flex-row items-center justify-between">
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

          {/* Header Actions */}
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              activeOpacity={0.8}
              className="h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/70"
            >
              <Ionicons name="search" size={21} color="#0B3D62" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              className="relative h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/70"
            >
              <Ionicons name="notifications" size={21} color="#0B3D62" />

              <View className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#FF6548]" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleProfilePress}
              className="h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-[#6ED5B3] bg-[#E7F4F0]"
            >
              <Ionicons name="person" size={21} color="#0B3D62" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLogoutPress}
              disabled={loggingOut}
              accessibilityRole="button"
              accessibilityLabel="Log out"
              accessibilityState={{ disabled: loggingOut }}
              className="h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/70"
              style={{ opacity: loggingOut ? 0.5 : 1 }}
            >
              <Ionicons name="log-out-outline" size={21} color="#0B3D62" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Glass Card — the hero glass surface */}
        <View className="mb-7 rounded-[32px]" style={heroShadow}>
          <View className="overflow-hidden rounded-[32px] border border-white/50">
            {/* Blur the background FIRST, with a neutral tint so it doesn't wash white */}
            <BlurView
              intensity={60}
              tint="dark"
              style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
            />
            {/* Color sits ON TOP of the blur, not under it, so it stays saturated */}
            <LinearGradient
              colors={[
                'rgba(28,120,148,0.82)',
                'rgba(8,123,118,0.8)',
                'rgba(24,168,110,0.82)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
            />
            {/* Top glass highlight, like light catching the edge of frosted glass */}
            <LinearGradient
              colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 0.6 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
            />

            <View className="p-6">
              <View className="flex-row items-center">
                {/* You Owe */}
                <View className="flex-1">
                  <View className="mb-3 flex-row items-center">
                    <View className="mr-3 h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-[#FF8EAB]/50">
                      <Ionicons name="arrow-down" size={22} color="#FFFFFF" />
                    </View>
                    <Text className="text-[13px] font-medium text-white/85">
                      You owe
                    </Text>
                  </View>
                  <Text className="text-[29px] font-extrabold text-white">
                    ₹1,230
                  </Text>
                  <Text className="mt-1 text-[12px] text-white/70">
                    Across 3 groups
                  </Text>
                </View>

                <View className="mx-3 h-20 w-px bg-white/30" />

                {/* You're Owed */}
                <View className="flex-1">
                  <View className="mb-3 flex-row items-center">
                    <View className="mr-3 h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-[#39D59A]/50">
                      <Ionicons name="arrow-up" size={22} color="#FFFFFF" />
                    </View>
                    <Text className="text-[13px] font-medium text-white/85">
                      You're owed
                    </Text>
                  </View>
                  <Text className="text-[29px] font-extrabold text-white">
                    ₹3,680
                  </Text>
                  <Text className="mt-1 text-[12px] text-white/70">
                    Across 5 groups
                  </Text>
                </View>
              </View>

              <View className="mt-5 flex-row items-center justify-between">
                <View className="h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10">
                  <Ionicons name="bar-chart" size={19} color="#FFFFFF" />
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  className="flex-row items-center rounded-full border border-white/40 bg-white/15 px-4 py-2.5"
                >
                  <Text className="mr-1.5 text-[12px] font-bold text-white">
                    View details
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Your Groups */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[22px] font-extrabold text-[#0B3D62]">
            Your Groups
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            className="flex-row items-center"
          >
            <Text className="mr-1 text-[14px] font-bold text-[#149C73]">
              See all
            </Text>
            <Ionicons name="chevron-forward" size={17} color="#149C73" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-1 mb-7"
          contentContainerClassName="px-1"
        >
          {groups.map((group, index) => (
            <View
              key={group.name}
              className={`mr-3 w-[178px] rounded-[20px] ${
                index === groups.length - 1 ? 'mr-0' : ''
              }`}
              style={cardShadow}
            >
              <View className="overflow-hidden rounded-[20px] border border-white/60">
                <BlurView
                  intensity={45}
                  tint="default"
                  style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                />
                <LinearGradient
                  colors={['rgba(255,255,255,0.6)', 'rgba(198,228,222,0.42)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                />
                <LinearGradient
                  colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 0.5 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                />

                <TouchableOpacity activeOpacity={0.9} className="p-3">
                  <View className="flex-row items-center">
                    <View className="mr-2.5 h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/40">
                      <Ionicons
                        name={group.icon as any}
                        size={18}
                        color="#0B3D62"
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-[14px] font-extrabold text-[#0B3D62]"
                      >
                        {group.name}
                      </Text>
                      <Text className="mt-0.5 text-[11px] text-[#3E6E8E]">
                        {group.members}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#8DA0B1"
                    />
                  </View>

                  <View
                    className={
                      group.status === 'owed'
                        ? 'mt-3 rounded-xl border border-[#149C73]/30 bg-[#E7F7F2]/75 px-3 py-2'
                        : 'mt-3 rounded-xl border border-[#E84D39]/30 bg-[#FDEDEA]/75 px-3 py-2'
                    }
                  >
                    <Text
                      className={
                        group.status === 'owed'
                          ? 'text-[10px] font-medium text-[#15866C]'
                          : 'text-[10px] font-medium text-[#E05A45]'
                      }
                    >
                      {group.status === 'owed' ? "You're owed" : 'You owe'}
                    </Text>
                    <Text
                      className={
                        group.status === 'owed'
                          ? 'mt-0.5 text-[15px] font-extrabold text-[#149C73]'
                          : 'mt-0.5 text-[15px] font-extrabold text-[#E84D39]'
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

        {/* Recent Expenses */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[22px] font-extrabold text-[#0B3D62]">
            Recent Expenses
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            className="flex-row items-center"
          >
            <Text className="mr-1 text-[14px] font-bold text-[#149C73]">
              See all
            </Text>
            <Ionicons name="chevron-forward" size={17} color="#149C73" />
          </TouchableOpacity>
        </View>

        <View className="mb-7 rounded-[28px]" style={cardShadow}>
          <View className="overflow-hidden rounded-[28px] border border-white/60">
            <BlurView
              intensity={40}
              tint="default"
              style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            />
            <LinearGradient
              colors={['rgba(255,255,255,0.62)', 'rgba(198,228,222,0.4)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            />
            <LinearGradient
              colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 0.4 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            />

            <View className="px-4">
              {expenses.map((expense, index) => (
                <TouchableOpacity
                  key={expense.title}
                  activeOpacity={0.8}
                  className={
                    index === expenses.length - 1
                      ? 'flex-row items-center py-4'
                      : 'flex-row items-center border-b border-white/40 py-4'
                  }
                >
                  <View className="mr-4 h-12 w-12 items-center justify-center rounded-full border border-white/50 bg-white/40">
                    <Ionicons
                      name={expense.icon as any}
                      size={20}
                      color={expense.positive ? '#149C73' : '#E84D39'}
                    />
                  </View>

                  <View className="flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-[15px] font-bold text-[#0B3D62]"
                    >
                      {expense.title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="mt-1 text-[12px] text-[#5B7C93]"
                    >
                      {expense.meta}
                    </Text>
                  </View>

                  <View className="ml-3 items-end">
                    <Text className="mb-1 text-[11px] text-[#7C93A5]">
                      {expense.date}
                    </Text>
                    <Text
                      className={`text-[16px] font-extrabold ${
                        expense.positive ? 'text-[#149C73]' : 'text-[#E84D39]'
                      }`}
                    >
                      {expense.amount}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color="#7C93A5"
                    className="ml-2"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Money Flow */}
        <View className="mb-5 flex-row items-center justify-between">
          <View>
            <Text className="text-[22px] font-extrabold text-[#0B3D62]">
              Money Flow
            </Text>
            <Text className="mt-0.5 text-[12px] text-[#5B7C93]">
              Who pays you, and who you pay
            </Text>
          </View>
        </View>

        {/* "You" node — the center of the flow */}
        <View className="mb-5 items-center">
          <View className="h-[72px] w-[72px] rounded-full" style={cardShadow}>
            <View className="h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white/70">
              <BlurView
                intensity={35}
                tint="default"
                style={[StyleSheet.absoluteFill, { borderRadius: 36 }]}
              />
              <LinearGradient
                colors={['rgba(32,184,121,0.35)', 'rgba(240,79,56,0.3)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 36 }]}
              />
              <Ionicons name="person" size={30} color="#0B3D62" />
            </View>
          </View>
          <Text className="mt-2 text-[13px] font-bold text-[#0B3D62]">
            You're at the center
          </Text>
        </View>

        {/* Get / Give summary tiles */}
        <View className="mb-5 flex-row gap-3">
          <View className="flex-1 rounded-[22px] border border-[#149C73]/25 bg-[#E7F7F2]/70 p-4">
            <View className="mb-2 h-9 w-9 items-center justify-center rounded-full bg-[#20B879]">
              <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
            </View>
            <Text className="text-[12px] font-medium text-[#15866C]">
              You Get
            </Text>
            <Text className="mt-0.5 text-[20px] font-extrabold text-[#149C73]">
              + ₹8,400
            </Text>
            <Text className="mt-0.5 text-[11px] text-[#3E6E8E]">
              from 4 people
            </Text>
          </View>

          <View className="flex-1 rounded-[22px] border border-[#E84D39]/25 bg-[#FDEDEA]/70 p-4">
            <View className="mb-2 h-9 w-9 items-center justify-center rounded-full bg-[#F04F38]">
              <Ionicons name="arrow-down" size={16} color="#FFFFFF" />
            </View>
            <Text className="text-[12px] font-medium text-[#E05A45]">
              You Give
            </Text>
            <Text className="mt-0.5 text-[20px] font-extrabold text-[#E84D39]">
              - ₹5,200
            </Text>
            <Text className="mt-0.5 text-[11px] text-[#3E6E8E]">
              to 4 people
            </Text>
          </View>
        </View>

        {/* Get / Give toggle */}
        <View className="mb-4 flex-row rounded-full border border-white/60 bg-white/40 p-1">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setFlowTab('get')}
            className={`flex-1 items-center rounded-full py-2.5 ${
              isGet ? 'bg-[#149C73]' : ''
            }`}
          >
            <Text
              className={`text-[13px] font-bold ${
                isGet ? 'text-white' : 'text-[#3E6E8E]'
              }`}
            >
              You Get
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setFlowTab('give')}
            className={`flex-1 items-center rounded-full py-2.5 ${
              !isGet ? 'bg-[#E84D39]' : ''
            }`}
          >
            <Text
              className={`text-[13px] font-bold ${
                !isGet ? 'text-white' : 'text-[#3E6E8E]'
              }`}
            >
              You Give
            </Text>
          </TouchableOpacity>
        </View>

        {/* Flow rows — a colored stem stands in for the reference's
              curved connector lines, cheap to render and reads clearly
              on a narrow screen */}
        <View className="mb-7 rounded-[28px]" style={cardShadow}>
          <View className="overflow-hidden rounded-[28px] border border-white/60">
            <BlurView
              intensity={40}
              tint="default"
              style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            />
            <LinearGradient
              colors={
                isGet
                  ? ['rgba(255,255,255,0.62)', 'rgba(198,228,222,0.4)']
                  : ['rgba(255,255,255,0.62)', 'rgba(240,200,195,0.35)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            />
            <LinearGradient
              colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 0.4 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            />

            <View className="px-4">
              {flowRows.map((person, index) => (
                <TouchableOpacity
                  key={person.name}
                  activeOpacity={0.8}
                  className={
                    index === flowRows.length - 1
                      ? 'flex-row items-center py-4'
                      : 'flex-row items-center border-b border-white/40 py-4'
                  }
                >
                  <View
                    className={`mr-3 h-9 w-1 rounded-full ${
                      isGet ? 'bg-[#20B879]' : 'bg-[#F04F38]'
                    }`}
                  />
                  <View className="mr-3 h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/50">
                    <Ionicons
                      name={person.icon as any}
                      size={18}
                      color={isGet ? '#149C73' : '#E84D39'}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-[#0B3D62]">
                      {person.name}
                    </Text>
                    <Text className="mt-0.5 text-[12px] text-[#5B7C93]">
                      {person.tag}
                    </Text>
                  </View>
                  <Text
                    className={`text-[16px] font-extrabold ${
                      isGet ? 'text-[#149C73]' : 'text-[#E84D39]'
                    }`}
                  >
                    {isGet ? '+ ' : '- '}
                    {person.amount}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="#7C93A5"
                    className="ml-2"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Insight bar */}
        <View className="mb-7 rounded-[24px]" style={cardShadow}>
          <View className="overflow-hidden rounded-[24px] border border-white/60">
            <BlurView
              intensity={40}
              tint="default"
              style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
            />
            <LinearGradient
              colors={['rgba(255,255,255,0.65)', 'rgba(214,206,245,0.45)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
            />

            <View className="flex-row items-center justify-between p-4">
              <View className="mr-3 flex-1 flex-row items-center">
                <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-[#6C63FF]/20">
                  <Ionicons name="bulb" size={20} color="#6C63FF" />
                </View>
                <Text
                  numberOfLines={2}
                  className="flex-1 text-[13px] font-bold text-[#3B2FA0]"
                >
                  You received ₹3,200 more than you spent this month
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                className="flex-row items-center rounded-full border border-white/60 bg-white/55 px-3 py-2"
              >
                <Text className="mr-1 text-[12px] font-bold text-[#0B3D62]">
                  Details
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#0B3D62" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}