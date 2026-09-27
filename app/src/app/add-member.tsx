import React, { useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView, BlurTargetView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  addMemberToGroup,
  createPerson,
  isValidEmail,
  isValidPhone,
  memberStatus,
  useGroups,
  type Group,
  type Member,
  type Person,
} from '../lib/mockGroups';

const GREEN = '#34D399';
const CORAL = '#FB7185';

type Step = 'form' | 'created' | 'groups' | 'added';

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

export default function AddMember() {
  const router = useRouter();
  const { groupId: presetGroupId } = useLocalSearchParams<{ groupId?: string }>();
  const backgroundRef = useRef<View>(null);
  const allGroups = useGroups();

  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [person, setPerson] = useState<Person | null>(null);
  const [alreadyExisted, setAlreadyExisted] = useState(false);
  const [addedGroup, setAddedGroup] = useState<Group | null>(null);
  const [addedMember, setAddedMember] = useState<Member | null>(null);
  const [addedIsNew, setAddedIsNew] = useState(true);

  const nameError =
    touched && name.trim().length === 0 ? 'Enter a name' : null;
  const phoneError =
    phone.trim().length > 0 && !isValidPhone(phone)
      ? 'Enter a valid 10-digit phone number'
      : null;
  const emailError =
    email.trim().length > 0 && !isValidEmail(email)
      ? 'Enter a valid email address'
      : null;
  const formValid = !nameError && !phoneError && !emailError && name.trim().length > 0;

  const submitPerson = () => {
    setTouched(true);
    if (!formValid) return;
    const { person: p, isNew } = createPerson({
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
    });
    setPerson(p);
    setAlreadyExisted(!isNew);
    // From a group invite: skip group selection, add straight to that group.
    if (typeof presetGroupId === 'string' && presetGroupId) {
      const res = addMemberToGroup(presetGroupId, p.id);
      const g = allGroups.find((x) => x.id === presetGroupId) ?? null;
      setAddedGroup(g);
      setAddedMember(res.member);
      setAddedIsNew(res.isNew);
      setStep('added');
      return;
    }
    setStep('created');
  };

  const addToGroup = (group: Group) => {
    if (!person) return;
    const res = addMemberToGroup(group.id, person.id);
    setAddedGroup(group);
    setAddedMember(res.member);
    setAddedIsNew(res.isNew);
    setStep('added');
  };

  const selectable = allGroups.filter((g) => g.status === 'Active');

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
                Add someone to JodTod
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
                  <Field label="Phone Number (optional)" error={phoneError}>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+91 98765 43210"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      keyboardType="phone-pad"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Email (optional)" error={emailError}>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="rahul@example.com"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className={inputClass}
                    />
                  </Field>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={submitPerson}
                    disabled={!formValid}
                    className="mt-1 w-full"
                    style={{ opacity: formValid ? 1 : 0.45 }}
                  >
                    <LinearGradient
                      colors={formValid ? ['#34D399', '#0E9F6E'] : ['#3a4a52', '#2b363c']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ borderRadius: 16 }}
                    >
                      <View className="items-center py-3.5">
                        <Text className="text-[16px] font-extrabold text-white">
                          Add Member
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </GlassShell>
            )}

            {step === 'created' && person && (
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
                  <Ionicons name="checkmark" size={42} color="#FFFFFF" />
                </View>
                <Text className="mt-4 text-[22px] font-extrabold text-white">
                  Member Added
                </Text>
                <Text className="mt-1.5 px-6 text-center text-[14px] text-white/75">
                  {person.name} has been added to your JodTod members
                  {alreadyExisted ? ' (already existed — no duplicate created)' : ''}.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setStep('groups')}
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
                        Add to a Group
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.back()}
                  className="mt-2.5 w-full items-center rounded-2xl border border-white/20 bg-white/10 py-3.5"
                >
                  <Text className="text-[15px] font-bold text-white">Done</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'groups' && person && (
              <View>
                <Text className="mb-3 text-[14px] text-white/70">
                  Add {person.name} to
                </Text>
                {selectable.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    activeOpacity={0.85}
                    onPress={() => addToGroup(g)}
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
                            {g.members.length} members
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="rgba(255,255,255,0.6)"
                        />
                      </View>
                    </GlassShell>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {step === 'added' && addedGroup && addedMember && (
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
                  <Ionicons name="checkmark" size={42} color="#FFFFFF" />
                </View>
                <Text className="mt-4 text-[22px] font-extrabold text-white">
                  Added to {addedGroup.name}
                </Text>
                <Text className="mt-1.5 px-6 text-center text-[14px] text-white/75">
                  {addedMember.name} is now{' '}
                  {memberStatus(addedMember) === 'pending'
                    ? 'a pending member — the invitation is saved and will link when they join'
                    : 'an active member'}
                  {!addedIsNew ? ' (was already in this group)' : ''}.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    router.replace(`/(tabs)/groups/${addedGroup.id}` as any)
                  }
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
                        Open Group
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.back()}
                  className="mt-2.5 w-full items-center rounded-2xl border border-white/20 bg-white/10 py-3.5"
                >
                  <Text className="text-[15px] font-bold text-white">Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
