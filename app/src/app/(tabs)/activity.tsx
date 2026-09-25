import { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

/* ────────────────────────────────────────────────────────────────────────
   THEME — swap BACKGROUND_IMAGE for your uploaded background when ready.
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

/* ────────────────────────────────────────────────────────────────────────
   REUSABLE GLASS PIECES
   ──────────────────────────────────────────────────────────────────────── */

function ScreenBackground() {
  return (
    <>
      <Image source={BACKGROUND_IMAGE} className="absolute inset-0 h-full w-full" resizeMode="cover" />
      <View className="absolute inset-0 bg-white/10" />
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
  icon,
  iconColor,
  iconBg,
  last = false,
}: {
  label: string;
  value: string;
  avatarUri?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  last?: boolean;
}) {
  return (
    <View className={`flex-row items-center justify-between py-3 ${last ? '' : 'border-b border-white/40'}`}>
      <Text className="text-[13px] font-semibold text-[#5B7C93]">{label}</Text>
      <View className="flex-row items-center">
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} className="mr-2 h-6 w-6 rounded-full" />
        ) : icon ? (
          <View
            className="mr-2 h-6 w-6 items-center justify-center rounded-full"
            style={{ backgroundColor: iconBg ?? 'rgba(255,255,255,0.5)' }}
          >
            <Ionicons name={icon} size={13} color={iconColor ?? colors.navySoft} />
          </View>
        ) : null}
        <Text className="text-[14px] font-bold text-[#0B3D62]">{value}</Text>
      </View>
    </View>
  );
}

function StatusPill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View className="flex-row items-center rounded-full px-2.5 py-1" style={{ backgroundColor: bg }}>
      <Ionicons name="checkmark-circle" size={13} color={color} style={{ marginRight: 4 }} />
      <Text className="text-[12px] font-extrabold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

function NoteBanner({ text }: { text: string }) {
  return (
    <View className="rounded-2xl bg-white/35 px-4 py-3.5">
      <Text className="text-[12.5px] leading-[18px] text-[#5B7C93]">{text}</Text>
    </View>
  );
}

function DetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View className="flex-row items-center px-5 pb-4 pt-3">
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
  );
}

/* ────────────────────────────────────────────────────────────────────────
   DATA
   ──────────────────────────────────────────────────────────────────────── */

type ActivityType = 'expense' | 'settlement' | 'member' | 'group';

type ActivityItem = {
  id: string;
  type: ActivityType;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  time?: string;
  amount?: string;
  amountColor?: string;
  memberId?: string;
};

const activityData: { section: string; items: ActivityItem[] }[] = [
  {
    section: 'Today',
    items: [
      { id: '1', type: 'expense', icon: 'restaurant', iconColor: colors.red, iconBg: colors.redBg, title: "Rohit added an expense", subtitle: "Dinner at Bruno's", time: '8:30 PM', amount: '₹2,850', amountColor: colors.navy },
      { id: '2', type: 'settlement', icon: 'cash', iconColor: colors.teal, iconBg: colors.tealBg, title: 'Aman settled his dues', subtitle: 'to Rohit', time: '6:12 PM', amount: '₹1,200', amountColor: colors.teal },
      { id: '3', type: 'member', icon: 'people', iconColor: colors.purple, iconBg: colors.purpleBg, title: 'Neha joined the group', time: '4:20 PM', memberId: 'neha' },
      { id: '4', type: 'expense', icon: 'car', iconColor: colors.orange, iconBg: colors.orangeBg, title: 'Karan added an expense', subtitle: 'Taxi to Beach', time: '1:15 PM', amount: '₹450', amountColor: colors.navy },
      { id: '5', type: 'expense', icon: 'create', iconColor: colors.blue, iconBg: colors.blueBg, title: 'Priya updated an expense', subtitle: 'Hotel Stay' },
      { id: 'g1', type: 'group', icon: 'settings', iconColor: colors.blue, iconBg: colors.blueBg, title: 'Trip details updated', subtitle: 'Destination changed to Goa', time: '7:20 PM' },
    ],
  },
  {
    section: 'Yesterday',
    items: [
      { id: '6', type: 'expense', icon: 'flash', iconColor: colors.orange, iconBg: colors.orangeBg, title: 'Aman added an expense', subtitle: 'Electricity Bill', time: '9:45 PM', amount: '₹1,200', amountColor: colors.navy },
      { id: '7', type: 'member', icon: 'link', iconColor: colors.blue, iconBg: colors.blueBg, title: 'Rohit invited Neha', subtitle: 'via link', memberId: 'neha' },
      { id: 'g2', type: 'group', icon: 'wallet', iconColor: colors.purple, iconBg: colors.purpleBg, title: 'Budget updated', subtitle: 'Budget set to ₹50,000', time: '5:10 PM' },
    ],
  },
];

