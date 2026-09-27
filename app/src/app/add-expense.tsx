import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView, BlurTargetView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import {
  equalSplit,
  formatINR,
  paiseToDecimalString,
  parseAmountToPaise,
  percentageShares,
  sharesToPayload,
  sumShares,
  type ExpenseShare,
  type SplitMethod,
} from '../lib/money';
import {
  getReceipt,
  linkReceiptToExpense,
} from '../lib/receipts';
import {
  createExpense,
  fetchGroupDetail,
  fetchMyGroups,
  GroupsApiError,
  type GroupDetail,
} from '@/services/groups.api';

const GREEN = '#34D399';
const CORAL = '#FB7185';

type Step = 'group' | 'details' | 'split' | 'review' | 'success';

type GroupOption = { id: string; name: string; memberCount: number };
type MemberOption = { id: string; name: string; isYou: boolean };
type ItemDraft = {
  id: string;
  name: string;
  amountText: string;
  participantIds: string[];
};

// ---------------------------------------------------------------------------
// Dark-glass primitives (same language as Home)
// ---------------------------------------------------------------------------

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

function FieldLabel({ text }: { text: string }) {
  return (
    <Text className="mb-1.5 text-[13px] font-bold text-white/80">{text}</Text>
  );
}

function InlineError({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <Text className="mt-1.5 text-[12px] font-semibold" style={{ color: CORAL }}>
      {text}
    </Text>
  );
}

