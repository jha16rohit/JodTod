import { ReactNode } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ---------------------------------------------------------------------------
// Shared palette — copied 1:1 from login.tsx so every Groups screen stays on
// the same visual language (glass cards, mint-green gradient CTAs).
// ---------------------------------------------------------------------------

export const colors = {
  brandLight: '#00E6A8',
  brand: '#00B894',
  brandDark: '#00896B',
  textDark: '#14212B',
  textMuted: '#4B5A66',
  headerTitle: '#0B3D62',
  headerSub: '#2A5A82',
  inputBorder: 'rgba(255,255,255,0.45)',
  danger: '#E85D5D',
  dangerBg: 'rgba(232,93,93,0.12)',
  success: '#00B894',
  successBg: 'rgba(0,184,148,0.12)',
  neutralBg: 'rgba(75,90,102,0.10)',
  bg: '#F4FAF8',
};

export const CARD_PADDING_H = 20;

// ---------------------------------------------------------------------------
// Page background — soft mint/blue wash standing in for the bubble artwork
// used on the login/onboarding screens. Swap the LinearGradient for an
// ImageBackground + require('.../background_onboarding.png') once the asset
// path for this route depth is wired up.
// ---------------------------------------------------------------------------

export function BubbleBackdrop({ children }: { children: ReactNode }) {
  return (
    <LinearGradient
      colors={['#EAF9F3', '#F4FAFC', '#FFFFFF']}
      style={{ flex: 1 }}
    >
      {children}
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// Glass card — bg-white/20 + blur + inner bg-white/25, matches login.tsx
// ---------------------------------------------------------------------------

export function GlassCard({
  children,
  className = 'rounded-[24px]',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: any;
}) {
  return (
    <View
      className={`overflow-hidden border border-white/40 bg-white/30 ${className}`}
      style={style}
    >
      <BlurView intensity={20} tint="light" className="absolute inset-0" />
      <View className="bg-white/25">{children}</View>
    </View>
  );
}

export function GlassInput({ children, style }: { children: ReactNode; style?: any }) {
  return (
    <View
      className="overflow-hidden rounded-2xl border border-white/40 bg-white/40"
      style={style}
    >
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Gradient CTA — same capsule pill as login.tsx
// ---------------------------------------------------------------------------

const CTA_HEIGHT = 52;

export function GradientCTA({
  children,
  onPress,
  disabled,
  variant = 'solid',
  icon,
  outlineColor,
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'solid' | 'outline' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap | null;
  outlineColor?: string;
}) {
  const radius = CTA_HEIGHT / 2;

  if (variant === 'outline') {
    const bc = outlineColor ?? colors.brand;
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
        className="flex-row items-center justify-center border"
        style={{
          height: CTA_HEIGHT,
          borderRadius: radius,
          borderColor: bc,
          gap: 8,
        }}
      >
        {icon ? <Ionicons name={icon} size={17} color={bc === colors.brand ? colors.brandDark : bc} /> : null}
        {children}
      </TouchableOpacity>
    );
  }

  if (variant === 'danger') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
        className="flex-row items-center justify-center"
        style={{
          height: CTA_HEIGHT,
          borderRadius: radius,
          backgroundColor: colors.danger,
          gap: 8,
        }}
      >
        {icon ? <Ionicons name={icon} size={17} color="#fff" /> : null}
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.9}
      style={{
        borderRadius: radius,
        shadowColor: disabled ? 'transparent' : colors.brand,
        shadowOpacity: disabled ? 0 : 0.4,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: disabled ? 0 : 6,
      }}
    >
      <LinearGradient
        colors={disabled ? ['#D7E0E0', '#C7D2D2'] : [colors.brandLight, colors.brand, colors.brandDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          height: CTA_HEIGHT,
          borderRadius: radius,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: 18,
        }}
      >
        {children}
        {icon ? <Ionicons name={icon} size={17} color={disabled ? colors.textMuted : '#fff'} /> : null}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Screen header — back button, title, optional right action. Used on every
// sub-page (Members, Expenses, Settings, Invite, Edit...)
// ---------------------------------------------------------------------------

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
}) {
  const router = useRouter();
  return (
    <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
      <TouchableOpacity
        onPress={onBack ?? (() => router.back())}
        className="w-10 h-10 rounded-full items-center justify-center bg-white/60 border border-white/50"
      >
        <Ionicons name="chevron-back" size={20} color={colors.textDark} />
      </TouchableOpacity>

      <View className="items-center flex-1 mx-2">
        <Text className="text-base font-bold" style={{ color: colors.textDark }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-[11px]" style={{ color: colors.textMuted }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightIcon ? (
        <TouchableOpacity
          onPress={onRightPress}
          className="w-10 h-10 rounded-full items-center justify-center bg-white/60 border border-white/50"
        >
          <Ionicons name={rightIcon} size={19} color={colors.textDark} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Avatar — gradient initials circle, no image asset required
// ---------------------------------------------------------------------------

const AVATAR_PALETTE = [
  ['#FF9A8B', '#FF6A88'],
  ['#00E6A8', '#00896B'],
  ['#4FACFE', '#00A9E0'],
  ['#F6D365', '#FDA085'],
  ['#A18CD1', '#FBC2EB'],
  ['#84FAB0', '#8FD3F4'],
];

export function Avatar({
  name,
  size = 36,
  uri,
}: {
  name: string;
  size?: number;
  uri?: string;
}) {
  const idx = name.charCodeAt(0) % AVATAR_PALETTE.length;
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <LinearGradient
      colors={AVATAR_PALETTE[idx] as [string, string]}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.36 }}>{initials}</Text>
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// Status pill (Active / Completed / Archived)
// ---------------------------------------------------------------------------

export type GroupStatus = 'Active' | 'Completed' | 'Archived';

const STATUS_STYLE: Record<GroupStatus, { bg: string; fg: string }> = {
  Active: { bg: colors.successBg, fg: colors.brandDark },
  Completed: { bg: 'rgba(74,144,226,0.12)', fg: '#3268A6' },
  Archived: { bg: colors.neutralBg, fg: colors.textMuted },
};

export function StatusPill({ status }: { status: GroupStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: s.bg }}>
      <Text className="text-[11px] font-bold" style={{ color: s.fg }}>
        {status}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Settings-style row — icon, label, chevron. Used in Group Settings, and
// Group Details quick links.
// ---------------------------------------------------------------------------

export function ActionRow({
  icon,
  label,
  onPress,
  danger,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  danger?: boolean;
  iconColor?: string;
}) {
  const fg = danger ? colors.danger : colors.textDark;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center justify-between py-3.5 border-b border-white/40"
    >
      <View className="flex-row items-center gap-3">
        <View
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: danger ? colors.dangerBg : colors.successBg }}
        >
          <Ionicons name={icon} size={17} color={iconColor ?? (danger ? colors.danger : colors.brandDark)} />
        </View>
        <Text className="text-sm font-semibold" style={{ color: fg }}>
          {label}
        </Text>
      </View>
      {!danger && <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Labeled text field wrapper (label + GlassInput + icon)
// ---------------------------------------------------------------------------

export function LabeledField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text className="text-[13px] mb-2 font-semibold" style={{ color: colors.textMuted }}>
        {label}
      </Text>
      <GlassInput>
        <View
          className="flex-row items-center px-3.5"
          style={{ minHeight: multiline ? 90 : 52, alignItems: multiline ? 'flex-start' : 'center' }}
        >
          {icon ? (
            <Ionicons
              name={icon}
              size={17}
              color={colors.brandDark}
              style={{ marginRight: 10, marginTop: multiline ? 14 : 0 }}
            />
          ) : null}
          <TextInput
            className="flex-1 text-sm"
            style={{ color: colors.textDark, paddingVertical: multiline ? 14 : 0 }}
            placeholder={placeholder}
            placeholderTextColor="rgba(20,33,43,0.4)"
            value={value}
            onChangeText={onChangeText}
            multiline={multiline}
            keyboardType={keyboardType}
          />
        </View>
      </GlassInput>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Simple money formatter (₹)
// ---------------------------------------------------------------------------

export function inr(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}
