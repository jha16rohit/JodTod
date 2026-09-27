import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView, BlurTargetView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  buildInviteLink,
  fetchGroupDetail,
  fetchMyGroups,
  GroupsApiError,
} from '@/services/groups.api';

const GREEN = '#34D399';
const CORAL = '#FB7185';

type Step = 'form' | 'groups' | 'shared';

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

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | null;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-[13px] font-bold text-white/80">{label}</Text>
      {children}
      {error ? (
        <Text className="mt-1.5 text-[12px] font-semibold" style={{ color: CORAL }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const inputClass =
  'rounded-xl border border-white/20 bg-white/10 px-3.5 py-3 text-[15px] text-white';

type GroupOption = { id: string; name: string; memberCount: number };

/**
 * Add Member drives the real backend membership path: group membership
 * is granted when the invited person joins with the group's invite code
 * (POST /api/groups/join), so this screen collects who to invite,
 * resolves the group's live invite code, and shares it with them.
 * No member row is ever faked locally.
 */
export default function AddMember() {
  const router = useRouter();
  const { groupId: presetGroupId } = useLocalSearchParams<{ groupId?: string }>();
  const backgroundRef = useRef<View>(null);

  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [touched, setTouched] = useState(false);

  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    typeof presetGroupId === 'string' ? presetGroupId : null,
  );
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteGroupName, setInviteGroupName] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      setGroupsLoading(true);
      setGroupsError(null);
      try {
        const rows = await fetchMyGroups();
        setGroups(
          rows.map((g) => ({
            id: g.id,
            name: g.name,
            memberCount: g.member_count,
          })),
        );
      } catch (e) {
        setGroups([]);
        setGroupsError(
          e instanceof Error ? e.message : 'Could not load groups.',
        );
      } finally {
        setGroupsLoading(false);
      }
    })();
  }, []);

  const nameError =
    touched && name.trim().length === 0 ? 'Enter a name' : null;
  const formValid = name.trim().length > 0 && !nameError;

  const loadInviteCode = async (id: string) => {
    setCodeLoading(true);
    setCodeError(null);
    try {
      const detail = await fetchGroupDetail(id);
      if (!detail) {
        setCodeError('Group not found.');
        return;
      }
      if (!detail.invite_code) {
        setCodeError('This group has no invite code.');
        return;
      }
      setInviteCode(detail.invite_code);
      setInviteGroupName(detail.name);
      setStep('shared');
    } catch (e) {
      setCodeError(
        e instanceof GroupsApiError
          ? e.message
          : 'Could not load the invite code.',
      );
    } finally {
      setCodeLoading(false);
    }
  };

  const submitPerson = () => {
    setTouched(true);
    if (!formValid) return;
    if (typeof presetGroupId === 'string' && presetGroupId) {
      setSelectedGroupId(presetGroupId);
      void loadInviteCode(presetGroupId);
      return;
    }
    setStep('groups');
  };

  const inviteLink = inviteCode ? buildInviteLink(inviteCode) : null;

  const copyLink = async () => {
    if (!inviteLink) return;
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const shareLink = async () => {
    if (!inviteLink) return;
    try {
      await Share.share({
        message: `Hi ${name.trim()}, join my group "${inviteGroupName}" on JodTod: ${inviteLink}`,
      });
    } catch {
      Alert.alert('Could not share invite');
    }
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View className="flex-row items-center px-4 pb-2 pt-1">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10"
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View className="ml-3 flex-1">
              <Text className="text-[19px] font-extrabold text-white">
                Add Member
              </Text>
              <Text className="text-[12px] text-white/65" numberOfLines={1}>
                Invite someone with the group link
              </Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            className="px-4"
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            {step === 'form' && (
              <GlassShell radius={22} blurTarget={backgroundRef}>
                <View className="p-4">
                  <Field label="Name *" error={nameError}>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Rahul Sharma"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Phone or Email (optional, for your reference)">
                    <TextInput
                      value={contact}
                      onChangeText={setContact}
                      placeholder="+91 98765 43210"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      keyboardType="default"
                      autoCapitalize="none"
                      className={inputClass}
                    />
                  </Field>
                  <Text className="mb-3 text-[12px] text-white/60">
                    They join with the group invite link on the next step —
                    membership is created by the backend when they accept.
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={submitPerson}
                    disabled={!formValid || codeLoading}
                    className="mt-1 w-full"
                    style={{ opacity: formValid && !codeLoading ? 1 : 0.45 }}
                  >
                    <LinearGradient
                      colors={formValid && !codeLoading ? ['#34D399', '#0E9F6E'] : ['#3a4a52', '#2b363c']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ borderRadius: 16 }}
                    >
                      <View className="items-center py-3.5">
                        <Text className="text-[16px] font-extrabold text-white">
                          {codeLoading ? 'Loading invite…' : 'Continue'}
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                  {codeError ? (
                    <Text className="mt-2 text-center text-[12px] font-semibold" style={{ color: CORAL }}>
                      {codeError}
                    </Text>
                  ) : null}
                </View>
              </GlassShell>
            )}

            {step === 'groups' && (
              <View>
                <Text className="mb-3 text-[14px] text-white/70">
                  Invite {name.trim()} to
                </Text>
                {groupsLoading ? (
                  <GlassShell radius={22} blurTarget={backgroundRef}>
                    <View className="items-center p-6">
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    </View>
                  </GlassShell>
                ) : groupsError ? (
                  <GlassShell radius={22} blurTarget={backgroundRef}>
                    <View className="items-center p-6">
                      <Text className="text-[14px] font-bold text-white">
                        Could not load groups
                      </Text>
                      <Text className="mt-1 text-[13px] text-white/65">
                        {groupsError}
                      </Text>
                    </View>
                  </GlassShell>
                ) : (
                  groups.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      activeOpacity={0.85}
                      disabled={codeLoading}
                      onPress={() => {
                        setSelectedGroupId(g.id);
                        void loadInviteCode(g.id);
                      }}
                      className="mb-2.5"
                    >
                      <GlassShell radius={22} blurTarget={backgroundRef}>
                        <View className="flex-row items-center p-4">
                          <View
                            className="h-12 w-12 items-center justify-center rounded-full border border-white/25"
                            style={{ backgroundColor: 'rgba(52,211,153,0.16)' }}
                          >
                            <Ionicons name="people" size={22} color="#FFFFFF" />
                          </View>
                          <View className="ml-3 min-w-0 flex-1">
                            <Text
                              className="text-[16px] font-extrabold text-white"
                              numberOfLines={1}
                            >
                              {g.name}
                            </Text>
                            <Text className="mt-0.5 text-[12px] text-white/65">
                              {g.memberCount} members
                            </Text>
                          </View>
                          {codeLoading && selectedGroupId === g.id ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Ionicons
                              name="chevron-forward"
                              size={18}
                              color="rgba(255,255,255,0.6)"
                            />
                          )}
                        </View>
                      </GlassShell>
                    </TouchableOpacity>
                  ))
                )}
                {codeError ? (
                  <Text className="mt-2 text-center text-[12px] font-semibold" style={{ color: CORAL }}>
                    {codeError}
                  </Text>
                ) : null}
              </View>
            )}

            {step === 'shared' && inviteLink && (
              <View className="items-center pt-6">
                <View
                  className="h-20 w-20 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: 'rgba(52,211,153,0.18)',
                    shadowColor: GREEN,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.7,
                    shadowRadius: 20,
                    elevation: 10,
                  }}
                >
                  <Ionicons name="link" size={36} color="#FFFFFF" />
                </View>
                <Text className="mt-4 text-[22px] font-extrabold text-white">
                  Invite ready
                </Text>
                <Text className="mt-1.5 px-6 text-center text-[14px] text-white/75">
                  Share this link with {name.trim()} to invite them to{' '}
                  {inviteGroupName || selectedGroup?.name}. They will appear
                  under Members once they join.
                </Text>
                <GlassShell radius={22} blurTarget={backgroundRef}>
                  <View className="mt-5 w-full flex-row items-center p-4">
                    <Text className="flex-1 text-[13px] font-semibold text-white" numberOfLines={1}>
                      {inviteLink}
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => void copyLink()}
                      className="ml-2"
                    >
                      <Ionicons
                        name={copied ? 'checkmark' : 'copy-outline'}
                        size={18}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  </View>
                </GlassShell>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => void shareLink()}
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
                        Share Invite
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    selectedGroupId &&
                    router.replace(`/(tabs)/groups/${selectedGroupId}` as any)
                  }
                  className="mt-2.5 w-full items-center rounded-2xl border border-white/20 bg-white/10 py-3.5"
                >
                  <Text className="text-[15px] font-bold text-white">Open Group</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