function MemberAvatar({
  isYou,
  size = 40,
}: {
  isYou?: boolean;
  size?: number;
}) {
  return (
    <View
      className="overflow-hidden rounded-full border border-white/25"
      style={{ width: size, height: size }}
    >
      <Image
        source={require('../../assets/images/jodtod/people.png')}
        resizeMode="cover"
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Add Expense flow (single file, draft preserved across steps)
// ---------------------------------------------------------------------------

export default function AddExpense() {
  const router = useRouter();
  const { receiptId, groupId: presetGroupId } = useLocalSearchParams<{
    receiptId?: string;
    groupId?: string;
  }>();
  const { user } = useAuth();
  const backgroundRef = useRef<View>(null);

  // Incoming receipt from the Add Receipt queue (snapshot at mount).
  const incomingReceipt =
    typeof receiptId === 'string' ? getReceipt(receiptId) : undefined;

  const [step, setStep] = useState<Step>('group');
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    typeof presetGroupId === 'string' ? presetGroupId : null,
  );
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [title, setTitle] = useState(() => incomingReceipt?.expenseName ?? '');
  const [amountText, setAmountText] = useState(() =>
    incomingReceipt?.amountPaise != null
      ? String(incomingReceipt.amountPaise / 100)
      : '',
  );
  const [payerId, setPayerId] = useState<string | null>(null);
  const [receiptUri, setReceiptUri] = useState<string | null>(
    () => incomingReceipt?.imageUri ?? null,
  );
  const [camBusy, setCamBusy] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [unequalAmounts, setUnequalAmounts] = useState<Record<string, string>>({});
  const [percentageInputs, setPercentageInputs] = useState<Record<string, string>>({});
  const [items, setItems] = useState<ItemDraft[]>([]);

  const [touchedDetails, setTouchedDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    id: string;
    title: string;
    groupName: string;
  } | null>(null);

  // --- Groups list (real backend) ---
  const loadGroups = async () => {
    setGroupsLoading(true);
    setGroupsError(null);
    try {
      const rows = await fetchMyGroups();
      setGroupOptions(
        rows.map((g) => ({
          id: g.id,
          name: g.name,
          memberCount: g.member_count,
        })),
      );
    } catch (e) {
      setGroupOptions([]);
      setGroupsError(e instanceof Error ? e.message : 'Could not load groups.');
    } finally {
      setGroupsLoading(false);
    }
  };

  useEffect(() => {
    void loadGroups();
  }, []);

  // --- Group detail (real members) ---
  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const d = await fetchGroupDetail(id);
      setDetail(d);
      if (d) {
        const ids = d.members.map((m) => m.user_id);
        setSelectedIds(ids);
        setPayerId((prev) =>
          prev && ids.includes(prev)
            ? prev
            : (d.members.find((m) => m.user_id === user?.id)?.user_id ??
              ids[0] ??
              null),
        );
      }
    } catch (e) {
      setDetail(null);
      setDetailError(e instanceof Error ? e.message : 'Could not load group.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      void loadDetail(selectedGroupId);
    } else {
      setDetail(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);

  // Preset group from expenses screen / receipts: skip group selection.
  useEffect(() => {
    if (
      typeof presetGroupId === 'string' &&
      presetGroupId &&
      groupOptions.some((g) => g.id === presetGroupId)
    ) {
      setSelectedGroupId(presetGroupId);
      setStep('details');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupOptions]);

  const selectedGroup = groupOptions.find((g) => g.id === selectedGroupId) ?? null;

  const members: MemberOption[] = useMemo(() => {
    if (!detail) return [];
    return detail.members.map((m) => ({
      id: m.user_id,
      name: m.display_name,
      isYou: user?.id != null && m.user_id === user.id,
    }));
  }, [detail, user?.id]);

  const effectivePayerId =
    payerId && members.some((m) => m.id === payerId)
      ? payerId
      : (members.find((m) => m.isYou)?.id ?? members[0]?.id ?? null);
  const payer = members.find((m) => m.id === effectivePayerId) ?? null;

  const amountPaise = parseAmountToPaise(amountText);

  const participants = useMemo(
    () => members.filter((m) => selectedIds.includes(m.id)),
    [members, selectedIds],
  );

  // --- Equal shares (paise-exact, selection order) ---
  const equalShares: ExpenseShare[] = useMemo(() => {
    if (amountPaise === null || participants.length === 0) return [];
    return equalSplit(
      amountPaise,
      participants.map((m) => m.id),
    );
  }, [amountPaise, participants]);

  // --- Unequal ---
  const unequalShares: ExpenseShare[] = useMemo(() => {
    return participants.flatMap((m) => {
      const paise = parseAmountToPaise(unequalAmounts[m.id] ?? '');
      return paise === null ? [] : [{ memberId: m.id, amountPaise: paise }];
    });
  }, [participants, unequalAmounts]);
  const unequalTotal = sumShares(unequalShares);
  const unequalInvalid =
    participants.some(
      (m) => parseAmountToPaise(unequalAmounts[m.id] ?? '') === null,
    ) && participants.length > 0;
  const unequalRemaining = amountPaise === null ? null : amountPaise - unequalTotal;
  const unequalValid =
    amountPaise !== null &&
    participants.length > 0 &&
    !unequalInvalid &&
    unequalRemaining === 0 &&
    unequalShares.length === participants.length;

  // --- Percentage ---
  const percentageValues = useMemo(() => {
    const out: { memberId: string; percent: number }[] = [];
    for (const m of participants) {
      const raw = (percentageInputs[m.id] ?? '').trim();
      if (!raw) continue;
      const num = Number(raw);
      if (!Number.isFinite(num) || num < 0 || num > 100) {
        out.push({ memberId: m.id, percent: NaN });
        continue;
      }
      out.push({ memberId: m.id, percent: num });
    }
    return out;
  }, [participants, percentageInputs]);
  const percentageTotal = percentageValues.reduce(
    (sum, e) => sum + (Number.isFinite(e.percent) ? e.percent : 0),
    0,
  );
  const percentageNumbersValid =
    percentageValues.length === participants.length &&
    percentageValues.every((e) => Number.isFinite(e.percent));
  const percentageValid =
    amountPaise !== null &&
    participants.length > 0 &&
    percentageNumbersValid &&
    Math.abs(percentageTotal - 100) < 0.005;
  const percentageComputed: ExpenseShare[] = useMemo(() => {
    if (amountPaise === null || !percentageValid) return [];
    return percentageShares(
      amountPaise,
      percentageValues.map((e) => ({ memberId: e.memberId, percent: e.percent })),
    );
  }, [amountPaise, percentageValid, percentageValues]);

  // --- Item-wise ---
  const itemStates = useMemo(() => {
    return items.map((item) => {
      const paise = parseAmountToPaise(item.amountText);
      const ids = item.participantIds.filter((pid) =>
        members.some((m) => m.id === pid),
      );
      return { item, paise, shares: paise === null || ids.length === 0 ? [] : equalSplit(paise, ids) };
    });
  }, [items, members]);
  const itemWiseTotal = itemStates.reduce(
    (sum, s) => sum + (s.paise ?? 0),
    0,
  );
  const itemWiseValid =
    amountPaise !== null &&
    items.length > 0 &&
    itemStates.every(
      (s) =>
        s.paise !== null &&
        s.item.name.trim().length > 0 &&
        s.shares.length > 0,
    ) &&
    itemWiseTotal === amountPaise;
  const itemWiseShares: ExpenseShare[] = useMemo(() => {
    const totals = new Map<string, number>();
    for (const s of itemStates) {
      for (const share of s.shares) {
        totals.set(share.memberId, (totals.get(share.memberId) ?? 0) + share.amountPaise);
      }
    }
    return [...totals.entries()].map(([memberId, total]) => ({
      memberId,
      amountPaise: total,
    }));
  }, [itemStates]);

  const splitValid =
    splitMethod === 'equal'
      ? participants.length > 0 && amountPaise !== null
      : splitMethod === 'unequal'
        ? unequalValid
        : splitMethod === 'percentage'
          ? percentageValid
          : itemWiseValid;

  const reviewShares: ExpenseShare[] =
    splitMethod === 'equal'
      ? equalShares
      : splitMethod === 'unequal'
        ? unequalShares
        : splitMethod === 'percentage'
          ? percentageComputed
          : itemWiseShares;

  const detailsValid =
    selectedGroup !== null &&
    detail !== null &&
    title.trim().length > 0 &&
    amountPaise !== null &&
    effectivePayerId !== null;

  const dirty =
    title.trim().length > 0 ||
    amountText.trim().length > 0 ||
    receiptUri !== null;

  // --- Actions ---

  const pickGroup = (id: string) => {
    setSelectedGroupId(id);
    setStep('details');
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const scanBill = async () => {
    if (camBusy) return;
    setCamBusy(true);
    setCamError(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setCamError(
          'Camera permission was denied — you can continue without a receipt.',
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setReceiptUri(result.assets[0].uri);
      }
    } catch {
      setCamError('Camera is unavailable on this device — continue without a receipt.');
    } finally {
      setCamBusy(false);
    }
  };

  const submit = async () => {
    if (
      submitting ||
      created ||
      !detailsValid ||
      !splitValid ||
      amountPaise === null ||
      !selectedGroup ||
      effectivePayerId === null
    ) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const isEqual = splitMethod === 'equal';
      const itemSummary =
        splitMethod === 'item-wise'
          ? ` Items: ${items
              .map(
                (i) =>
                  `${i.name.trim()} (${paiseToDecimalString(
                    parseAmountToPaise(i.amountText) ?? 0,
                  )})`,
              )
              .join(', ')
              .slice(0, 400)}`
          : '';
      const expense = await createExpense({
        group_id: selectedGroup.id,
        title: title.trim(),
        amount: paiseToDecimalString(amountPaise),
        payer_user_id: effectivePayerId,
        split_type: isEqual ? 'equal' : 'custom',
        participant_ids: isEqual
          ? participants.map((m) => m.id)
          : reviewShares.map((s) => s.memberId),
        splits: isEqual ? [] : sharesToPayload(reviewShares),
        description: itemSummary ? itemSummary.trim() : undefined,
      });
      // Mark the queued receipt as attached (local queue only; the
      // backend has no receipt upload, so nothing is uploaded).
      if (typeof receiptId === 'string' && receiptId) {
        linkReceiptToExpense(receiptId, {
          expenseId: String(expense.id),
          groupId: selectedGroup.id,
          expenseName: `${title.trim()} • ${selectedGroup.name}`,
          amountPaise,
        });
      }
      setCreated({
        id: String(expense.id),
        title: String(expense.title),
        groupName: selectedGroup.name,
      });
      setStep('success');
    } catch (e) {
      // Recoverable: stay on review with the error; nothing is faked.
      setSubmitError(
        e instanceof GroupsApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not add the expense. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForAnother = () => {
    setTitle('');
    setAmountText('');
    setReceiptUri(null);
    setCamError(null);
    setSplitMethod('equal');
    setUnequalAmounts({});
    setPercentageInputs({});
    setItems([]);
    setTouchedDetails(false);
    setSubmitError(null);
    setCreated(null);
    setStep('details');
  };

  const goBack = () => {
    if (step === 'details') {
      if (typeof presetGroupId === 'string' && presetGroupId) router.back();
      else setStep('group');
    } else if (step === 'split') setStep('details');
    else if (step === 'review') setStep('split');
    else router.back();
  };

  const cancelFlow = () => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert('Discard expense?', 'Your draft will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const stepTitle =
    step === 'group'
      ? 'Add Expense'
      : step === 'details'
        ? 'Expense Details'
        : step === 'split'
          ? 'Split Expense'
          : step === 'review'
            ? 'Review'
            : 'Success';

  const canContinueDetails = detailsValid && !detailLoading;

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
          {/* Header */}
          <View className="flex-row items-center px-4 pb-2 pt-1">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={step === 'success' ? () => router.back() : goBack}
              className="h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10"
            >
              <Ionicons
                name={step === 'group' ? 'close' : 'chevron-back'}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <View className="ml-3 flex-1">
              <Text className="text-[19px] font-extrabold text-white">
                {stepTitle}
              </Text>
              {selectedGroup && step !== 'group' && step !== 'success' && (
                <Text className="text-[12px] text-white/65" numberOfLines={1}>
                  {selectedGroup.name} • {members.length} members
                </Text>
              )}
            </View>
            {step !== 'success' && (
              <TouchableOpacity activeOpacity={0.8} onPress={cancelFlow}>
                <Text className="text-[13px] font-bold text-white/60">
                  Cancel
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            className="px-4"
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* STEP 1 — select group */}
            {step === 'group' && (
              <View>
                <Text className="mb-3 text-[14px] text-white/70">
                  Select the group for this expense
                </Text>
                {groupsLoading ? (
                  <GlassShell radius={22} blurTarget={backgroundRef}>
                    <View className="items-center p-6">
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text className="mt-2 text-[13px] text-white/65">
                        Loading groups…
                      </Text>
                    </View>
                  </GlassShell>
                ) : groupsError ? (
                  <GlassShell radius={22} blurTarget={backgroundRef}>
                    <View className="items-center p-6">
                      <Text className="text-[14px] font-bold text-white">
                        Could not load groups
                      </Text>
                      <Text className="mt-1 text-center text-[13px] text-white/65">
                        {groupsError}
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => void loadGroups()}
                        className="mt-4 rounded-full px-5 py-2.5"
                        style={{ backgroundColor: 'rgba(52,211,153,0.18)' }}
                      >
                        <Text className="text-[13px] font-bold text-white">
                          Retry
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </GlassShell>
                ) : groupOptions.length === 0 ? (
                  <GlassShell radius={22} blurTarget={backgroundRef}>
                    <View className="items-center p-6">
                      <Text className="text-[15px] font-bold text-white">
                        No groups yet
                      </Text>
                      <Text className="mt-1 text-center text-[13px] text-white/65">
                        Create a group first, then add expenses to it.
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => router.replace('/(tabs)/groups/create' as any)}
                        className="mt-4 rounded-full px-5 py-2.5"
                        style={{ backgroundColor: 'rgba(52,211,153,0.18)' }}
                      >
                        <Text className="text-[13px] font-bold text-white">
                          Create a group
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </GlassShell>
                ) : (
                  groupOptions.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      activeOpacity={0.85}
                      onPress={() => pickGroup(g.id)}
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
                              {g.memberCount === 1
                                ? '1 member'
                                : `${g.memberCount} members`}
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
                  ))
                )}
              </View>
            )}

            {/* STEP 2 — expense details */}
            {step === 'details' && selectedGroup && (
              <View>
                {detailLoading ? (
                  <GlassShell radius={22} blurTarget={backgroundRef}>
                    <View className="items-center p-6">
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text className="mt-2 text-[13px] text-white/65">
                        Loading members…
                      </Text>
                    </View>
                  </GlassShell>
                ) : detailError || !detail ? (
                  <GlassShell radius={22} blurTarget={backgroundRef}>
                    <View className="items-center p-6">
                      <Text className="text-[14px] font-bold text-white">
                        Could not load group
                      </Text>
                      <Text className="mt-1 text-center text-[13px] text-white/65">
                        {detailError ?? 'Group not found.'}
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() =>
                          selectedGroupId && void loadDetail(selectedGroupId)
                        }
                        className="mt-4 rounded-full px-5 py-2.5"
                        style={{ backgroundColor: 'rgba(52,211,153,0.18)' }}
                      >
                        <Text className="text-[13px] font-bold text-white">
                          Retry
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </GlassShell>
                ) : (
                  <>
                    <GlassShell radius={22} blurTarget={backgroundRef}>
                      <View className="p-4">
                        <FieldLabel text="Expense name" />
                        <TextInput
                          value={title}
                          onChangeText={setTitle}
                          placeholder="Dinner at Bruno's"
                          placeholderTextColor="rgba(255,255,255,0.35)"
                          className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-3 text-[15px] text-white"
                        />
                        <InlineError
                          text={
                            touchedDetails && title.trim().length === 0
                              ? 'Enter an expense name'
                              : null
                          }
                        />

                        <View className="mt-4">
                          <FieldLabel text="Amount" />
                          <View className="flex-row items-center rounded-xl border border-white/20 bg-white/10 px-3.5">
                            <Text className="mr-1 text-[17px] font-extrabold text-white">
                              ₹
                            </Text>
                            <TextInput
                              value={amountText}
                              onChangeText={setAmountText}
                              placeholder="0.00"
                              placeholderTextColor="rgba(255,255,255,0.35)"
                              keyboardType="decimal-pad"
                              className="flex-1 py-3 text-[17px] font-bold text-white"
                            />
                          </View>
                          <InlineError
                            text={
                              touchedDetails && amountPaise === null
                                ? 'Enter a valid amount'
                                : null
                            }
                          />
                        </View>

                        <View className="mt-4">
                          <FieldLabel text="Paid by" />
                          <View className="flex-row gap-2">
                            {members.map((m) => {
                              const active = m.id === effectivePayerId;
                              return (
                                <TouchableOpacity
                                  key={m.id}
                                  activeOpacity={0.85}
                                  onPress={() => setPayerId(m.id)}
                                  className={`flex-1 items-center rounded-2xl border px-1 py-2.5 ${
                                    active
                                      ? 'border-white/30'
                                      : 'border-white/15'
                                  }`}
                                  style={
                                    active
                                      ? { backgroundColor: 'rgba(52,211,153,0.16)' }
                                      : { backgroundColor: 'rgba(255,255,255,0.05)' }
                                  }
                                >
                                  <MemberAvatar isYou={m.isYou} size={36} />
                                  <Text
                                    className="mt-1 text-[12px] font-bold text-white"
                                    numberOfLines={1}
                                  >
                                    {m.name}
                                    {m.isYou ? ' (You)' : ''}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>

                        <View className="mt-4">
                          <FieldLabel text="Receipt (optional)" />
                          {receiptUri ? (
                            <View className="flex-row items-center rounded-2xl border border-white/20 bg-white/10 p-2.5">
                              <Image
                                source={{ uri: receiptUri }}
                                resizeMode="cover"
                                style={{ width: 64, height: 64, borderRadius: 12 }}
                              />
                              <Text className="ml-3 flex-1 text-[13px] font-semibold text-white">
                                Bill attached
                              </Text>
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={scanBill}
                                className="mr-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5"
                              >
                                <Text className="text-[12px] font-bold text-white">
                                  Retake
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => setReceiptUri(null)}
                                className="h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10"
                              >
                                <Ionicons name="trash" size={16} color={CORAL} />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              activeOpacity={0.85}
                              onPress={scanBill}
                              disabled={camBusy}
                              className="flex-row items-center justify-center rounded-2xl border border-dashed border-white/25 bg-white/10 py-3.5"
                            >
                              {camBusy ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <Ionicons name="scan" size={20} color={GREEN} />
                              )}
                              <Text className="ml-2 text-[14px] font-bold text-white">
                                {camBusy ? 'Opening camera…' : 'Scan Bill'}
                              </Text>
                            </TouchableOpacity>
                          )}
                          {camError && (
                            <Text className="mt-1.5 text-[12px] text-white/70">
                              {camError}
                            </Text>
                          )}
                        </View>
                      </View>
                    </GlassShell>

                    <CTAButton
                      label="Split Expense"
                      disabled={!canContinueDetails}
                      onPress={() => {
                        setTouchedDetails(true);
                        if (canContinueDetails) setStep('split');
                      }}
                    />
                  </>
                )}
              </View>
            )}

            {/* STEP 3 — split method + shares */}
            {step === 'split' && selectedGroup && amountPaise !== null && (
              <View>
                <View className="mb-3 flex-row gap-2">
                  {(['equal', 'unequal', 'percentage', 'item-wise'] as SplitMethod[]).map(
                    (m) => {
                      const active = splitMethod === m;
                      const label =
                        m === 'equal'
                          ? 'Equal'
                          : m === 'unequal'
                            ? 'Unequal'
                            : m === 'percentage'
                              ? '%'
                              : 'Items';
                      return (
                        <TouchableOpacity
                          key={m}
                          activeOpacity={0.9}
                          onPress={() => setSplitMethod(m)}
                          className="flex-1"
                        >
                          <View
                            className="items-center rounded-full border py-2.5"
                            style={{
                              borderColor: active
                                ? 'rgba(52,211,153,0.5)'
                                : 'rgba(255,255,255,0.15)',
                              backgroundColor: active
                                ? 'rgba(52,211,153,0.16)'
                                : 'rgba(255,255,255,0.05)',
                            }}
                          >
                            <Text className="text-[13px] font-bold text-white">
                              {label}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    },
                  )}
                </View>

                {/* Participant selection (equal / percentage). Unequal and
                    item-wise carry their own inclusion controls below. */}
                {splitMethod !== 'item-wise' && (
                  <GlassShell radius={22} blurTarget={backgroundRef}>
                    <View className="p-4">
                      <FieldLabel text="Participants" />
                      {members.map((m) => {
                        const included = selectedIds.includes(m.id);
                        return (
                          <TouchableOpacity
                            key={m.id}
                            activeOpacity={0.8}
                            onPress={() => toggleSelected(m.id)}
                            className="flex-row items-center py-2"
                          >
                            <View
                              className="h-9 w-9 items-center justify-center"
                            >
                              <View
                                className="h-6 w-6 items-center justify-center rounded-full border"
                                style={{
                                  borderColor: included
                                    ? GREEN
                                    : 'rgba(255,255,255,0.3)',
                                  backgroundColor: included
                                    ? GREEN
                                    : 'transparent',
                                }}
                              >
                                {included && (
                                  <Ionicons
                                    name="checkmark"
                                    size={15}
                                    color="#052e22"
                                  />
                                )}
                              </View>
                            </View>
                            <MemberAvatar isYou={m.isYou} size={32} />
                            <Text
                              className="ml-2 flex-1 text-[14px] font-bold text-white"
                              numberOfLines={1}
                              style={{ opacity: included ? 1 : 0.45 }}
                            >
                              {m.name}
                              {m.isYou ? ' (You)' : ''}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                      {participants.length === 0 && (
                        <Text className="mt-1 text-[12px] font-semibold" style={{ color: CORAL }}>
                          Select at least one participant
                        </Text>
                      )}
                    </View>
                  </GlassShell>
                )}

                {splitMethod === 'equal' && (
                  <GlassShell radius={22} blurTarget={backgroundRef}>
                    <View className="p-4">
                      <View className="mb-3 items-center">
                        <Text className="text-[13px] text-white/70">
                          Equal Split
                        </Text>
                        <Text className="mt-0.5 text-[22px] font-extrabold text-white">
                          {equalShares.length > 0
                            ? formatINR(equalShares[0].amountPaise)
                            : formatINR(0)}{' '}
                          <Text className="text-[14px] font-semibold text-white/65">
                            per person
                          </Text>
                        </Text>
                      </View>
                      {equalShares.map((s) => {
                        const m = members.find((x) => x.id === s.memberId);
                        if (!m) return null;
                        return (
                          <View
                            key={s.memberId}
                            className="flex-row items-center py-2.5"
                            style={{
                              borderBottomWidth: 1,
                              borderBottomColor: 'rgba(255,255,255,0.08)',
                            }}
                          >
                            <MemberAvatar isYou={m.isYou} size={36} />
                            <Text
                              className="ml-2.5 flex-1 text-[14px] font-bold text-white"
                              numberOfLines={1}
                            >
                              {m.name}
                              {m.isYou ? ' (You)' : ''}
                            </Text>
                            <Text className="text-[15px] font-extrabold text-white">
                              {formatINR(s.amountPaise)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </GlassShell>
                )}

                {splitMethod === 'unequal' && (
                  <GlassShell radius={22} blurTarget={backgroundRef}>
                    <View className="p-4">
                      <View
                        className="mb-3 flex-row items-center justify-between rounded-xl px-3 py-2.5"
                        style={{
                          backgroundColor:
                            unequalRemaining === 0
                              ? 'rgba(52,211,153,0.14)'
                              : 'rgba(251,113,133,0.12)',
                        }}
                      >
                        <Text className="text-[13px] font-bold text-white">
                          Total {formatINR(amountPaise)}
                        </Text>
                        <Text
                          className="text-[13px] font-extrabold"
                          style={{
                            color:
                              unequalRemaining === 0 ? GREEN : CORAL,
                          }}
                        >
                          {unequalRemaining === 0
                            ? 'Exact ✓'
                            : unequalRemaining !== null && unequalRemaining > 0
                              ? `${formatINR(unequalRemaining)} remaining`
                              : `${formatINR(-(unequalRemaining ?? 0))} over`}
                        </Text>
                      </View>
                      {participants.map((m) => (
                        <View key={m.id} className="flex-row items-center py-2">
                          <MemberAvatar isYou={m.isYou} size={36} />
                          <Text
                            className="ml-2 flex-1 text-[14px] font-bold text-white"
                            numberOfLines={1}
                          >
                            {m.name}
                            {m.isYou ? ' (You)' : ''}
                          </Text>
                          <View className="ml-2 w-[110px] flex-row items-center rounded-xl border border-white/20 bg-white/10 px-2.5">
                            <Text className="mr-0.5 text-[14px] font-bold text-white">
                              ₹
                            </Text>
                            <TextInput
                              value={unequalAmounts[m.id] ?? ''}
                              onChangeText={(v) =>
                                setUnequalAmounts((prev) => ({
                                  ...prev,
                                  [m.id]: v,
                                }))
                              }
                              placeholder="0"
                              placeholderTextColor="rgba(255,255,255,0.35)"
                              keyboardType="decimal-pad"
                              className="flex-1 py-2 text-[14px] font-bold text-white"
                            />
                          </View>
                        </View>
                      ))}
                      {unequalInvalid && (
                        <Text className="mt-1 text-[12px] font-semibold" style={{ color: CORAL }}>
                          Enter a valid amount for each participant
                        </Text>
                      )}
                    </View>
                  </GlassShell>
                )}

                {splitMethod === 'percentage' && (
                  <GlassShell radius={22} blurTarget={backgroundRef}>
                    <View className="p-4">
                      <View
                        className="mb-3 flex-row items-center justify-between rounded-xl px-3 py-2.5"
                        style={{
                          backgroundColor: percentageValid
                            ? 'rgba(52,211,153,0.14)'
                            : 'rgba(251,113,133,0.12)',
                        }}
                      >
                        <Text className="text-[13px] font-bold text-white">
                          Total {formatINR(amountPaise)}
                        </Text>
                        <Text
                          className="text-[13px] font-extrabold"
                          style={{ color: percentageValid ? GREEN : CORAL }}
                        >
                          {percentageValid
                            ? '100% ✓'
                            : `${Number.isFinite(percentageTotal) ? percentageTotal.toFixed(1) : '—'}% / 100%`}
                        </Text>
                      </View>
                      {participants.map((m) => {
                        const share = percentageComputed.find(
                          (s) => s.memberId === m.id,
                        );
                        return (
                          <View key={m.id} className="flex-row items-center py-2">
                            <MemberAvatar isYou={m.isYou} size={36} />
                            <Text
                              className="ml-2 flex-1 text-[14px] font-bold text-white"
                              numberOfLines={1}
                            >
                              {m.name}
                              {m.isYou ? ' (You)' : ''}
                              {share ? ` • ${formatINR(share.amountPaise)}` : ''}
                            </Text>
                            <View className="ml-2 w-[90px] flex-row items-center rounded-xl border border-white/20 bg-white/10 px-2.5">
                              <TextInput
                                value={percentageInputs[m.id] ?? ''}
                                onChangeText={(v) =>
                                  setPercentageInputs((prev) => ({
                                    ...prev,
                                    [m.id]: v,
                                  }))
                                }
                                placeholder="0"
                                placeholderTextColor="rgba(255,255,255,0.35)"
                                keyboardType="decimal-pad"
                                className="flex-1 py-2 text-[14px] font-bold text-white"
                              />
                              <Text className="text-[14px] font-bold text-white/70">
                                %
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                      {!percentageNumbersValid && (
                        <Text className="mt-1 text-[12px] font-semibold" style={{ color: CORAL }}>
                          Enter a valid percentage (0–100) for each participant
                        </Text>
                      )}
                    </View>
                  </GlassShell>
                )}

                {splitMethod === 'item-wise' && (
                  <GlassShell radius={22} blurTarget={backgroundRef}>
                    <View className="p-4">
                      <View
                        className="mb-3 flex-row items-center justify-between rounded-xl px-3 py-2.5"
                        style={{
                          backgroundColor: itemWiseValid
                            ? 'rgba(52,211,153,0.14)'
                            : 'rgba(251,113,133,0.12)',
                        }}
                      >
                        <Text className="text-[13px] font-bold text-white">
                          Items {formatINR(itemWiseTotal)} / {formatINR(amountPaise)}
                        </Text>
                        <Text
                          className="text-[13px] font-extrabold"
                          style={{ color: itemWiseValid ? GREEN : CORAL }}
                        >
                          {itemWiseValid ? 'Exact ✓' : 'Must match'}
                        </Text>
                      </View>
                      {items.map((item, idx) => (
                        <View
                          key={item.id}
                          className="mb-3 rounded-2xl border border-white/15 bg-white/5 p-3"
                        >
                          <View className="flex-row items-center gap-2">
                            <TextInput
                              value={item.name}
                              onChangeText={(v) =>
                                setItems((prev) =>
                                  prev.map((it) =>
                                    it.id === item.id ? { ...it, name: v } : it,
                                  ),
                                )
                              }
                              placeholder={`Item ${idx + 1} name`}
                              placeholderTextColor="rgba(255,255,255,0.35)"
                              className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-[14px] font-bold text-white"
                            />
                            <View className="w-[100px] flex-row items-center rounded-xl border border-white/20 bg-white/10 px-2.5">
                              <Text className="mr-0.5 text-[14px] font-bold text-white">
                                ₹
                              </Text>
                              <TextInput
                                value={item.amountText}
                                onChangeText={(v) =>
                                  setItems((prev) =>
                                    prev.map((it) =>
                                      it.id === item.id
                                        ? { ...it, amountText: v }
                                        : it,
                                    ),
                                  )
                                }
                                placeholder="0"
                                placeholderTextColor="rgba(255,255,255,0.35)"
                                keyboardType="decimal-pad"
                                className="flex-1 py-2.5 text-[14px] font-bold text-white"
                              />
                            </View>
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() =>
                                setItems((prev) =>
                                  prev.filter((it) => it.id !== item.id),
                                )
                              }
                              className="h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10"
                            >
                              <Ionicons name="trash" size={15} color={CORAL} />
                            </TouchableOpacity>
                          </View>
                          <Text className="mb-1.5 mt-2.5 text-[12px] font-bold text-white/70">
                            Shared by
                          </Text>
                          <View className="flex-row flex-wrap gap-1.5">
                            {members.map((m) => {
                              const on = item.participantIds.includes(m.id);
                              return (
                                <TouchableOpacity
                                  key={m.id}
                                  activeOpacity={0.85}
                                  onPress={() =>
                                    setItems((prev) =>
                                      prev.map((it) =>
                                        it.id === item.id
                                          ? {
                                              ...it,
                                              participantIds: on
                                                ? it.participantIds.filter(
                                                    (x) => x !== m.id,
                                                  )
                                                : [...it.participantIds, m.id],
                                            }
                                          : it,
                                      ),
                                    )
                                  }
                                  className="rounded-full border px-3 py-1.5"
                                  style={{
                                    borderColor: on
                                      ? GREEN
                                      : 'rgba(255,255,255,0.25)',
                                    backgroundColor: on
                                      ? 'rgba(52,211,153,0.18)'
                                      : 'transparent',
                                  }}
                                >
                                  <Text className="text-[12px] font-bold text-white">
                                    {m.name}
                                    {m.isYou ? ' (You)' : ''}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      ))}
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() =>
                          setItems((prev) => [
                            ...prev,
                            {
                              id: `item${Date.now()}${prev.length}`,
                              name: '',
                              amountText: '',
                              participantIds: members.map((m) => m.id),
                            },
                          ])
                        }
                        className="flex-row items-center justify-center rounded-2xl border border-dashed border-white/25 bg-white/10 py-3"
                      >
                        <Ionicons name="add" size={18} color={GREEN} />
                        <Text className="ml-1.5 text-[14px] font-bold text-white">
                          Add Item
                        </Text>
                      </TouchableOpacity>
                      {items.length === 0 && (
                        <Text className="mt-2 text-[12px] font-semibold" style={{ color: CORAL }}>
                          Add at least one item
                        </Text>
                      )}
                    </View>
                  </GlassShell>
                )}

                <CTAButton
                  label="Review"
                  disabled={!splitValid}
                  onPress={() => setStep('review')}
                />
              </View>
            )}

            {/* STEP 4 — review */}
            {step === 'review' && selectedGroup && amountPaise !== null && (
              <View>
                <GlassShell radius={22} blurTarget={backgroundRef}>
                  <View className="p-4">
                    <ReviewRow label="Expense" value={title.trim()} />
                    <ReviewRow label="Amount" value={formatINR(amountPaise)} bold />
                    <ReviewRow
                      label="Paid by"
                      value={`${payer?.name ?? ''}${payer?.isYou ? ' (You)' : ''}`}
                    />
                    <ReviewRow label="Group" value={selectedGroup.name} />
                    <ReviewRow
                      label="Split"
                      value={
                        splitMethod === 'equal'
                          ? 'Equal'
                          : splitMethod === 'unequal'
                            ? 'Unequal'
                            : splitMethod === 'percentage'
                              ? 'Percentage'
                              : 'Item-wise'
                      }
                    />
                    <View className="mt-3">
                      <Text className="mb-1.5 text-[13px] font-bold text-white/80">
                        Participants
                      </Text>
                      {reviewShares.map((s) => {
                        const m = members.find((x) => x.id === s.memberId);
                        if (!m) return null;
                        return (
                          <View
                            key={s.memberId}
                            className="flex-row items-center py-1.5"
                          >
                            <MemberAvatar isYou={m.isYou} size={30} />
                            <Text
                              className="ml-2 flex-1 text-[13px] font-semibold text-white"
                              numberOfLines={1}
                            >
                              {m.name}
                              {m.isYou ? ' (You)' : ''}
                            </Text>
                            <Text className="text-[14px] font-extrabold text-white">
                              {formatINR(s.amountPaise)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    {splitMethod === 'item-wise' && items.length > 0 && (
                      <View className="mt-3">
                        <Text className="mb-1.5 text-[13px] font-bold text-white/80">
                          Items
                        </Text>
                        {itemStates.map(({ item, paise }) => (
                          <View
                            key={item.id}
                            className="flex-row items-center justify-between py-1"
                          >
                            <Text
                              className="flex-1 text-[13px] text-white/75"
                              numberOfLines={1}
                            >
                              {item.name.trim()} • {item.participantIds.length} sharing
                            </Text>
                            <Text className="text-[13px] font-bold text-white">
                              {paise === null ? '—' : formatINR(paise)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {receiptUri && (
                      <View className="mt-3 flex-row items-center rounded-2xl border border-white/15 bg-white/10 p-2.5">
                        <Image
                          source={{ uri: receiptUri }}
                          resizeMode="cover"
                          style={{ width: 52, height: 52, borderRadius: 10 }}
                        />
                        <Text className="ml-2.5 flex-1 text-[13px] font-semibold text-white">
                          Receipt attached
                        </Text>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={GREEN}
                        />
                      </View>
                    )}
                  </View>
                </GlassShell>

                {submitError ? (
                  <View className="mt-3 rounded-2xl border border-red-300/40 bg-red-500/10 px-4 py-3">
                    <Text className="text-center text-[13px] font-semibold text-red-200">
                      {submitError}
                    </Text>
                  </View>
                ) : null}

                <CTAButton
                  label={submitting ? 'Adding…' : 'Add Expense'}
                  disabled={submitting || !splitValid}
                  loading={submitting}
                  onPress={() => void submit()}
                />
              </View>
            )}

            {/* STEP 5 — success */}
            {step === 'success' && created && selectedGroup && (
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
                  Expense Added!
                </Text>
                <Text className="mt-1.5 px-6 text-center text-[14px] text-white/75">
                  “{created.title}” has been added to {created.groupName}.
                </Text>
                <GlassShell radius={22} blurTarget={backgroundRef}>
                  <View className="mt-5 w-full flex-row items-center p-4">
                    <Text className="flex-1 text-[14px] font-bold text-white">
                      {amountPaise !== null ? formatINR(amountPaise) : ''} •{' '}
                      {splitMethod === 'equal'
                        ? 'Equal split'
                        : splitMethod === 'unequal'
                          ? 'Unequal split'
                          : splitMethod === 'percentage'
                            ? 'Percentage split'
                            : 'Item-wise split'}
                    </Text>
                  </View>
                </GlassShell>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    router.replace(`/(tabs)/groups/${selectedGroup.id}` as any)
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
                        View Group
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={resetForAnother}
                  className="mt-2.5 w-full items-center rounded-2xl border border-white/20 bg-white/10 py-3.5"
                >
                  <Text className="text-[15px] font-bold text-white">
                    Add Another Expense
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function ReviewRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-[13px] text-white/65">{label}</Text>
      <Text
        className={`text-[14px] text-white ${bold ? 'font-extrabold' : 'font-semibold'}`}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function CTAButton({
  label,
  disabled,
  loading,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
      className="mt-4 w-full"
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <LinearGradient
        colors={disabled ? ['#3a4a52', '#2b363c'] : ['#34D399', '#0E9F6E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          borderRadius: 16,
          shadowColor: disabled ? 'transparent' : GREEN,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <View className="flex-row items-center justify-center py-3.5">
          {loading && (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
          )}
          <Text className="text-[16px] font-extrabold text-white">{label}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