const filters: { key: 'all' | ActivityType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'expense', label: 'Expenses', icon: 'restaurant' },
  { key: 'settlement', label: 'Settlements', icon: 'cash' },
  { key: 'member', label: 'Members', icon: 'people' },
  { key: 'group', label: 'Updates', icon: 'settings' },
];

// Demo detail payloads — swap these lookups for real fetched-by-id data.
const expenseDetail = {
  title: "Dinner at Bruno's",
  amount: '₹2,850',
  date: 'Apr 16, 2025 • 8:30 PM',
  addedBy: 'Rohit (You)',
  addedByAvatar: 'https://i.pravatar.cc/100?img=12',
  group: 'Goa Trip',
  category: 'Food & Drinks',
  splitType: 'Equal Split',
  splitAmong: '4 people',
  eachShare: '₹712.50',
  description: "Amazing dinner at Bruno's beach shack! 🎉",
  billImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=300',
  participants: [
    { name: 'Rohit (You)', share: '₹712.50', avatar: 'https://i.pravatar.cc/100?img=12' },
    { name: 'Aman', share: '₹712.50', avatar: 'https://i.pravatar.cc/100?img=13' },
    { name: 'Neha', share: '₹712.50', avatar: 'https://i.pravatar.cc/100?img=14' },
    { name: 'Karan', share: '₹712.50', avatar: 'https://i.pravatar.cc/100?img=15' },
  ],
};

const settlementDetail = {
  title: 'Aman settled his dues',
  subtitle: 'to Rohit',
  amount: '₹1,200',
  date: 'Apr 16, 2025 • 6:12 PM',
  from: { name: 'Aman', avatar: 'https://i.pravatar.cc/100?img=13' },
  to: { name: 'Rohit (You)', avatar: 'https://i.pravatar.cc/100?img=12' },
  group: 'Goa Trip',
  status: 'Completed',
  note: 'UPI payment',
  banner: 'This settlement reduces the pending balance between Aman and Rohit.',
};

const eventDetail = {
  title: 'Neha joined the group',
  date: 'Apr 16, 2025 • 4:20 PM',
  icon: 'people' as const,
  iconColor: colors.purple,
  iconBg: colors.purpleBg,
  member: { name: 'Neha', sub: 'neha@example.com', avatar: 'https://i.pravatar.cc/100?img=14', id: 'neha' },
  group: 'Goa Trip',
  invitedBy: { name: 'Rohit (You)', avatar: 'https://i.pravatar.cc/100?img=12' },
  banner: 'Neha joined the group using an invitation link.',
};

const memberProfile = {
  name: 'Neha',
  sinceLabel: 'Member since Apr 16, 2025',
  avatar: 'https://i.pravatar.cc/150?img=14',
};

const memberEvents: { section: string; items: ActivityItem[] }[] = [
  {
    section: 'Today',
    items: [
      { id: 'm1', type: 'member', icon: 'people', iconColor: colors.purple, iconBg: colors.purpleBg, title: 'Neha joined the group', time: '4:20 PM' },
      { id: 'm2', type: 'expense', icon: 'restaurant', iconColor: colors.red, iconBg: colors.redBg, title: 'Neha added an expense', subtitle: 'Snacks', time: '2:15 PM', amount: '₹300' },
      { id: 'm3', type: 'expense', icon: 'create', iconColor: colors.blue, iconBg: colors.blueBg, title: 'Neha updated an expense', subtitle: 'Hotel Stay' },
    ],
  },
];

/* ────────────────────────────────────────────────────────────────────────
   NAVIGATION — a tiny internal stack, no router dependency
   ──────────────────────────────────────────────────────────────────────── */

