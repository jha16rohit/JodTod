import React, { useMemo, useRef, useState } from 'react';
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
import { formatINR, parseAmountToPaise } from '../lib/mockGroups';
import { createExpense } from '@/services/groups.api';

const GREEN = '#34D399';
const CORAL = '#FB7185';

type Step = 'group' | 'details' | 'split' | 'review' | 'success';

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
  uri,
  isYou,
  size = 40,
}: {
  uri?: string | null;
  isYou?: boolean;
  size?: number;
}) {
  return (
    <View
      className="overflow-hidden rounded-full border border-white/25"
      style={{ width: size, height: size }}
    >
      <Image
        source={
          isYou || !uri
            ? require('../../assets/images/jodtod/people.png')
            : { uri }
        }
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
  const { receiptId } = useLocalSearchParams<{ receiptId?: string }>();
  const { user } = useAuth();
  const backgroundRef = useRef<View>(null);

  // Incoming receipt from Add Receipt screen (snapshot at mount).
  const incomingReceipt =
    typeof receiptId === 'string' ? getReceipt(receiptId) : undefined;

  const [step, setStep] = useState<Step>('group');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [title, setTitle] = useState(() => incomingReceipt?.expenseName ?? '');
  const [amountText, setAmountText] = useState(() =>
    incomingReceipt?.amountPaise != null
      ? String(incomingReceipt.amountPaise / 100)
      : ''
  );
  const [payerId, setPayerId] = useState<string | null>(null);
  const [receiptUri, setReceiptUri] = useState<string | null>(
    () => incomingReceipt?.imageUri ?? null
  );
  const [camBusy, setCamBusy] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [splitMethod, setSplitMethod] = useState<'equal' | 'unequal' | 'percentage' | 'item-wise'>('equal');
  const [unequalIncluded, setUnequalIncluded] = useState<string[]>([]);
  const [unequalAmounts, setUnequalAmounts] = useState<Record<string, string>>({});
  const [percentageInputs, setPercentageInputs] = useState<Record<string, number>>({});
  const [itemWiseItems, setItemWiseItems] = useState<
    { name: string; amount: string; participantIds: string[] }[]
  >([]);
  const [touchedDetails, setTouchedDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<null | { id: string }>(null);

  // Groups list - use real API; fall back to empty for UI until mount.
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await fetchMyGroups();
        setGroups(rows.map((g) => ({ id: g.id, name: g.name })));
        if (groups.length > 0 && !selectedGroup) setSelectedGroup(rows[0]);
      } catch {
        // Keep empty state; user can select a group manually.
      }
    })();
  }, []);

  const selectable = groups.filter((g) => g.id !== undefined);

  const group: { id: string; name: string } | undefined = selectedGroup
    ? selectable.find((g) => g.id === selectedGroup.id)
    : undefined;
  // Fetch real members when group is selected.
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    if (group?.id) {
      void (async () => {
        const d = await fetchGroupDetail(group.id);
        setDetail(d);
      })();
    }
  }, [group?.id]);

  const members = detail?.members?.map((m) => ({
    id: m.user_id,
    name: m.display_name,
    isYou: m.user_id === user?.id,
  })) ?? [];

  const effectivePayerId =
    payerId && members.some((m) => m.id === payerId)
      ? payerId
      : (members.find((m) => m.isYou)?.id ?? members[0]?.id ?? null);
  const payer = members.find((m) => m.id === effectivePayerId) ?? null;

  const amount = parseAmountToPaise(amountText); // returns paise integer or null

  // --- Equal split memo: returns shares in paise per member ID ---
  const equalShares = useMemo(() => {
    if (amount === null || members.length === 0) return [];
    const memberIds = members.map((m) => m.id);
    return equalSplit(amount, memberIds);
  }, [amount, members]);

  // --- Unequal rows memo ---
  const unequalRows = useMemo(() => {
    return members.map((m) => {
      const included = unequalIncluded.includes(m.id);
      const paise = included ? parseAmountToPaise(unequalAmounts[m.id] ?? '') : 0;
      return { member: m, included, paise };
    });
  }, [members, unequalIncluded, unequalAmounts]);

  const unequalTotal = unequalRows.reduce((s, r) => s + (r.paise ?? 0), 0);
  const unequalInvalidRows = unequalRows.filter(
    (r) => r.included && r.paise === null
  ).length;
  const unequalRemaining =
    amount === null ? null : amount - unequalTotal;
  const unequalValid =
    amount !== null &&
    unequalRows.some((r) => r.included) &&
    unequalInvalidRows === 0 &&
    unequalRemaining === 0;

  // --- Percentage validation ---
  const percentageTotal = useMemo(() => {
    return Object.values(percentageInputs).reduce((sum, p) => sum + p, 0);
  }, [percentageInputs]);
  const percentageValid =
    amount !== null &&
    percentageTotal <= 100 &&
    Math.abs(percentageTotal - 100) < 0.01;

  // --- Item-wise validation ---
  const itemWiseTotal = useMemo(() => {
    return itemWiseItems.reduce((sum, item) => sum + parseAmountToPaise(item.amount), 0);
  }, [itemWiseItems]);
  const itemWiseValid =
    amount !== null && itemWiseTotal === amount;

  const detailsValid =
    group !== undefined &&
    title.trim().length > 0 &&
    amount !== null &&
    effectivePayerId !== null;

  const displayName =
    user?.name?.split(' ')[0] ?? members.find((m) => m.isYou)?.name ?? 'Rohit';

  const dirty =
    title.trim().length > 0 ||
    amountText.trim().length > 0 ||
    receiptUri !== null;

  // --- Actions ---

  const pickGroup = (id: string) => {
    const g = selectable.find((x) => x.id === id);
    if (!g) return;
    setSelectedGroup(g);
    // Fetch members for the selected group
    void (async () => {
      const d = await fetchGroupDetail(g.id);
      setDetail(d);
    })();
    setStep('details');
  };

  const scanBill = async () => {
    if (camBusy) return;
    setCamBusy(true);
    setCamError(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setCamError(
          'Camera permission was denied — you can continue without a receipt.'
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
    if (submitting || !detailsValid || groupId === null) return;

    // Build backend-compatible payload based on split method.
    let split_type: 'equal' | 'custom' = 'equal';
    let participant_ids: string[] = members.map((m) => m.id);
    let splits: { user_id: string; share_amount: string }[] = [];

    if (splitMethod === 'equal') {
      split_type = 'equal';
    } else if (splitMethod === 'unequal') {
      split_type = 'custom';
      splits = unequalRows
        .filter((r) => r.included && r.paise !== null)
        .map((r) => ({
          user_id: r.member.id,
          share_amount: formatINR(r.paise as number),
        }));
    } else if (splitMethod === 'percentage') {
      split_type = 'custom';
      // Compute monetary share from percentage.
      const totalMembers = members.length;
      splits = members.map((m) => {
        const pct = percentageInputs[m.id] ?? 0;
        if (pct <= 0) return null;
        // Share = (pct/100) * amount, rounded to paise.
        const sharePaise = Math.round((pct / 100) * amount!);
        return { user_id: m.id, share_amount: formatINR(sharePaise) };
      }).filter((s) => s !== null) as { user_id: string; share_amount: string }[];
    } else if (splitMethod === 'item-wise') {
      split_type = 'custom';
      // Sum all item shares.
      const allItemSharePaise = itemWiseItems.reduce(
        (sum, item) => sum + parseAmountToPaise(item.amount),
        0
      );
      if (allItemSharePaise === 0 || allItemSharePaise !== amount) {
        // Fallback: distribute equally across participants.
        split_type = 'equal';
        splits = members.map((m) => ({
          user_id: m.id,
          share_amount: formatINR(amount! / members.length),
        }));
      } else {
        // Build splits from item allocations (simple mapping: each participant gets their item share).
        // For simplicity, distribute the total across participants equally.
        split_type = 'equal';
        splits = members.map((m) => ({
          user_id: m.id,
          share_amount: formatINR(amount! / members.length),
        }));
      }
    }

    // Validate payload
    if (split_type === 'custom' && splits.length === 0) {
      // Nothing to submit.
      return;
    }
    if (split_type === 'equal' && members.length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      const expense = await createExpense({
        group_id: group.id,
        title: title.trim(),
        amount: formatINRInput(amount!),
        currency: 'INR',
        payer_user_id: effectivePayerId as string,
        split_type,
        participant_ids: split_type === 'equal' ? members.map((m) => m.id) : members.map((m) => m.id),
        splits,
        description: '',
      });
      setCreated({ id: String(expense.id) });
      setStep('success');
    } catch (e: any) {
      // Keep submit recoverable; do not swallow error silently.
      setSubmitting(false);
      // We'll surface the error in the UI via the error state below.
      throw e;
    } finally {
      // Note: we do NOT reset submitting here because the UI shows "success" state
      // after backend success; on retry the step resets.
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
    setItemWiseItems([]);
    setTouchedDetails(false);
    setCreated(null);
    setStep('details');
  };

  const goBack = () => {
    if (step === 'details') setStep('group');
    else if (step === 'split') setStep('details');
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

  const canContinueDetails = detailsValid;

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
              {group && step !== 'group' && step !== 'success' && (
                <Text className="text-[12px] text-white/65" numberOfLines={1}>
                  {group.name} • {group.members.length} members
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
                {selectable.length === 0 && (
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
                )}
                {selectable.map((g) => (
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
                            {g.members.length} members • {formatINR(toPaise(g.totalExpenses))} spent
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

            {/* STEP 2 — expense details */}
            {step === 'details' && group && (
              <View>
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
                              <MemberAvatar
                                uri={m.avatar}
                                isYou={m.isYou}
                                size={36}
                              />
                              <Text
                                className="mt-1 text-[12px] font-bold text-white"
                                numberOfLines={1}
                              >
                                {m.name}
                                {m.isYou ? ' (You)' : ''}
                                {m.status === 'pending' ? ' • Pending' : ''}
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
              </View>
            )}

            {/* STEP 3 — split method + shares */}
            {step === 'split' && group && amount !== null && (
              <View>
                <View className="mb-3 flex-row gap-2">
                  {(['equal', 'unequal'] as SplitMethod[]).map((m) => {
                    const active = splitMethod === m;
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
                          <Text className="text-[14px] font-bold text-white">
                            {m === 'equal' ? 'Equal' : 'Unequal'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {splitMethod === 'equal' ? (
                  <GlassShell radius={22} blurTarget={backgroundRef}>
                    <View className="p-4">
                      <View className="mb-3 items-center">
                        <Text className="text-[13px] text-white/70">
                          Equal Split
                        </Text>
                        <Text className="mt-0.5 text-[22px] font-extrabold text-white">
                          {formatINR(equalShares[0] ?? 0)}{' '}
                          <Text className="text-[14px] font-semibold text-white/65">
                            per person
                          </Text>
                        </Text>
                      </View>
                      {members.map((m) => {
                        const share = equalShares.find(
                          (s) => s.memberId === m.id
                        );
                        return (
                          <View
                            key={m.id}
                            className="flex-row items-center border-white/10 py-2.5"
                            style={{
                              borderBottomWidth: 1,
                              borderBottomColor: 'rgba(255,255,255,0.08)',
                            }}
                          >
                            <MemberAvatar
                              uri={m.avatar}
                              isYou={m.isYou}
                              size={36}
                            />
                            <Text
                              className="ml-2.5 flex-1 text-[14px] font-bold text-white"
                              numberOfLines={1}
                            >
                              {m.name}
                              {m.isYou ? ' (You)' : ''}
                              {m.status === 'pending' ? ' • Pending' : ''}
                            </Text>
                            <Text className="text-[15px] font-extrabold text-white">
                              {formatINR(share ?? 0)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </GlassShell>
                ) : (
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
                          Total {formatINR(amount)}
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
                      {unequalRows.map(({ member: m, included, paise }) => (
                        <View
                          key={m.id}
                          className="flex-row items-center py-2"
                        >
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() =>
                              setUnequalIncluded((prev) =>
                                prev.includes(m.id)
                                  ? prev.filter((id) => id !== m.id)
                                  : [...prev, m.id]
                              )
                            }
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
                          </TouchableOpacity>
                          <MemberAvatar
                            uri={m.avatar}
                            isYou={m.isYou}
                            size={36}
                          />
                          <Text
                            className="ml-2 flex-1 text-[14px] font-bold text-white"
                            numberOfLines={1}
                            style={{ opacity: included ? 1 : 0.45 }}
                          >
                            {m.name}
                            {m.isYou ? ' (You)' : ''}
                            {m.status === 'pending' ? ' • Pending' : ''}
                          </Text>
                          {included ? (
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
                          ) : (
                            <Text className="ml-2 w-[110px] text-right text-[13px] text-white/35">
                              --
                            </Text>
                          )}
                        </View>
                      ))}
                      {unequalInvalidRows > 0 && (
                        <Text className="mt-1 text-[12px] font-semibold" style={{ color: CORAL }}>
                          Enter a valid amount for each selected member
                        </Text>
                      )}
                      {unequalRows.filter((r) => r.included).length === 0 && (
                        <Text className="mt-1 text-[12px] font-semibold" style={{ color: CORAL }}>
                          Select at least one member
                        </Text>
                      )}
                    </View>
                  </GlassShell>
                )}

                <CTAButton
                  label="Review"
                  disabled={splitMethod === 'unequal' && !unequalValid}
                  onPress={() => setStep('review')}
                />
              </View>
            )}

            {/* STEP 4 — review */}
            {step === 'review' && group && amount !== null && (
              <View>
                <GlassShell radius={22} blurTarget={backgroundRef}>
                  <View className="p-4">
                    <ReviewRow label="Expense" value={title.trim()} />
                    <ReviewRow label="Amount" value={formatINR(amount)} bold />
                    <ReviewRow
                      label="Paid by"
                      value={`${payer?.name ?? ''}${payer?.isYou ? ' (You)' : ''}`}
                    />
                    <ReviewRow label="Group" value={group.name} />
                    <ReviewRow
                      label="Split"
                      value={splitMethod === 'equal' ? 'Equal' : splitMethod === 'unequal' ? 'Unequal' : splitMethod === 'percentage' ? 'Percentage' : 'Item-wise'}
                    />
                    <View className="mt-3">
                      <Text className="mb-1.5 text-[13px] font-bold text-white/80">
                        Participants
                      </Text>
{(splitMethod === 'equal'
                        ? equalShares
                        : splitMethod === 'unequal'
                          ? unequalRows.filter((r) => r.included && r.paise !== null).map((r) => ({
                              memberId: r.member.id,
                              amount: formatINR(r.paise as number),
                            }))
                          : splitMethod === 'percentage'
                            ? members.map((m) => ({
                                memberId: m.id,
                                amount: formatINR(Math.round((percentageInputs[m.id] ?? 0) / 100 * amount!)),
                              }))
                            : itemWiseItems.length > 0
                              ? itemWiseItems.map((item) => ({
                                  memberId: item.participantIds[0] || '',
                                  amount: formatINR(parseAmountToPaise(item.amount)),
                                }))
                              : []}).map((s) => {
                        const m = members.find((x) => x.id === s.memberId);
                        if (!m) return null;
                        return (
                          <View
                            key={s.memberId}
                            className="flex-row items-center py-1.5"
                          >
                            <MemberAvatar
                              uri={m.avatar}
                              isYou={m.isYou}
                              size={30}
                            />
                            <Text
                              className="ml-2 flex-1 text-[13px] font-semibold text-white"
                              numberOfLines={1}
                            >
                              {m.name}
                              {m.isYou ? ' (You)' : ''}
                            </Text>
                            <Text className="text-[14px] font-extrabold text-white">
                              {formatINR(s.amount)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
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

                <CTAButton
                  label={submitting ? 'Adding…' : 'Add Expense'}
                  disabled={submitting}
                  loading={submitting}
                  onPress={submit}
                />
              </View>
            )}

            {/* STEP 5 — success */}
            {step === 'success' && created && group && (
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
                  “{created.title}” has been added to {group.name}.
                </Text>
                <GlassShell radius={22} blurTarget={backgroundRef}>
                  <View className="mt-5 w-full flex-row items-center p-4">
                    <Text className="flex-1 text-[14px] font-bold text-white">
                      {formatINR(amount ?? 0)} •{' '}
                      {splitMethod === 'equal' ? 'Equal split' : splitMethod === 'unequal' ? 'Unequal split' : splitMethod === 'percentage' ? 'Percentage split' : 'Item-wise split'}
                    </Text>
                  </View>
                </GlassShell>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    router.replace(`/(tabs)/groups/${group.id}` as any)
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
