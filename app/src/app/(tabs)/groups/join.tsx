import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  BubbleBackdrop,
  ScreenHeader,
  LabeledField,
  GradientCTA,
  colors,
} from '@/components/groups/ui';
import {
  acceptInvitation,
  declineInvitation,
  fetchMyInvitations,
  type GroupInvitation,
} from '@/services/invitations.api';
import {
  joinGroupByCode,
  GroupsApiError,
} from '@/services/groups.api';

export default function JoinGroup() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ from?: string | string[] }>();
  const from = typeof params.from === 'string' ? params.from : undefined;

  const [inviteCode, setInviteCode] = useState('');
  const canJoin = inviteCode.trim().length > 0;
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [invLoading, setInvLoading] = useState(true);
  const [invError, setInvError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Back (header button AND Android system back/gesture) returns to
  // the caller (e.g. Preferences) instead of Home. Pushing this
  // nested tabs screen from another stack pops the caller, so a
  // plain pop would land on the tab root; intercept POP/GO_BACK and
  // replace with the recorded return route. Exactly one state moves.
  useEffect(() => {
    if (!from) return;
    const sub = navigation.addListener('beforeRemove', (e: any) => {
      const actionType: string | undefined = e?.data?.action?.type;
      if (actionType !== 'POP' && actionType !== 'GO_BACK') return;
      e.preventDefault();
      router.replace(from as never);
    });
    return sub;
  }, [from, navigation, router]);

  const loadInvitations = useCallback(async () => {
    if (mountedRef.current) {
      setInvLoading(true);
      setInvError(null);
    }
    try {
      const rows = await fetchMyInvitations();
      if (!mountedRef.current) return;
      setInvitations(rows);
    } catch (e) {
      if (!mountedRef.current) return;
      setInvitations([]);
      setInvError(e instanceof Error ? e.message : 'Could not load invitations.');
    } finally {
      if (mountedRef.current) setInvLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  useFocusEffect(
    useCallback(() => {
      void loadInvitations();
    }, [loadInvitations]),
  );

  const handleJoin = async () => {
    if (!canJoin || joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      const joined = await joinGroupByCode(inviteCode);
      if (!joined) {
        setJoinError('Could not join the group. Please try again.');
        return;
      }
      router.replace('/(tabs)/groups' as any);
    } catch (e) {
      setJoinError(
        e instanceof GroupsApiError
          ? e.message
          : 'Could not join the group. Please check the code.',
      );
    } finally {
      setJoining(false);
    }
  };

  const resolveInvitation = useCallback(
    async (id: string, kind: 'accept' | 'decline') => {
      if (resolvingId) return;
      if (mountedRef.current) {
        setResolvingId(id);
        setInvError(null);
      }
      try {
        if (kind === 'accept') {
          await acceptInvitation(id);
        } else {
          await declineInvitation(id);
        }
        if (!mountedRef.current) return;
        // Resolved rows leave the pending list immediately.
        setInvitations((prev) => prev.filter((inv) => inv.id !== id));
      } catch (e) {
        if (!mountedRef.current) return;
        setInvError(e instanceof Error ? e.message : 'Could not update the invitation.');
      } finally {
        if (mountedRef.current) setResolvingId(null);
      }
    },
    [resolvingId],
  );

  return (
    <BubbleBackdrop>
      <ScreenHeader title="Join a Group" />
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="mb-5 text-[14px]" style={{ color: colors.textMuted }}>
          Enter the invite code or link shared by a group member.
        </Text>
        <LabeledField
          label="Invite Code or Link"
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="e.g., ABC123"
          autoCapitalize="none"
        />
        <View style={{ marginTop: 8 }}>
          <GradientCTA onPress={() => void handleJoin()} disabled={!canJoin || joining} icon={null}>
            <Text className="text-white text-[15px] font-bold">
              {joining ? 'Joining…' : 'Join Group'}
            </Text>
          </GradientCTA>
        </View>

        {joinError ? (
          <View className="mt-3 rounded-2xl border border-red-300/50 bg-white/50 px-4 py-3">
            <Text className="text-center text-[13px] font-medium text-red-600">
              {joinError}
            </Text>
          </View>
        ) : null}

        {/* Pending invitations (real backend data, never mock) */}
        <Text className="mt-8 mb-3 text-[15px] font-bold" style={{ color: colors.textDark }}>
          Pending Invitations
        </Text>
        {invLoading ? (
          <View className="items-center rounded-[20px] border border-white/40 bg-white/40 px-4 py-6">
            <ActivityIndicator size="small" color={colors.textDark} />
            <Text className="mt-2 text-[13px]" style={{ color: colors.textMuted }}>
              Loading invitations...
            </Text>
          </View>
        ) : invError && invitations.length === 0 ? (
          <View className="items-center rounded-[20px] border border-red-300/50 bg-white/50 px-4 py-5">
            <Text className="text-center text-[13px] font-medium text-red-600">
              {invError}
            </Text>
            <TouchableOpacity
              onPress={() => void loadInvitations()}
              activeOpacity={0.7}
              className="mt-3 rounded-full bg-[#0B3D62] px-4 py-2"
            >
              <Text className="text-[13px] font-bold text-white">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : invitations.length === 0 ? (
          <View className="items-center rounded-[20px] border border-white/40 bg-white/40 px-4 py-6">
            <Ionicons name="mail-open-outline" size={26} color={colors.textMuted} />
            <Text className="mt-2 text-[14px] font-semibold" style={{ color: colors.textDark }}>
              No pending invitations
            </Text>
            <Text className="mt-1 text-[12px]" style={{ color: colors.textMuted }}>
              New group invites will appear here.
            </Text>
          </View>
        ) : (
          invitations.map((inv) => {
            const busy = resolvingId === inv.id;
            return (
              <View
                key={inv.id}
                className="mb-3 rounded-[20px] border border-white/40 bg-white/50 px-4 py-4"
              >
                <Text className="text-[16px] font-bold" style={{ color: colors.textDark }}>
                  {inv.group_name}
                </Text>
                <Text className="mt-1 text-[13px]" style={{ color: colors.textMuted }}>
                  {inv.invited_by ? `Invited by ${inv.invited_by}` : 'You are invited'}
                  {`  ·  Code: ${inv.invite_code}`}
                </Text>
                <View className="mt-3 flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => void resolveInvitation(inv.id, 'accept')}
                    disabled={busy}
                    activeOpacity={0.8}
                    className={`flex-1 items-center justify-center rounded-[16px] py-3 ${busy ? 'bg-[#00B894]/60' : 'bg-[#00B894]'}`}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-[14px] font-bold text-white">Accept</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void resolveInvitation(inv.id, 'decline')}
                    disabled={busy}
                    activeOpacity={0.8}
                    className="flex-1 items-center justify-center rounded-[16px] border border-[#D5DEE5] bg-white py-3"
                  >
                    <Text className="text-[14px] font-bold text-[#4B5A66]">Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        {invError && invitations.length > 0 ? (
          <Text className="mt-2 text-center text-[12px] text-red-600">
            {invError}
          </Text>
        ) : null}
      </ScrollView>
    </BubbleBackdrop>
  );
}