type Screen = { name: 'main' | 'expense' | 'settlement' | 'event' | 'member'; params?: any };

/* ────────────────────────────────────────────────────────────────────────
   FILTER MODAL
   ──────────────────────────────────────────────────────────────────────── */

type ActivityFilters = { type: 'all' | ActivityType; dateRange: string; member: string; active: boolean };

function RadioRow({ label, selected, onPress, icon }: { label: string; selected: boolean; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} className="flex-row items-center justify-between py-3">
      <View className="flex-row items-center">
        {icon ? (
          <View className="mr-3 h-7 w-7 items-center justify-center rounded-full bg-white/50">
            <Ionicons name={icon} size={15} color={colors.navySoft} />
          </View>
        ) : null}
        <Text className="text-[14px] font-semibold text-[#0B3D62]">{label}</Text>
      </View>
      <View className={`h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? 'border-[#149C73]' : 'border-[#C7D6DF]'}`}>
        {selected ? <View className="h-2.5 w-2.5 rounded-full bg-[#149C73]" /> : null}
      </View>
    </TouchableOpacity>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text className="mb-1 mt-5 text-[13px] font-extrabold text-[#0B3D62]">{children}</Text>;
}

const TYPE_OPTIONS: { key: ActivityFilters['type']; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'expense', label: 'Expenses', icon: 'restaurant' },
  { key: 'settlement', label: 'Settlements', icon: 'cash' },
  { key: 'member', label: 'Members', icon: 'people' },
  { key: 'group', label: 'Group Updates', icon: 'settings' },
];
const DATE_OPTIONS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom Range' },
];
const MEMBER_OPTIONS = [
  { key: 'all', label: 'All Members' },
  { key: 'rohit', label: 'Rohit (You)' },
  { key: 'aman', label: 'Aman' },
  { key: 'neha', label: 'Neha' },
];

