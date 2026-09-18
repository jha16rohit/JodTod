import { useState } from 'react';
import { View, Text, TouchableOpacity, Share, Platform, ToastAndroid, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import {
  BubbleBackdrop,
  ScreenHeader,
  GlassCard,
  GradientCTA,
  colors,
} from '@/components/groups/ui';
import { getGroup } from '@/lib/mockGroups';

type Tab = 'link' | 'qr';

export default function InviteMembers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = getGroup(id as string);
  const [tab, setTab] = useState<Tab>('link');
  const [copied, setCopied] = useState(false);

  if (!group) return null;

  const inviteLink = `https://jodtod.app/join/${group.id}`;

  const copyLink = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    if (Platform.OS === 'android') ToastAndroid.show('Link copied', ToastAndroid.SHORT);
  };

  const shareLink = async () => {
    try {
      await Share.share({ message: `Join my group "${group.name}" on JodTod: ${inviteLink}` });
    } catch (e) {
      Alert.alert('Could not share link');
    }
  };

  return (
    <BubbleBackdrop>
      <ScreenHeader title={`Invite to ${group.name}`} />

      <View className="px-5 pt-2">
        {/* Link / QR toggle */}
        <View className="mb-6 rounded-2xl border border-white/40 bg-white/40 p-1 flex-row">
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

        <GlassCard style={{ backgroundColor: '#fff' }}>
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
                  Anyone with this link can join this group.
                </Text>

                <View
                  className="flex-row items-center justify-between w-full rounded-2xl border border-white/50 px-4 py-3 mb-5"
                  style={{ backgroundColor: colors.neutralBg }}
                >
                  <Text className="text-[13px] flex-1" style={{ color: colors.textDark }} numberOfLines={1}>
                    {inviteLink}
                  </Text>
                  <TouchableOpacity onPress={copyLink} className="ml-2">
                    <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.brandDark} />
                  </TouchableOpacity>
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
                  Ask friends to scan this QR code with their camera.
                </Text>

                {/* Placeholder QR block — swap for a real QR (e.g. react-native-qrcode-svg) */}
                <View
                  className="items-center justify-center rounded-2xl mb-5"
                  style={{ width: 180, height: 180, backgroundColor: colors.neutralBg }}
                >
                  <Ionicons name="qr-code" size={110} color={colors.textDark} />
                </View>

                <View style={{ width: '100%' }}>
                  <GradientCTA icon="download-outline" onPress={() => {}}>
                    <Text className="text-white text-[14px] font-bold">Save QR Code</Text>
                  </GradientCTA>
                </View>
              </>
            )}
          </View>
        </GlassCard>

        {/* Invite via apps */}
        <Text className="text-[13px] font-semibold mt-6 mb-3" style={{ color: colors.textMuted }}>
          Invite via...
        </Text>
        <View className="flex-row gap-4">
          <InviteAppIcon icon="logo-whatsapp" label="WhatsApp" color="#25D366" onPress={shareLink} />
          <InviteAppIcon icon="link-outline" label="Copy Link" color={colors.brandDark} onPress={copyLink} />
          <InviteAppIcon icon="mail-outline" label="Gmail" color="#EA4335" onPress={shareLink} />
          <InviteAppIcon icon="ellipsis-horizontal" label="More" color={colors.textMuted} onPress={shareLink} />
        </View>

        <Text className="text-[12px] text-center mt-6" style={{ color: colors.textMuted }}>
          You can also generate a new link anytime if you want to invalidate the current one.
        </Text>
        <TouchableOpacity className="items-center mt-2 flex-row justify-center gap-1.5" onPress={() => {}}>
          <Ionicons name="refresh" size={14} color={colors.brandDark} />
          <Text className="text-[12.5px] font-bold" style={{ color: colors.brandDark }}>
            Generate New Link
          </Text>
        </TouchableOpacity>
      </View>
    </BubbleBackdrop>
  );
}

function InviteAppIcon({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} className="items-center flex-1">
      <View
        className="items-center justify-center rounded-2xl mb-1.5"
        style={{ width: 52, height: 52, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: colors.inputBorder }}
      >
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text className="text-[11px] font-semibold" style={{ color: colors.textMuted }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
