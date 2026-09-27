import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
  ToastAndroid,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

import {
  BubbleBackdrop,
  ScreenHeader,
  GlassCard,
  GradientCTA,
  colors,
} from '@/components/groups/ui';
import { InviteAppIcon } from '@/components/groups/InviteAppIcon';
import {
  buildInviteLink,
  fetchGroupDetail,
  rotateInviteCode,
  GroupsApiError,
  type GroupDetail,
} from '@/services/groups.api';

type Tab = 'link' | 'qr';

export default function InviteMembers() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Array.isArray(id) ? id[0] : (id as string);

  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('link');
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!groupId) {
      setError('Group not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const group = await fetchGroupDetail(groupId);
      if (!mountedRef.current) return;
      if (!group) {
        setError('Group not found.');
        setDetail(null);
      } else {
        setDetail(group);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : 'Could not load group.');
      setDetail(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void load();
  }, [load]);

  const inviteLink = detail?.invite_code
    ? buildInviteLink(detail.invite_code)
    : null;

  const copyLink = async () => {
    if (!inviteLink) return;
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    if (Platform.OS === 'android') ToastAndroid.show('Link copied', ToastAndroid.SHORT);
  };

  const shareLink = async () => {
    if (!inviteLink || !detail) return;
    try {
      await Share.share({
        message: `Join my group "${detail.name}" on JodTod: ${inviteLink}`,
      });
    } catch {
      Alert.alert('Could not share link');
    }
  };

  const regenerate = useCallback(async () => {
    if (!groupId || rotating) return;
    setRotating(true);
    try {
      const code = await rotateInviteCode(groupId);
      if (!mountedRef.current) return;
      if (code) {
        setDetail((prev) =>
          prev ? { ...prev, invite_code: code } : prev,
        );
      }
      setCopied(false);
    } catch (e) {
      if (!mountedRef.current) return;
      if (e instanceof GroupsApiError && e.status === 403) {
        Alert.alert(
          'Admin only',
          'Only a group admin can generate a new invite link.',
        );
      } else {
        Alert.alert(
          'Could not refresh link',
          e instanceof Error ? e.message : 'Please try again.',
        );
      }
    } finally {
      if (mountedRef.current) setRotating(false);
    }
  }, [groupId, rotating]);

  if (loading) {
    return (
      <BubbleBackdrop>
        <ScreenHeader title="Invite" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color={colors.textDark} />
          <Text className="mt-3 text-sm" style={{ color: colors.textMuted }}>
            Loading invite…
          </Text>
        </View>
      </BubbleBackdrop>
    );
  }

  if (error || !detail) {
    return (
      <BubbleBackdrop>
        <ScreenHeader title="Invite" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm" style={{ color: colors.textMuted }}>
            {error ?? 'Group not found.'}
          </Text>
          <TouchableOpacity
            onPress={() => void load()}
            activeOpacity={0.7}
            className="mt-4 rounded-full px-5 py-2.5"
            style={{ backgroundColor: colors.brandDark }}
          >
            <Text className="text-[13px] font-bold text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      </BubbleBackdrop>
    );
  }

  return (
    <BubbleBackdrop>
      <ScreenHeader title={`Invite to ${detail.name}`} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-2">
          <View className="mb-6 rounded-2xl border border-white/40 bg-white/25 p-1 flex-row">
            {(['link', 'qr'] as Tab[]).map((t) => {
              const active = t === tab;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTab(t)}
                  className="flex-1 h-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: active ? colors.brand : 'transparent' }}
                >
                  <Text className="text-sm font-bold" style={{ color: active ? '#fff' : colors.textMuted }}>
                    {t === 'link' ? 'Share Link' : 'QR Code'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <GlassCard>
            <View className="items-center px-6 py-10">
              <View
                className="items-center justify-center rounded-full mb-5"
                style={{ width: 90, height: 90, backgroundColor: colors.successBg }}
              >
                <Ionicons name={tab === 'link' ? 'link' : 'qr-code-outline'} size={38} color={colors.brandDark} />
              </View>

              {tab === 'link' ? (
                <>
                  <Text className="text-base font-bold mb-1.5" style={{ color: colors.textDark }}>
                    Share Invite Link
                  </Text>
                  <Text className="text-[12.5px] text-center mb-5" style={{ color: colors.textMuted }}>
                    Anyone with this link can request to join this group.
                    New members appear under Members once they join.
                  </Text>

                  <View
                    className="flex-row items-center justify-between w-full rounded-2xl border border-white/50 px-4 py-3 mb-5"
                    style={{ backgroundColor: colors.neutralBg }}
                  >
                    <Text className="text-[13px] flex-1" style={{ color: colors.textDark }} numberOfLines={1}>
                      {inviteLink ?? 'No invite link available.'}
                    </Text>
                    {inviteLink ? (
                      <TouchableOpacity onPress={copyLink} className="ml-2">
                        <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.brandDark} />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <View style={{ width: '100%' }}>
                    <GradientCTA icon="share-social-outline" onPress={shareLink}>
                      <Text className="text-white text-[14px] font-bold">Share Link</Text>
                    </GradientCTA>
                  </View>
                </>
              ) : (
                <>
                  <Text className="text-base font-bold mb-1.5" style={{ color: colors.textDark }}>
                    Scan to Join
                  </Text>
                  <Text className="text-[12.5px] text-center mb-5" style={{ color: colors.textMuted }}>
                    Ask friends to scan this QR code with the JodTod scanner.
                  </Text>

                  <View
                    className="items-center justify-center rounded-2xl mb-5 bg-white p-3"
                    style={{ width: 204, height: 204 }}
                  >
                    {inviteLink ? (
                      <QRCode
                        value={inviteLink}
                        size={180}
                        backgroundColor="#FFFFFF"
                        color="#0B3D62"
                      />
                    ) : (
                      <Text className="text-[12px] px-4 text-center" style={{ color: colors.textMuted }}>
                        No invite link available.
                      </Text>
                    )}
                  </View>

                  <View style={{ width: '100%' }}>
                    <GradientCTA icon="share-social-outline" onPress={shareLink}>
                      <Text className="text-white text-[14px] font-bold">Share Instead</Text>
                    </GradientCTA>
                  </View>
                </>
              )}
            </View>
          </GlassCard>

          <Text className="text-[13px] font-semibold mt-6 mb-3" style={{ color: colors.textMuted }}>
            Invite via...
          </Text>
          <View className="flex-row gap-4">
            <InviteAppIcon icon="logo-whatsapp" label="WhatsApp" color="#25D366" onPress={shareLink} />
            <InviteAppIcon icon="link-outline" label="Copy Link" color={colors.brandDark} onPress={copyLink} />
            <InviteAppIcon icon="mail-outline" label="Gmail" color="#EA4335" onPress={shareLink} />
            <InviteAppIcon icon="ellipsis-horizontal" label="More" color={colors.textMuted} onPress={shareLink} />
          </View>

          <Text className="text-[13px] font-semibold mt-6 mb-3" style={{ color: colors.textMuted }}>
            Add a person directly
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(`/add-member?groupId=${detail.id}` as any)}
            className="rounded-2xl border border-white/50 bg-white/25 px-4 py-3.5 items-center"
          >
            <Text className="text-[13px] font-bold" style={{ color: colors.textDark }}>
              Add New Member
            </Text>
          </TouchableOpacity>

          <Text className="text-[12px] text-center mt-6" style={{ color: colors.textMuted }}>
            You can generate a new link anytime to invalidate the current one
            (admin only).
          </Text>
          <TouchableOpacity
            className="items-center mt-2 flex-row justify-center gap-1.5"
            onPress={() => void regenerate()}
            disabled={rotating}
          >
            {rotating ? (
              <ActivityIndicator size="small" color={colors.brandDark} />
            ) : (
              <Ionicons name="refresh" size={14} color={colors.brandDark} />
            )}
            <Text className="text-[12.5px] font-bold" style={{ color: colors.brandDark }}>
              {rotating ? 'Generating…' : 'Generate New Link'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BubbleBackdrop>
  );
}
