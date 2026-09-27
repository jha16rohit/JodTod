import React, { useRef, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import {
  getGroupByJoinToken,
  joinGroupByToken,
  useGroups,
} from '../lib/mockGroups';

const GREEN = '#34D399';
const CORAL = '#FB7185';

function GlassShell({
  children,
  radius,
  blurTarget,
}: {
  children: React.ReactNode;
  radius: number;
  blurTarget: React.RefObject<View | null>;
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
      ]}
    >
      <BlurView
        blurTarget={blurTarget}
        blurMethod="dimezisBlurView"
        intensity={55}
        tint="dark"
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(10,35,55,0.42)', borderRadius: radius },
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

export default function JoinGroup() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { user } = useAuth();
  const backgroundRef = useRef<View>(null);
  const allGroups = useGroups();
  void allGroups;
  const [joined, setJoined] = useState(false);
  const [failed, setFailed] = useState(false);

  const cleanToken = typeof token === 'string' ? token.trim() : '';
  const group = cleanToken ? getGroupByJoinToken(cleanToken) : undefined;
  const alreadyMember = group?.members.some((m) => m.isYou) ?? false;

  const doJoin = () => {
    if (!cleanToken) return;
    const displayName = user?.name?.split(' ')[0] ?? 'Rohit';
    const res = joinGroupByToken(cleanToken, displayName);
    if (res.status === 'joined') {
      setJoined(true);
    } else if (res.status === 'already') {
      // No-op: screen already shows the member state.
    } else {
      setFailed(true);
    }
  };

  const openGroup = (groupId: string) => {
    router.replace(`/(tabs)/groups/${groupId}` as any);
  };

  return (
    <View style={{ flex: 1 }}>
      <BlurTargetView ref={backgroundRef} style={StyleSheet.absoluteFill}>
        <Image
          source={require('../../assets/images/jodtod/background_home.png')}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        />
      </BlurTargetView>

      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View className="flex-row items-center px-4 pb-2 pt-1">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10"
          >
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="ml-3 text-[19px] font-extrabold text-white">
            Join Group
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          className="px-4"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {!group || failed ? (
            <GlassShell radius={22} blurTarget={backgroundRef}>
              <View className="items-center p-6">
                <View
                  className="h-16 w-16 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(251,113,133,0.16)' }}
                >
                  <Ionicons name="alert-circle" size={32} color={CORAL} />
                </View>
                <Text className="mt-3 text-[17px] font-extrabold text-white">
                  Invalid invitation
                </Text>
                <Text className="mt-1 px-4 text-center text-[13px] text-white/70">
                  This group invitation is no longer valid.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.back()}
                  className="mt-4 rounded-full border border-white/20 bg-white/10 px-6 py-2.5"
                >
                  <Text className="text-[14px] font-bold text-white">Cancel</Text>
                </TouchableOpacity>
              </View>
            </GlassShell>
          ) : joined || alreadyMember ? (
            <GlassShell radius={22} blurTarget={backgroundRef}>
              <View className="items-center p-6">
                <View
                  className="h-16 w-16 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: 'rgba(52,211,153,0.18)',
                    shadowColor: GREEN,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 14,
                    elevation: 8,
                  }}
                >
                  <Ionicons name="checkmark" size={32} color="#FFFFFF" />
                </View>
                <Text className="mt-3 text-[17px] font-extrabold text-white">
                  {joined ? `Joined ${group.name}` : 'Already a member'}
                </Text>
                <Text className="mt-1 px-4 text-center text-[13px] text-white/70">
                  {joined
                    ? `Welcome to ${group.name}.`
                    : `You are already a member of ${group.name}.`}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => openGroup(group.id)}
                  className="mt-4 w-full"
                >
                  <LinearGradient
                    colors={['#34D399', '#0E9F6E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ borderRadius: 16 }}
                  >
                    <View className="items-center py-3.5">
                      <Text className="text-[15px] font-extrabold text-white">
                        Open Group
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </GlassShell>
          ) : (
            <GlassShell radius={22} blurTarget={backgroundRef}>
              <View className="items-center p-6">
                <View
                  className="h-16 w-16 items-center justify-center rounded-full border border-white/25"
                  style={{ backgroundColor: 'rgba(52,211,153,0.16)' }}
                >
                  <Ionicons name="people" size={30} color="#FFFFFF" />
                </View>
                <Text className="mt-3 text-[22px] font-extrabold text-white">
                  {group.name}
                </Text>
                <Text className="mt-1 text-[14px] text-white/70">
                  You&apos;ve been invited to join this group.
                </Text>
                <Text className="mt-0.5 text-[13px] text-white/60">
                  {group.members.length} members
                </Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={doJoin}
                  className="mt-5 w-full"
                >
                  <LinearGradient
                    colors={['#34D399', '#0E9F6E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ borderRadius: 16 }}
                  >
                    <View className="items-center py-3.5">
                      <Text className="text-[15px] font-extrabold text-white">
                        Join Group
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.back()}
                  className="mt-2.5 w-full items-center rounded-2xl border border-white/20 bg-white/10 py-3.5"
                >
                  <Text className="text-[15px] font-bold text-white">Cancel</Text>
                </TouchableOpacity>
              </View>
            </GlassShell>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