function ActivityFilterModal({ visible, onClose, onApply }: { visible: boolean; onClose: () => void; onApply: (f: ActivityFilters) => void }) {
  const [type, setType] = useState<ActivityFilters['type']>('all');
  const [dateRange, setDateRange] = useState('all');
  const [member, setMember] = useState('all');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-[#0B3D62]/30">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
        <View className="rounded-t-[28px]" style={[cardShadow, glassBg]}>
          <View className="overflow-hidden rounded-t-[28px] border border-white/60">
            <GlassLayers radius={28} />
            <View className="absolute inset-0 bg-white/55" />
            <View className="max-h-[85%] px-5 pb-6 pt-5">
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="text-[19px] font-extrabold text-[#0B3D62]">Filter Activity</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full bg-white/50">
                  <Ionicons name="close" size={18} color={colors.navy} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <SectionLabel>Activity Type</SectionLabel>
                <View className="rounded-2xl bg-white/30 px-3">
                  {TYPE_OPTIONS.map((opt, i) => (
                    <View key={opt.key} className={i < TYPE_OPTIONS.length - 1 ? 'border-b border-white/40' : ''}>
                      <RadioRow label={opt.label} icon={opt.icon} selected={type === opt.key} onPress={() => setType(opt.key)} />
                    </View>
                  ))}
                </View>
                <SectionLabel>Date Range</SectionLabel>
                <View className="rounded-2xl bg-white/30 px-3">
                  {DATE_OPTIONS.map((opt, i) => (
                    <View key={opt.key} className={i < DATE_OPTIONS.length - 1 ? 'border-b border-white/40' : ''}>
                      <RadioRow label={opt.label} selected={dateRange === opt.key} onPress={() => setDateRange(opt.key)} />
                    </View>
                  ))}
                </View>
                <SectionLabel>Member</SectionLabel>
                <View className="mb-2 rounded-2xl bg-white/30 px-3">
                  {MEMBER_OPTIONS.map((opt, i) => (
                    <View key={opt.key} className={i < MEMBER_OPTIONS.length - 1 ? 'border-b border-white/40' : ''}>
                      <RadioRow label={opt.label} selected={member === opt.key} onPress={() => setMember(opt.key)} />
                    </View>
                  ))}
                </View>
              </ScrollView>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onApply({ type, dateRange, member, active: type !== 'all' || dateRange !== 'all' || member !== 'all' })}
                className="mt-4 items-center rounded-full bg-[#149C73] py-4"
                style={cardShadow}
              >
                <Text className="text-[15px] font-extrabold text-white">Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   SCREENS
   ──────────────────────────────────────────────────────────────────────── */

function MainScreen({ onNavigate, onOpenFilters, appliedFilters }: { onNavigate: (s: Screen) => void; onOpenFilters: () => void; appliedFilters: ActivityFilters | null }) {
  const [activeFilter, setActiveFilter] = useState<'all' | ActivityType>('all');
  const [query, setQuery] = useState('');

  const sections = activityData
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
        const matchesQuery =
          query.trim().length === 0 ||
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          (item.subtitle ?? '').toLowerCase().includes(query.toLowerCase());
        const matchesMember = !appliedFilters || appliedFilters.member === 'all' || item.memberId === appliedFilters.member;
        return matchesFilter && matchesQuery && matchesMember;
      }),
    }))
    .filter((section) => section.items.length > 0);

  const handleItemPress = (item: ActivityItem) => {
    if (item.type === 'expense') onNavigate({ name: 'expense', params: { id: item.id } });
    else if (item.type === 'settlement') onNavigate({ name: 'settlement', params: { id: item.id } });
    else onNavigate({ name: 'event', params: { id: item.id } });
  };

  return (
    <View className="flex-1">
      <ScreenBackground />
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="px-5 pb-3 pt-5">
          <Text
            className="text-[28px] font-extrabold text-[#0B3D62]"
            style={{ textShadowColor: 'rgba(255,255,255,0.75)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 1 } }}
          >
            Activity
          </Text>
        </View>

        <View className="mx-5 mb-3 flex-row items-center">
          <View className="flex-1 rounded-full" style={[cardShadow, glassBg]}>
            <View className="h-12 flex-row items-center overflow-hidden rounded-full border border-white/70 px-4">
              <GlassLayers radius={24} />
              <View className="absolute inset-0 bg-white/50" />
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search activities..."
                placeholderTextColor={colors.faint}
                className="ml-2.5 flex-1 text-[14px] text-[#0B3D62]"
              />
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onOpenFilters}
            className="ml-2.5 h-12 w-12 items-center justify-center rounded-full border border-white/70 overflow-hidden"
            style={[cardShadow, glassBg]}
          >
            <GlassLayers radius={24} />
            <View className="absolute inset-0 bg-white/50" />
            <Ionicons name="options" size={19} color={colors.navy} />
            {appliedFilters?.active ? <View className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#F04F38]" /> : null}
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 flex-grow-0" contentContainerClassName="px-5 pr-8">
          {filters.map((f) => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                activeOpacity={0.85}
                onPress={() => setActiveFilter(f.key)}
                className="mr-2 flex-row items-center overflow-hidden rounded-full border px-3.5 py-2"
                style={[
                  { flexShrink: 0 },
                  active
                    ? { borderColor: 'transparent', backgroundColor: colors.teal, ...cardShadow, shadowColor: colors.teal, shadowOpacity: 0.35 }
                    : { borderColor: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.45)' },
                ]}
              >
                {!active ? <GlassLayers radius={24} /> : null}
                <Ionicons
                  name={f.icon}
                  size={12}
                  color={active ? '#FFFFFF' : colors.navySoft}
                  style={{ marginRight: 4 }}
                />
                <Text className={`text-[12.5px] font-bold ${active ? 'text-white' : 'text-[#3E6E8E]'}`}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView showsVerticalScrollIndicator={false} className="px-5" contentContainerClassName="pb-44">
          {sections.length === 0 ? (
            <View className="mt-16 items-center px-8">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-white/40">
                <Ionicons name="search" size={32} color={colors.faint} />
              </View>
              <Text className="text-[16px] font-extrabold text-[#0B3D62]">No activity yet</Text>
              <Text className="mt-1 text-center text-[13px] text-[#5B7C93]">
                All group activities like expenses, settlements and member updates will appear here.
              </Text>
            </View>
          ) : (
            sections.map((section) => (
              <View key={section.section} className="mb-6">
                <Text className="mb-3 text-[13px] font-bold text-[#5B7C93]">{section.section}</Text>
                <GlassCard>
                  <View className="-m-4">
                    <View className="px-4">
                      {section.items.map((item, index) => (
                        <TouchableOpacity
                          key={item.id}
                          activeOpacity={0.8}
                          onPress={() => handleItemPress(item)}
                          className={index === section.items.length - 1 ? 'flex-row items-center py-4' : 'flex-row items-center border-b border-white/40 py-4'}
                        >
                          <View className="mr-3.5 h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: item.iconBg }}>
                            <Ionicons name={item.icon} size={19} color={item.iconColor} />
                          </View>
                          <View className="flex-1">
                            <Text numberOfLines={1} className="text-[14px] font-bold text-[#0B3D62]">{item.title}</Text>
                            {item.subtitle ? <Text numberOfLines={1} className="mt-0.5 text-[12px] text-[#5B7C93]">{item.subtitle}</Text> : null}
                          </View>
                          <View className="ml-2 items-end">
                            {item.time ? <Text className="mb-1 text-[11px] text-[#8DA0B1]">{item.time}</Text> : null}
                            {item.amount ? (
                              <Text className="text-[15px] font-extrabold" style={{ color: item.amountColor ?? colors.navy }}>{item.amount}</Text>
                            ) : (
                              <Ionicons name="chevron-forward" size={16} color={colors.faint} />
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </GlassCard>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ExpenseScreen({ onBack }: { onBack: () => void }) {
  const e = expenseDetail;
  return (
    <View className="flex-1">
      <ScreenBackground />
      <SafeAreaView edges={['top']} className="flex-1">
        <DetailHeader title="Activity Details" onBack={onBack} />
        <ScrollView className="px-5" showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
          <View className="mb-4">
            <GlassCard>
              <View className="flex-row items-center">
                <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: colors.redBg }}>
                  <Ionicons name="restaurant" size={21} color={colors.red} />
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] font-extrabold text-[#0B3D62]">{e.title}</Text>
                  <Text className="mt-1 text-[12px] text-[#8DA0B1]">{e.date}</Text>
                </View>
              </View>
              <Text className="mt-3 text-[26px] font-extrabold text-[#0B3D62]">{e.amount}</Text>
            </GlassCard>
          </View>

          <View className="mb-4">
            <GlassCard>
              <InfoRow label="Added by" value={e.addedBy} avatarUri={e.addedByAvatar} />
              <InfoRow label="Group" value={e.group} icon="airplane" iconColor={colors.teal} iconBg={colors.tealBg} />
              <InfoRow label="Category" value={e.category} icon="flame" iconColor={colors.orange} iconBg={colors.orangeBg} />
              <InfoRow label="Split Type" value={e.splitType} />
              <InfoRow label="Split Among" value={e.splitAmong} />
              <InfoRow label="Each Person's Share" value={e.eachShare} last />
            </GlassCard>
          </View>

          <View className="mb-4">
            <GlassCard>
              <Text className="mb-1 text-[13px] font-semibold text-[#5B7C93]">Description</Text>
              <Text className="mb-3 text-[14px] leading-[20px] text-[#0B3D62]">{e.description}</Text>
              <Text className="mb-2 text-[13px] font-semibold text-[#5B7C93]">Bill Image</Text>
              <TouchableOpacity activeOpacity={0.85} className="flex-row items-center justify-between">
                <Image source={{ uri: e.billImage }} className="h-14 w-14 rounded-xl" />
                <Ionicons name="chevron-forward" size={18} color={colors.faint} />
              </TouchableOpacity>
            </GlassCard>
          </View>

          <GlassCard>
            <Text className="mb-1 text-[13px] font-extrabold text-[#0B3D62]">Participants</Text>
            {e.participants.map((p, i) => (
              <View key={p.name} className={`flex-row items-center justify-between py-3 ${i < e.participants.length - 1 ? 'border-b border-white/40' : ''}`}>
                <View className="flex-row items-center">
                  <Image source={{ uri: p.avatar }} className="mr-2.5 h-8 w-8 rounded-full" />
                  <Text className="text-[14px] font-semibold text-[#0B3D62]">{p.name}</Text>
                </View>
                <Text className="text-[14px] font-extrabold text-[#0B3D62]">{p.share}</Text>
              </View>
            ))}
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SettlementScreen({ onBack }: { onBack: () => void }) {
  const s = settlementDetail;
  return (
    <View className="flex-1">
      <ScreenBackground />
      <SafeAreaView edges={['top']} className="flex-1">
        <DetailHeader title="Activity Details" onBack={onBack} />
        <ScrollView className="px-5" showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
          <View className="mb-4">
            <GlassCard>
              <View className="flex-row items-center">
                <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: colors.tealBg }}>
                  <Ionicons name="cash" size={21} color={colors.teal} />
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] font-extrabold text-[#0B3D62]">{s.title}</Text>
                  <Text className="text-[13px] text-[#5B7C93]">{s.subtitle}</Text>
                  <Text className="mt-1 text-[12px] text-[#8DA0B1]">{s.date}</Text>
                </View>
              </View>
              <Text className="mt-3 text-[26px] font-extrabold" style={{ color: colors.teal }}>{s.amount}</Text>
            </GlassCard>
          </View>

          <View className="mb-4">
            <GlassCard>
              <InfoRow label="From" value={s.from.name} avatarUri={s.from.avatar} />
              <InfoRow label="To" value={s.to.name} avatarUri={s.to.avatar} />
              <InfoRow label="Group" value={s.group} icon="airplane" iconColor={colors.teal} iconBg={colors.tealBg} />
              <View className="flex-row items-center justify-between border-b border-white/40 py-3">
                <Text className="text-[13px] font-semibold text-[#5B7C93]">Status</Text>
                <StatusPill label={s.status} color={colors.teal} bg={colors.tealBg} />
              </View>
              <InfoRow label="Note" value={s.note} last />
            </GlassCard>
          </View>

          <NoteBanner text={s.banner} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function EventScreen({ onBack, onNavigate }: { onBack: () => void; onNavigate: (s: Screen) => void }) {
  const ev = eventDetail;
  return (
    <View className="flex-1">
      <ScreenBackground />
      <SafeAreaView edges={['top']} className="flex-1">
        <DetailHeader title="Activity Details" onBack={onBack} />
        <ScrollView className="px-5" showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
          <View className="mb-4">
            <GlassCard>
              <View className="flex-row items-center">
                <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: ev.iconBg }}>
                  <Ionicons name={ev.icon} size={21} color={ev.iconColor} />
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] font-extrabold text-[#0B3D62]">{ev.title}</Text>
                  <Text className="mt-1 text-[12px] text-[#8DA0B1]">{ev.date}</Text>
                </View>
              </View>
            </GlassCard>
          </View>

          <View className="mb-4">
            <GlassCard>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onNavigate({ name: 'member', params: { id: ev.member.id } })}
                className="flex-row items-center justify-between border-b border-white/40 py-3"
              >
                <Text className="text-[13px] font-semibold text-[#5B7C93]">Member</Text>
                <View className="flex-row items-center">
                  <Image source={{ uri: ev.member.avatar }} className="mr-2 h-7 w-7 rounded-full" />
                  <View>
                    <Text className="text-[14px] font-bold text-[#0B3D62]">{ev.member.name}</Text>
                    <Text className="text-[11px] text-[#8DA0B1]">{ev.member.sub}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <InfoRow label="Group" value={ev.group} icon="airplane" iconColor={colors.teal} iconBg={colors.tealBg} />
              <InfoRow label="Invited by" value={ev.invitedBy.name} avatarUri={ev.invitedBy.avatar} last />
            </GlassCard>
          </View>

          <NoteBanner text={ev.banner} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function MemberScreen({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'all' | ActivityType>('all');
  const sections = memberEvents
    .map((s) => ({ ...s, items: s.items.filter((i) => activeTab === 'all' || i.type === activeTab) }))
    .filter((s) => s.items.length > 0);

  return (
    <View className="flex-1">
      <ScreenBackground />
      <SafeAreaView edges={['top']} className="flex-1">
        <DetailHeader title="Activity" onBack={onBack} />

        <View className="mx-5 mb-4 rounded-[22px] border border-white/60 overflow-hidden" style={[cardShadow, glassBg]}>
          <GlassLayers radius={22} />
          <View className="flex-row items-center px-4 py-3.5">
            <Image source={{ uri: memberProfile.avatar }} className="mr-3 h-12 w-12 rounded-full" />
            <View>
              <Text className="text-[16px] font-extrabold text-[#0B3D62]">{memberProfile.name}</Text>
              <Text className="mt-0.5 text-[12px] text-[#5B7C93]">{memberProfile.sinceLabel}</Text>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 flex-grow-0" contentContainerClassName="px-5 pr-8">
          {filters
            .filter((f) => f.key !== 'member')
            .map((t) => {
              const active = activeTab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  activeOpacity={0.85}
                  onPress={() => setActiveTab(t.key)}
                  className="mr-2 flex-row items-center overflow-hidden rounded-full border px-3.5 py-2"
                  style={[
                    { flexShrink: 0 },
                    active
                      ? { borderColor: 'transparent', backgroundColor: colors.teal, ...cardShadow, shadowColor: colors.teal, shadowOpacity: 0.35 }
                      : { borderColor: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.45)' },
                  ]}
                >
                  {!active ? <GlassLayers radius={24} /> : null}
                  <Ionicons
                    name={t.icon}
                    size={12}
                    color={active ? '#FFFFFF' : colors.navySoft}
                    style={{ marginRight: 4 }}
                  />
                  <Text className={`text-[12.5px] font-bold ${active ? 'text-white' : 'text-[#3E6E8E]'}`}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
        </ScrollView>

        <ScrollView className="px-5" showsVerticalScrollIndicator={false} contentContainerClassName="pb-44">
          {sections.length === 0 ? (
            <View className="mt-16 items-center px-8">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-white/40">
                <Ionicons name="search" size={32} color={colors.faint} />
              </View>
              <Text className="text-[16px] font-extrabold text-[#0B3D62]">No activity yet</Text>
              <Text className="mt-1 text-center text-[13px] text-[#5B7C93]">{memberProfile.name}'s activity in this group will appear here.</Text>
            </View>
          ) : (
            sections.map((section) => (
              <View key={section.section} className="mb-6">
                <Text className="mb-3 text-[13px] font-bold text-[#5B7C93]">{section.section}</Text>
                <GlassCard>
                  <View className="-m-4 px-4">
                    {section.items.map((item, index) => (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.8}
                        className={index === section.items.length - 1 ? 'flex-row items-center py-4' : 'flex-row items-center border-b border-white/40 py-4'}
                      >
                        <View className="mr-3.5 h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: item.iconBg }}>
                          <Ionicons name={item.icon} size={19} color={item.iconColor} />
                        </View>
                        <View className="flex-1">
                          <Text numberOfLines={1} className="text-[14px] font-bold text-[#0B3D62]">{item.title}</Text>
                          {item.subtitle ? <Text numberOfLines={1} className="mt-0.5 text-[12px] text-[#5B7C93]">{item.subtitle}</Text> : null}
                        </View>
                        <View className="ml-2 items-end">
                          {item.time ? <Text className="mb-1 text-[11px] text-[#8DA0B1]">{item.time}</Text> : null}
                          {item.amount ? <Text className="text-[15px] font-extrabold text-[#0B3D62]">{item.amount}</Text> : null}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </GlassCard>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   ROOT — swap this internal stack for expo-router later if you want deep
   links; for now everything lives in this one file and "just works".
   ──────────────────────────────────────────────────────────────────────── */

export default function ActivityFlow() {
  const [stack, setStack] = useState<Screen[]>([{ name: 'main' }]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<ActivityFilters | null>(null);

  const push = (screen: Screen) => setStack((s) => [...s, screen]);
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const current = stack[stack.length - 1];

  return (
    <>
      {current.name === 'main' && (
        <MainScreen onNavigate={push} onOpenFilters={() => setFilterModalVisible(true)} appliedFilters={appliedFilters} />
      )}
      {current.name === 'expense' && <ExpenseScreen onBack={pop} />}
      {current.name === 'settlement' && <SettlementScreen onBack={pop} />}
      {current.name === 'event' && <EventScreen onBack={pop} onNavigate={push} />}
      {current.name === 'member' && <MemberScreen onBack={pop} />}

      <ActivityFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={(f) => {
          setAppliedFilters(f);
          setFilterModalVisible(false);
        }}
      />
    </>
  );
}