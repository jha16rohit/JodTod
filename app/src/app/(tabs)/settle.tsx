import { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

/* ────────────────────────────────────────────────────────────────────────
   THEME + GLASS PRIMITIVES
   ──────────────────────────────────────────────────────────────────────── */

const colors = {
  navy: '#0B3D62',
  navySoft: '#3E6E8E',
  muted: '#5B7C93',
  faint: '#8DA0B1',
  teal: '#149C73',
  tealBg: '#E7F7F2',
  red: '#F04F38',
  redBg: '#FDE3E8',
  orange: '#E0932E',
  orangeBg: '#FFF3DE',
  purple: '#6C63FF',
  purpleBg: '#EDEBFF',
  blue: '#2563EB',
  blueBg: '#DDEBFF',
};

const cardShadow = {
  shadowColor: colors.navy,
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.1,
  shadowRadius: 9,
  elevation: 4,
};

const glassBg = { backgroundColor: 'rgba(255,255,255,0.01)' };

const BACKGROUND_IMAGE = require('../../../assets/images/jodtod/background_onboarding.png');

function ScreenBackground() {
  return (
    <>
      <Image source={BACKGROUND_IMAGE} className="absolute inset-0 h-full w-full" resizeMode="cover" />
      <View className="absolute inset-0 bg-white/10" pointerEvents="none" />
    </>
  );
}

function GlassLayers({ radius = 24 }: { radius?: number }) {
  return (
    <>
      <BlurView intensity={40} tint="default" style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
      <LinearGradient
        colors={['rgba(255,255,255,0.62)', 'rgba(198,228,222,0.4)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.4 }}
        style={StyleSheet.absoluteFill}
      />
    </>
  );
}

function GlassCard({ children, radius = 24, style }: { children: React.ReactNode; radius?: number; style?: any }) {
  return (
    <View className="rounded-[24px]" style={[cardShadow, glassBg, style]}>
      <View className="overflow-hidden rounded-[24px] border border-white/60">
        <GlassLayers radius={radius} />
        <View className="p-4">{children}</View>
      </View>
    </View>
  );
}

function InfoRow({
  label,
  value,
  avatarUri,
  valueColor,
  last = false,
}: {
  label: string;
  value: string;
  avatarUri?: string;
  valueColor?: string;
  last?: boolean;
}) {
  return (
    <View className={`flex-row items-center justify-between py-3 ${last ? '' : 'border-b border-white/40'}`}>
      <Text className="text-[13px] font-semibold text-[#5B7C93]">{label}</Text>
      <View className="flex-row items-center">
        {avatarUri ? <Image source={{ uri: avatarUri }} className="mr-2 h-6 w-6 rounded-full" /> : null}
        <Text className="text-[14px] font-bold" style={{ color: valueColor ?? colors.navy }}>{value}</Text>
      </View>
    </View>
  );
}

function DetailHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between px-5 pb-4 pt-3">
      <View className="flex-row items-center">
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-full border border-white/60 overflow-hidden"
          style={[cardShadow, glassBg]}
        >
          <GlassLayers radius={20} />
          <View className="absolute inset-0 bg-white/40" />
          <Ionicons name="chevron-back" size={19} color={colors.navy} />
        </TouchableOpacity>
        <Text className="ml-3 text-[19px] font-extrabold text-[#0B3D62]">{title}</Text>
      </View>
      {right}
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
      className="items-center rounded-full py-4"
      style={[cardShadow, { backgroundColor: disabled ? '#A9C9BE' : colors.teal }]}
    >
      <Text className="text-[15px] font-extrabold text-white">{label}</Text>
    </TouchableOpacity>
  );
}

function OutlineButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className="items-center rounded-full border-2 py-3.5"
      style={{ borderColor: colors.teal }}
    >
      <Text className="text-[15px] font-extrabold" style={{ color: colors.teal }}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   DATA
   ──────────────────────────────────────────────────────────────────────── */

type GroupStatus = 'pending' | 'settled' | 'archived';

type Group = {
  id: string;
  name: string;
  image: string;
  members: number;
  dateRange: string;
  status: GroupStatus;
  pendingCount?: number;
  youOwe: number;
};

const groups: Group[] = [
  { id: 'goa', name: 'Goa Trip', image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400', members: 5, dateRange: 'Apr 10 – Apr 18, 2025', status: 'pending', pendingCount: 2, youOwe: 2450 },
  { id: 'flat', name: 'Flatmates', image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400', members: 4, dateRange: 'Jan 1, 2025 – Present', status: 'settled', youOwe: 0 },
  { id: 'manali', name: 'Manali Trip', image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=400', members: 6, dateRange: 'Dec 20 – Dec 28, 2024', status: 'pending', pendingCount: 3, youOwe: 1120 },
  { id: 'college', name: 'College Friends', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400', members: 8, dateRange: 'Aug 5 – Aug 12, 2024', status: 'settled', youOwe: 0 },
];

const tabOptions: { key: 'all' | GroupStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'settled', label: 'Settled' },
  { key: 'archived', label: 'Archived' },
];

const memberBalances = {
  before: [
    { name: 'Aman', avatar: 'https://i.pravatar.cc/100?img=13', status: 'owesYou' as const, amount: '₹1,200' },
    { name: 'Neha', avatar: 'https://i.pravatar.cc/100?img=14', status: 'owesYou' as const, amount: '₹980' },
    { name: 'Karan', avatar: 'https://i.pravatar.cc/100?img=15', status: 'youOwe' as const, amount: '₹680' },
    { name: 'Priya', avatar: 'https://i.pravatar.cc/100?img=16', status: 'owesYou' as const, amount: '₹270' },
    { name: 'Rohit', avatar: 'https://i.pravatar.cc/100?img=12', status: 'settled' as const, amount: '₹0' },
  ],
  after: [
    { name: 'Aman', avatar: 'https://i.pravatar.cc/100?img=13', status: 'owesYou' as const, amount: '₹1,880' },
    { name: 'Neha', avatar: 'https://i.pravatar.cc/100?img=14', status: 'owesYou' as const, amount: '₹980' },
    { name: 'Karan', avatar: 'https://i.pravatar.cc/100?img=15', status: 'settled' as const, amount: '₹0' },
    { name: 'Priya', avatar: 'https://i.pravatar.cc/100?img=16', status: 'owesYou' as const, amount: '₹270' },
    { name: 'Rohit', avatar: 'https://i.pravatar.cc/100?img=12', status: 'settled' as const, amount: '₹0' },
  ],
};

const suggestedPayments = [
  { from: 'Karan', to: 'Aman', avatar: 'https://i.pravatar.cc/100?img=15', amount: '₹680' },
  { from: 'Neha', to: 'Aman', avatar: 'https://i.pravatar.cc/100?img=14', amount: '₹980' },
];

const paymentMethods: { key: string; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; disabled?: boolean }[] = [
  { key: 'paid', icon: 'checkmark-circle', title: 'Mark as Paid', subtitle: 'I have paid Karan outside the app' },
  { key: 'upi', icon: 'card', title: 'Pay via UPI (Future)', subtitle: 'Pay directly through UPI', disabled: true },
  { key: 'partial', icon: 'radio-button-off', title: 'Record Partial Payment', subtitle: 'Enter a custom amount' },
  { key: 'note', icon: 'document-text', title: 'Add a Note', subtitle: 'Record payment details manually' },
];

const historyData = [
  { date: 'Apr 16, 2025', items: [{ from: 'You', to: 'Karan', amount: '₹680', label: 'Marked as paid', time: '8:45 PM' }] },
  { date: 'Apr 14, 2025', items: [{ from: 'Neha', to: 'Priya', amount: '₹750', label: 'Marked as paid', time: '6:12 PM' }] },
  { date: 'Apr 12, 2025', items: [{ from: 'Aman', to: 'Neha', amount: '₹1,200', label: 'Marked as paid', time: '2:30 PM' }] },
];

/* ────────────────────────────────────────────────────────────────────────
   NAVIGATION
   ──────────────────────────────────────────────────────────────────────── */

type Screen =
  | { name: 'main' }
  | { name: 'overview'; group: Group }
  | { name: 'suggestions'; group: Group }
  | { name: 'options'; group: Group; payTo: string; amount: string }
  | { name: 'confirm'; group: Group; payTo: string; amount: string; method: string }
  | { name: 'success'; group: Group; payTo: string; amount: string }
  | { name: 'updated'; group: Group }
  | { name: 'history'; group: Group }
  | { name: 'manual'; group: Group; payTo: string; amount: string }
  | { name: 'allSettled'; group: Group };

/* ────────────────────────────────────────────────────────────────────────
   SCREENS
   ──────────────────────────────────────────────────────────────────────── */

function MainScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [tab, setTab] = useState<'all' | GroupStatus>('all');
  const [query, setQuery] = useState('');

  const filtered = groups.filter((g) => {
    const matchesTab = tab === 'all' || g.status === tab;
    const matchesQuery = query.trim().length === 0 || g.name.toLowerCase().includes(query.toLowerCase());
    return matchesTab && matchesQuery;
  });

  const openGroup = (g: Group) => {
    if (g.status === 'settled') onNavigate({ name: 'allSettled', group: g });
    else onNavigate({ name: 'overview', group: g });
  };

  return (
    <View className="flex-1">
      <ScreenBackground />
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-5 pb-3 pt-6">
          <View className="self-start overflow-hidden rounded-2xl">
            <View className="absolute inset-0 bg-white/55" />
            <Text className="px-3 py-1.5 text-[26px] font-extrabold text-[#0B3D62]">Settle</Text>
          </View>
        </View>

        <View className="mx-5 mb-3 rounded-full" style={[cardShadow, glassBg]}>
          <View className="h-12 flex-row items-center overflow-hidden rounded-full border border-white/70 px-4">
            <GlassLayers radius={24} />
            <View className="absolute inset-0 bg-white/50" />
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search groups..."
              placeholderTextColor={colors.faint}
              className="ml-2.5 flex-1 text-[14px] text-[#0B3D62]"
            />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 flex-grow-0" contentContainerClassName="px-5 pr-8">
          {tabOptions.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                activeOpacity={0.85}
                onPress={() => setTab(t.key)}
                className="mr-2 items-center overflow-hidden rounded-full border px-4 py-2.5"
                style={[
                  { flexShrink: 0 },
                  active
                    ? { borderColor: 'transparent', backgroundColor: colors.teal, ...cardShadow, shadowColor: colors.teal, shadowOpacity: 0.35 }
                    : { borderColor: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.45)' },
                ]}
              >
                {!active ? <GlassLayers radius={24} /> : null}
                <Text className={`text-[13.5px] font-bold ${active ? 'text-white' : 'text-[#3E6E8E]'}`}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* FIX: Increased padding bottom (pb-36) to clear navigation bar */}
        <ScrollView showsVerticalScrollIndicator={false} className="px-5" contentContainerClassName="pb-36">
          {filtered.map((g) => (
            <TouchableOpacity key={g.id} activeOpacity={0.85} onPress={() => openGroup(g)} className="mb-3">
              <GlassCard>
                <View className="flex-row items-center">
                  <Image source={{ uri: g.image }} className="mr-3.5 h-14 w-14 rounded-2xl" />
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[15px] font-extrabold text-[#0B3D62]">{g.name}</Text>
                      <View
                        className="rounded-full px-2.5 py-1"
                        style={{ backgroundColor: g.status === 'settled' ? colors.tealBg : colors.orangeBg }}
                      >
                        <Text
                          className="text-[10.5px] font-extrabold"
                          style={{ color: g.status === 'settled' ? colors.teal : colors.orange }}
                        >
                          {g.status === 'settled' ? 'All settled' : `${g.pendingCount} pending`}
                        </Text>
                      </View>
                    </View>
                    <Text className="mt-0.5 text-[12px] text-[#5B7C93]">{g.members} members</Text>
                    <Text className="text-[11px] text-[#8DA0B1]">{g.dateRange}</Text>
                    {g.youOwe > 0 ? (
                      <View className="mt-1.5 flex-row items-center justify-between">
                        <Text className="text-[11px] font-semibold text-[#8DA0B1]">You owe</Text>
                        <Text className="text-[15px] font-extrabold" style={{ color: colors.red }}>
                          ₹{g.youOwe.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function GroupOverviewScreen({
  group,
  balances,
  onBack,
  onSettleNow,
  onHistory,
  title,
}: {
  group: Group;
  balances: typeof memberBalances.before;
  onBack: () => void;
  onSettleNow?: () => void;
  onHistory?: () => void;
  title?: string;
}) {
  const [isBalanceExpanded, setIsBalanceExpanded] = useState(true);

  const owed = balances.filter((b) => b.status === 'owesYou').reduce((s, b) => s + Number(b.amount.replace(/[₹,]/g, '')), 0);
  const owe = balances.filter((b) => b.status === 'youOwe').reduce((s, b) => s + Number(b.amount.replace(/[₹,]/g, '')), 0);

  return (
    <View className="flex-1">
      <ScreenBackground />
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="flex-row items-center justify-between px-5 pb-2 pt-3">
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onBack}
            className="h-10 w-10 items-center justify-center rounded-full border border-white/60 overflow-hidden"
            style={[cardShadow, glassBg]}
          >
            <GlassLayers radius={20} />
            <View className="absolute inset-0 bg-white/40" />
            <Ionicons name="chevron-back" size={19} color={colors.navy} />
          </TouchableOpacity>
          {onHistory ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onHistory}
              className="h-10 w-10 items-center justify-center rounded-full border border-white/60 overflow-hidden"
              style={[cardShadow, glassBg]}
            >
              <GlassLayers radius={20} />
              <View className="absolute inset-0 bg-white/40" />
              <Ionicons name="time" size={18} color={colors.navy} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* FIX: Increased padding bottom (pb-36) */}
        <ScrollView showsVerticalScrollIndicator={false} className="px-5" contentContainerClassName="pb-36">
          <View className="mb-4 overflow-hidden rounded-[24px] border border-white/60" style={cardShadow}>
            <Image source={{ uri: group.image }} className="h-32 w-full" resizeMode="cover" />
          </View>

          <Text className="text-[20px] font-extrabold text-[#0B3D62]">{title ?? group.name}</Text>
          <View className="mb-4 mt-1.5 flex-row items-center">
            <Ionicons name="calendar" size={13} color={colors.faint} />
            <Text className="ml-1.5 mr-3 text-[12px] text-[#5B7C93]">{group.dateRange}</Text>
            <Ionicons name="people" size={13} color={colors.faint} />
            <Text className="ml-1.5 text-[12px] text-[#5B7C93]">{group.members} members</Text>
          </View>

          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => setIsBalanceExpanded(!isBalanceExpanded)}
            className="mb-4 flex-row items-center justify-between rounded-2xl border border-white/60 bg-white/35 px-4 py-3"
          >
            <Text className="text-[13.5px] font-bold text-[#0B3D62]">Overall Balance</Text>
            <Ionicons name={isBalanceExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.navySoft} />
          </TouchableOpacity>

          {isBalanceExpanded && (
            <View className="mb-5 flex-row gap-3">
              <View className="flex-1 rounded-2xl px-4 py-3.5" style={{ backgroundColor: colors.tealBg }}>
                <Text className="text-[12px] font-bold" style={{ color: colors.teal }}>You're owed</Text>
                <Text className="mt-1 text-[20px] font-extrabold" style={{ color: colors.teal }}>₹{owed.toLocaleString('en-IN')}</Text>
              </View>
              <View className="flex-1 rounded-2xl px-4 py-3.5" style={{ backgroundColor: colors.redBg }}>
                <Text className="text-[12px] font-bold" style={{ color: colors.red }}>You owe</Text>
                <Text className="mt-1 text-[20px] font-extrabold" style={{ color: colors.red }}>₹{owe.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          )}

          <Text className="mb-2 text-[14px] font-extrabold text-[#0B3D62]">Member Balances</Text>
          <GlassCard>
            {balances.map((b, i) => (
              <View key={b.name} className={`flex-row items-center justify-between py-3 ${i < balances.length - 1 ? 'border-b border-white/40' : ''}`}>
                <View className="flex-row items-center">
                  <Image source={{ uri: b.avatar }} className="mr-2.5 h-8 w-8 rounded-full" />
                  <View>
                    <Text className="text-[14px] font-bold text-[#0B3D62]">{b.name}</Text>
                    <Text className="text-[11px] text-[#8DA0B1]">
                      {b.status === 'owesYou' ? 'owes you' : b.status === 'youOwe' ? 'you owe' : 'settled'}
                    </Text>
                  </View>
                </View>
                <Text
                  className="text-[14px] font-extrabold"
                  style={{ color: b.status === 'owesYou' ? colors.teal : b.status === 'youOwe' ? colors.red : colors.faint }}
                >
                  {b.amount}
                </Text>
              </View>
            ))}
          </GlassCard>

          {onSettleNow ? (
            <View className="mt-5">
              <PrimaryButton label="Settle Now" onPress={onSettleNow} />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SuggestionsScreen({ group, onBack, onProceed }: { group: Group; onBack: () => void; onProceed: (payTo: string, amount: string) => void }) {
  const [selected, setSelected] = useState(0);
  return (
    <View className="flex-1">
      <ScreenBackground />
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="flex-row items-center justify-between px-5 pb-4 pt-3">
          <View className="flex-row items-center">
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onBack}
              className="h-10 w-10 items-center justify-center rounded-full border border-white/60 overflow-hidden"
              style={[cardShadow, glassBg]}
            >
              <GlassLayers radius={20} />
              <View className="absolute inset-0 bg-white/40" />
              <Ionicons name="chevron-back" size={19} color={colors.navy} />
            </TouchableOpacity>
            <Text className="ml-3 text-[19px] font-extrabold text-[#0B3D62]">Settle Up</Text>
          </View>
          <View className="h-10 w-10 items-center justify-center rounded-full border border-white/60 overflow-hidden" style={[cardShadow, glassBg]}>
            <GlassLayers radius={20} />
            <View className="absolute inset-0 bg-white/40" />
            <Ionicons name="settings-outline" size={17} color={colors.navy} />
          </View>
        </View>

        {/* FIX: Increased padding bottom (pb-36) */}
        <ScrollView showsVerticalScrollIndicator={false} className="px-5" contentContainerClassName="pb-36">
          <View className="mb-4 flex-row items-start rounded-2xl px-4 py-3.5" style={{ backgroundColor: colors.blueBg }}>
            <Ionicons name="information-circle" size={18} color={colors.blue} style={{ marginTop: 1 }} />
            <Text className="ml-2.5 flex-1 text-[13px] leading-[18px]" style={{ color: '#1E4E8C' }}>
              We found the best way to settle up with minimum transactions.
            </Text>
          </View>

          <Text className="mb-2 text-[14px] font-extrabold text-[#0B3D62]">{suggestedPayments.length} payments needed</Text>
          <GlassCard>
            {suggestedPayments.map((p, i) => (
              <TouchableOpacity
                key={p.from}
                activeOpacity={0.7}
                onPress={() => setSelected(i)}
                className={`flex-row items-center justify-between py-3 ${i < suggestedPayments.length - 1 ? 'border-b border-white/40' : ''}`}
              >
                <View className="flex-row items-center">
                  <Image source={{ uri: p.avatar }} className="mr-2.5 h-9 w-9 rounded-full" />
                  <View>
                    <Text className="text-[14px] font-bold text-[#0B3D62]">{p.from} → {p.to}</Text>
                    <Text className="text-[14px] font-extrabold" style={{ color: colors.red }}>{p.amount}</Text>
                  </View>
                </View>
                <View className={`h-5 w-5 items-center justify-center rounded-full border-2 ${selected === i ? 'border-[#149C73]' : 'border-[#C7D6DF]'}`}>
                  {selected === i ? <View className="h-2.5 w-2.5 rounded-full bg-[#149C73]" /> : null}
                </View>
              </TouchableOpacity>
            ))}
          </GlassCard>

          <View className="mt-4 rounded-2xl px-4 py-3.5" style={{ backgroundColor: colors.tealBg }}>
            <Text className="text-[12.5px] leading-[18px]" style={{ color: colors.teal }}>
              This will settle all balances in the group with just {suggestedPayments.length} transactions (instead of 4).
            </Text>
          </View>

          <View className="mt-6 flex-row items-center justify-between">
            <Text className="text-[13px] font-semibold text-[#5B7C93]">Total Transactions</Text>
            <Text className="text-[22px] font-extrabold text-[#0B3D62]">{suggestedPayments.length}</Text>
          </View>

          <View className="mt-4">
            <PrimaryButton
              label="Proceed to Settle"
              onPress={() => onProceed(suggestedPayments[selected].to, suggestedPayments[selected].amount)}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SettleOptionsScreen({
  group,
  payTo,
  amount,
  onBack,
  onNext,
  onPartial,
}: {
  group: Group;
  payTo: string;
  amount: string;
  onBack: () => void;
  onNext: (method: string) => void;
  onPartial: () => void;
}) {
  const [method, setMethod] = useState('paid');
  const target = suggestedPayments.find((p) => p.to === payTo || p.from === payTo);

  return (
    <View className="flex-1">
      <ScreenBackground />
      <SafeAreaView edges={['top']} className="flex-1">
        <DetailHeader title={`Settle with ${payTo}`} onBack={onBack} />

        {/* FIX: Increased padding bottom (pb-36) */}
        <ScrollView showsVerticalScrollIndicator={false} className="px-5" contentContainerClassName="pb-36">
          <View className="mb-5">
            <GlassCard>
              <View className="flex-row items-center">
                <Image source={{ uri: target?.avatar ?? 'https://i.pravatar.cc/100?img=15' }} className="mr-3.5 h-12 w-12 rounded-full" />
                <View>
                  <Text className="text-[16px] font-extrabold text-[#0B3D62]">{payTo}</Text>
                  <Text className="mt-1 text-[20px] font-extrabold" style={{ color: colors.red }}>{amount}</Text>
                  <Text className="text-[11px] text-[#8DA0B1]">You owe this amount</Text>
                </View>
              </View>
            </GlassCard>
          </View>

          <Text className="mb-2 text-[14px] font-extrabold text-[#0B3D62]">Choose Payment Method</Text>
          {paymentMethods.map((m) => {
            const active = method === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                activeOpacity={m.disabled ? 1 : 0.8}
                disabled={m.disabled}
                onPress={() => (m.key === 'partial' ? onPartial() : setMethod(m.key))}
                className="mb-3"
                style={m.disabled ? { opacity: 0.5 } : undefined}
              >
                <View
                  className="rounded-2xl border p-4"
                  style={[
                    glassBg,
                    cardShadow,
                    { borderColor: active ? colors.teal : 'rgba(255,255,255,0.6)', borderWidth: active ? 1.5 : 1 },
                  ]}
                >
                  <View className="overflow-hidden rounded-2xl">
                    <GlassLayers radius={16} />
                    <View className="flex-row items-center px-0.5 py-0.5">
                      <View
                        className="mr-3 h-9 w-9 items-center justify-center rounded-full"
                        style={{ backgroundColor: active ? colors.tealBg : 'rgba(255,255,255,0.6)' }}
                      >
                        <Ionicons name={m.icon} size={17} color={active ? colors.teal : colors.navySoft} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[14px] font-bold text-[#0B3D62]">{m.title}</Text>
                        <Text className="mt-0.5 text-[11.5px] text-[#5B7C93]">{m.subtitle}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          <View className="mt-2">
            <PrimaryButton label="Next" onPress={() => onNext(paymentMethods.find((m) => m.key === method)?.title ?? 'Mark as Paid')} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ConfirmSettlementScreen({
  payTo,
  amount,
  method,
  onBack,
  onConfirm,
}: {
  payTo: string;
  amount: string;
  method: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [note, setNote] = useState('Paid via Google Pay');
  const target = suggestedPayments.find((p) => p.to === payTo || p.from === payTo);

  return (
    <View className="flex-1">
      <ScreenBackground />
      <SafeAreaView edges={['top']} className="flex-1">
        <DetailHeader title="Confirm Payment" onBack={onBack} />

        {/* FIX: Increased padding bottom (pb-36) */}
        <ScrollView showsVerticalScrollIndicator={false} className="px-5" contentContainerClassName="pb-36">
          <View className="mb-4">
            <GlassCard>
              <View className="flex-row items-center">
                <Image source={{ uri: target?.avatar ?? 'https://i.pravatar.cc/100?img=15' }} className="mr-3.5 h-12 w-12 rounded-full" />
                <View>
                  <Text className="text-[16px] font-extrabold text-[#0B3D62]">{payTo}</Text>
                  <Text className="mt-1 text-[20px] font-extrabold" style={{ color: colors.red }}>{amount}</Text>
                  <Text className="text-[11px] text-[#8DA0B1]">You owe this amount</Text>
                </View>
              </View>
            </GlassCard>
          </View>

          <View className="mb-4">
            <GlassCard>
              <InfoRow label="Payment method" value={method} />
              <InfoRow label="Date" value="Apr 16, 2025" last />
            </GlassCard>
          </View>

          <Text className="mb-2 text-[13px] font-semibold text-[#5B7C93]">Note (optional)</Text>
          <View className="mb-2 rounded-2xl border border-white/60 bg-white/35 px-4 py-3.5">
            <TextInput
              value={note}
              onChangeText={(t) => t.length <= 100 && setNote(t)}
              placeholder="Add a note..."
              placeholderTextColor={colors.faint}
              multiline
              className="min-h-[44px] text-[14px] text-[#0B3D62]"
            />
          </View>
          <Text className="mb-6 text-right text-[11px] text-[#8DA0B1]">{note.length}/100</Text>

          <PrimaryButton label="Confirm & Settle" onPress={onConfirm} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SuccessScreen({ payTo, amount, onBack, onViewUpdated, onSettleAnother }: { payTo: string; amount: string; onBack: () => void; onViewUpdated: () => void; onSettleAnother: () => void }) {
  return (
    <View className="flex-1">
      <ScreenBackground />
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-5 pb-2 pt-3">
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onBack}
            className="h-10 w-10 items-center justify-center rounded-full border border-white/60 overflow-hidden"
            style={[cardShadow, glassBg]}
          >
            <GlassLayers radius={20} />
            <View className="absolute inset-0 bg-white/40" />
            <Ionicons name="chevron-back" size={19} color={colors.navy} />
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-6 h-28 w-28 items-center justify-center rounded-full" style={{ backgroundColor: colors.teal }}>
            <Ionicons name="checkmark" size={56} color="#FFFFFF" />
          </View>
          <Text className="text-[22px] font-extrabold text-[#0B3D62]">Payment Marked!</Text>
          <Text className="mt-2 text-center text-[14px] leading-[20px] text-[#5B7C93]">
            {amount} marked as paid to {payTo}. The balances have been updated.
          </Text>
        </View>

        <View className="gap-3 px-5 pb-8">
          <PrimaryButton label="View Updated Balances" onPress={onViewUpdated} />
          <OutlineButton label="Settle Another" onPress={onSettleAnother} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function SettlementHistoryScreen({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState<'All' | 'Sent' | 'Received'>('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter the history data based on the selected option
  const filteredHistory = historyData.map(section => {
    const filteredItems = section.items.filter(item => {
      if (filter === 'All') return true;
      if (filter === 'Sent') return item.from === 'You';
      if (filter === 'Received') return item.to === 'You';
      return true;
    });
    return { ...section, items: filteredItems };
  }).filter(section => section.items.length > 0);

  return (
    <View className="flex-1">
      <ScreenBackground />
      <SafeAreaView edges={['top']} className="flex-1">
        <DetailHeader title="Settlement History" onBack={onBack} />

        <ScrollView showsVerticalScrollIndicator={false} className="px-5" contentContainerClassName="pb-36">
          
          {/* Dropdown Container (zIndex ensures popup floats over lists) */}
          <View className="relative z-50 mb-5">
            {/* Toggle Button */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setIsFilterOpen(!isFilterOpen)}
              className="flex-row items-center justify-between rounded-[16px] border border-white/60 bg-white/35 px-4 py-3"
            >
              <Text className="text-[13.5px] font-bold text-[#0B3D62]">{filter}</Text>
              <Ionicons name={isFilterOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.navySoft} />
            </TouchableOpacity>

            {/* Floating Glass Dropdown Menu (Absolute Position) */}
            {isFilterOpen && (
              <View 
                className="absolute left-0 right-0 top-[52px] rounded-[16px]" 
                style={[cardShadow, glassBg, { zIndex: 100 }]}
              >
                <View className="overflow-hidden rounded-[16px] border border-white/60">
                  {/* Real Glass Effect applied here */}
                  <GlassLayers radius={16} />
                  
                  <View className="relative z-10 py-1">
                    {['All', 'Sent', 'Received'].map((opt, index) => (
                      <TouchableOpacity
                        key={opt}
                        activeOpacity={0.7}
                        onPress={() => {
                          setFilter(opt as 'All' | 'Sent' | 'Received');
                          setIsFilterOpen(false);
                        }}
                        className={`px-4 py-3.5 ${index !== 2 ? 'border-b border-white/40' : ''}`}
                      >
                        <Text className={`text-[14px] font-bold ${filter === opt ? 'text-[#149C73]' : 'text-[#0B3D62]'}`}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Render Filtered Results */}
          <View className="-z-10">
            {filteredHistory.length === 0 ? (
              <View className="mt-6 items-center">
                <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-white/40">
                  <Ionicons name="search" size={24} color={colors.faint} />
                </View>
                <Text className="text-[15px] font-extrabold text-[#0B3D62]">No settlements found</Text>
              </View>
            ) : (
              filteredHistory.map((section) => (
                <View key={section.date} className="mb-5">
                  <Text className="mb-2 text-[13px] font-bold text-[#5B7C93]">{section.date}</Text>
                  <GlassCard>
                    {section.items.map((item, i) => (
                      <TouchableOpacity
                        key={item.time}
                        activeOpacity={0.8}
                        className={`flex-row items-center justify-between py-3 ${i < section.items.length - 1 ? 'border-b border-white/40' : ''}`}
                      >
                        <View className="flex-row items-center">
                          <View className="mr-3 h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: colors.tealBg }}>
                            <Ionicons name="checkmark" size={17} color={colors.teal} />
                          </View>
                          <View>
                            <Text className="text-[14px] font-bold text-[#0B3D62]">{item.from} → {item.to}</Text>
                            <Text className="text-[11px] text-[#8DA0B1]">{item.label} • {item.time}</Text>
                          </View>
                        </View>
                        <View className="flex-row items-center">
                          <Text className="mr-1.5 text-[14px] font-extrabold" style={{ color: colors.teal }}>{item.amount}</Text>
                          <Ionicons name="chevron-forward" size={15} color={colors.faint} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </GlassCard>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ManualSettlementScreen({ payTo, amount, onBack, onMarkPaid }: { payTo: string; amount: string; onBack: () => void; onMarkPaid: () => void }) {
  const [value, setValue] = useState('150');
  const [note, setNote] = useState('Paid partial amount');
  const target = suggestedPayments.find((p) => p.to === payTo || p.from === payTo);
  const chips = ['50', '100', '200', amount.replace(/[₹,]/g, '')];

  return (
    <View className="flex-1">
      <ScreenBackground />
      <SafeAreaView edges={['top']} className="flex-1">
        <DetailHeader title="Record Settlement" onBack={onBack} />

        {/* FIX: Increased padding bottom (pb-36) */}
        <ScrollView showsVerticalScrollIndicator={false} className="px-5" contentContainerClassName="pb-36">
          <View className="mb-5">
            <GlassCard>
              <View className="flex-row items-center">
                <Image source={{ uri: target?.avatar ?? 'https://i.pravatar.cc/100?img=16' }} className="mr-3.5 h-12 w-12 rounded-full" />
                <View>
                  <Text className="text-[16px] font-extrabold text-[#0B3D62]">{payTo}</Text>
                  <Text className="mt-1 text-[20px] font-extrabold" style={{ color: colors.red }}>{amount}</Text>
                  <Text className="text-[11px] text-[#8DA0B1]">You owe this amount</Text>
                </View>
              </View>
            </GlassCard>
          </View>

          <Text className="mb-2 text-[13px] font-semibold text-[#5B7C93]">Amount</Text>
          <View className="mb-3 flex-row items-center rounded-2xl border border-white/60 bg-white/35 px-4 py-3.5">
            <Text className="mr-1.5 text-[16px] font-extrabold text-[#0B3D62]">₹</Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              keyboardType="numeric"
              className="flex-1 text-[16px] font-bold text-[#0B3D62]"
            />
          </View>
          <View className="mb-5 flex-row flex-wrap gap-2">
            {chips.map((c) => (
              <TouchableOpacity
                key={c}
                activeOpacity={0.8}
                onPress={() => setValue(c)}
                className="rounded-full border border-white/60 bg-white/40 px-3.5 py-1.5"
              >
                <Text className="text-[12.5px] font-bold text-[#3E6E8E]">₹{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="mb-2 text-[13px] font-semibold text-[#5B7C93]">Date</Text>
          <View className="mb-5 flex-row items-center rounded-2xl border border-white/60 bg-white/35 px-4 py-3.5">
            <Ionicons name="calendar-outline" size={16} color={colors.navySoft} />
            <Text className="ml-2 text-[14px] font-semibold text-[#0B3D62]">Apr 16, 2025</Text>
          </View>

          <Text className="mb-2 text-[13px] font-semibold text-[#5B7C93]">Note (optional)</Text>
          <View className="mb-1 rounded-2xl border border-white/60 bg-white/35 px-4 py-3.5">
            <TextInput
              value={note}
              onChangeText={(t) => t.length <= 100 && setNote(t)}
              multiline
              className="min-h-[44px] text-[14px] text-[#0B3D62]"
            />
          </View>
          <Text className="mb-6 text-right text-[11px] text-[#8DA0B1]">{note.length}/100</Text>

          <PrimaryButton label="Mark as Paid" onPress={onMarkPaid} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function AllSettledScreen({ onBack, onViewGroup }: { onBack: () => void; onViewGroup: () => void }) {
  return (
    <View className="flex-1">
      <ScreenBackground />
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-5 pb-2 pt-3">
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onBack}
            className="h-10 w-10 items-center justify-center rounded-full border border-white/60 overflow-hidden"
            style={[cardShadow, glassBg]}
          >
            <GlassLayers radius={20} />
            <View className="absolute inset-0 bg-white/40" />
            <Ionicons name="chevron-back" size={19} color={colors.navy} />
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-6 h-32 w-32 items-center justify-center rounded-full" style={{ backgroundColor: colors.tealBg }}>
            <View className="flex-row">
              <Ionicons name="hand-left" size={44} color={colors.teal} />
              <Ionicons name="hand-right" size={44} color={colors.teal} style={{ marginLeft: -6 }} />
            </View>
          </View>
          <Text className="text-[22px] font-extrabold text-[#0B3D62]">All Settled!</Text>
          <Text className="mt-2 text-center text-[14px] leading-[20px] text-[#5B7C93]">
            Great! Everyone in this group is settled up. Enjoy your trip! 🎉
          </Text>
        </View>

        <View className="px-5 pb-8">
          <OutlineButton label="View Group" onPress={onViewGroup} />
        </View>
      </SafeAreaView>
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   ROOT
   ──────────────────────────────────────────────────────────────────────── */

export default function SettleFlow() {
  const [stack, setStack] = useState<Screen[]>([{ name: 'main' }]);
  const push = (s: Screen) => setStack((st) => [...st, s]);
  const pop = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
  const resetTo = (s: Screen) => setStack([{ name: 'main' }, s]);
  const current = stack[stack.length - 1];

  switch (current.name) {
    case 'main':
      return <MainScreen onNavigate={push} />;

    case 'overview':
      return (
        <GroupOverviewScreen
          group={current.group}
          balances={memberBalances.before}
          onBack={pop}
          onSettleNow={() => push({ name: 'suggestions', group: current.group })}
          onHistory={() => push({ name: 'history', group: current.group })}
        />
      );

    case 'suggestions':
      return (
        <SuggestionsScreen
          group={current.group}
          onBack={pop}
          onProceed={(payTo, amount) => push({ name: 'options', group: current.group, payTo, amount })}
        />
      );

    case 'options':
      return (
        <SettleOptionsScreen
          group={current.group}
          payTo={current.payTo}
          amount={current.amount}
          onBack={pop}
          onNext={(method) => push({ name: 'confirm', group: current.group, payTo: current.payTo, amount: current.amount, method })}
          onPartial={() => push({ name: 'manual', group: current.group, payTo: current.payTo, amount: current.amount })}
        />
      );

    case 'confirm':
      return (
        <ConfirmSettlementScreen
          payTo={current.payTo}
          amount={current.amount}
          method={current.method}
          onBack={pop}
          onConfirm={() => push({ name: 'success', group: current.group, payTo: current.payTo, amount: current.amount })}
        />
      );

    case 'manual':
      return (
        <ManualSettlementScreen
          payTo={current.payTo}
          amount={current.amount}
          onBack={pop}
          onMarkPaid={() => push({ name: 'success', group: current.group, payTo: current.payTo, amount: current.amount })}
        />
      );

    case 'success':
      return (
        <SuccessScreen
          payTo={current.payTo}
          amount={current.amount}
          onBack={pop}
          onViewUpdated={() => resetTo({ name: 'updated', group: current.group })}
          onSettleAnother={() => resetTo({ name: 'suggestions', group: current.group })}
        />
      );

    case 'updated':
      return (
        <GroupOverviewScreen
          group={current.group}
          balances={memberBalances.after}
          onBack={pop}
          title={current.group.name}
        />
      );

    case 'history':
      return <SettlementHistoryScreen onBack={pop} />;

    case 'allSettled':
      return <AllSettledScreen onBack={pop} onViewGroup={() => resetTo({ name: 'overview', group: current.group })} />;

    default:
      return <MainScreen onNavigate={push} />;
  }
}