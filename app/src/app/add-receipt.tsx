import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView, BlurTargetView } from 'expo-blur';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  addReceipt,
  deleteReceipt,
  getReceipt,
  hydrateReceipts,
  linkReceiptStatusLabel,
  receiptDateLabel,
  useReceipts,
  type Receipt,
} from '../lib/receipts';

const GREEN = '#34D399';
const CORAL = '#FB7185';

type ViewState = 'main' | 'preview' | 'saved' | 'detail';

// ---------------------------------------------------------------------------
// Dark-glass primitives (same language as Home / Add Expense)
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

function EmeraldCTA({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
      className="w-full"
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

function StatusPill({ receipt }: { receipt: Receipt }) {
  const linked = receipt.status === 'linked';
  return (
    <View
      className="rounded-full border px-2.5 py-1"
      style={{
        borderColor: linked
          ? 'rgba(52,211,153,0.35)'
          : 'rgba(255,255,255,0.2)',
        backgroundColor: linked
          ? 'rgba(52,211,153,0.14)'
          : 'rgba(255,255,255,0.08)',
      }}
    >
      <Text
        className="text-[11px] font-bold"
        style={{ color: linked ? GREEN : 'rgba(255,255,255,0.75)' }}
      >
        {linkReceiptStatusLabel(receipt)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Add Receipt: scan -> digital copy -> split now or save for later
// ---------------------------------------------------------------------------

export default function AddReceipt() {
  const router = useRouter();
  const backgroundRef = useRef<View>(null);
  const receipts = useReceipts();

  const [view, setView] = useState<ViewState>('main');
  const [captureUri, setCaptureUri] = useState<string | null>(null);
  const [savedReceipt, setSavedReceipt] = useState<Receipt | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [camBusy, setCamBusy] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    void hydrateReceipts();
  }, []);

  const selected = selectedId ? getReceipt(selectedId) : undefined;
  // "Expense title • Group name" snapshot stored at link time (the
  // backend has no receipt endpoint, so the queue stays on-device).
  const linkedExpenseName =
    selected?.status === 'linked' ? (selected.expenseName ?? null) : null;

  const scanBill = async () => {
    if (camBusy) return;
    setCamBusy(true);
    setCamError(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setCamError(
          'Camera permission was denied — you can return safely; nothing was saved.'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setCaptureUri(result.assets[0].uri);
        setView('preview');
      }
    } catch {
      setCamError('Camera is unavailable on this device.');
    } finally {
      setCamBusy(false);
    }
  };

  const splitNow = () => {
    if (!captureUri) return;
    const receipt = addReceipt(captureUri);
    setCaptureUri(null);
    router.push(`/add-expense?receiptId=${receipt.id}` as any);
  };

  const saveForLater = () => {
    if (!captureUri) return;
    const receipt = addReceipt(captureUri);
    setCaptureUri(null);
    setSavedReceipt(receipt);
    setView('saved');
  };

  const discardCapture = () => {
    setCaptureUri(null);
    setView('main');
  };

  const confirmDiscardCapture = () => {
    Alert.alert(
      'Discard scan?',
      'The scanned receipt has not been saved yet.',
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: discardCapture },
      ]
    );
  };

  const goBack = () => {
    if (view === 'preview' && captureUri) {
      confirmDiscardCapture();
      return;
    }
    if (view === 'detail' || view === 'saved') {
      setSelectedId(null);
      setSavedReceipt(null);
      setView('main');
      return;
    }
    router.back();
  };

  const confirmDelete = (receipt: Receipt) => {
    Alert.alert(
      'Delete receipt?',
      'This digital copy will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteReceipt(receipt.id);
            setSelectedId(null);
            setView('main');
          },
        },
      ]
    );
  };

  const headerTitle =
    view === 'detail'
      ? 'Receipt'
      : view === 'saved'
        ? 'Receipt Saved'
        : 'Add Receipt';

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
        <View className="flex-row items-center px-4 pb-2 pt-1">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={goBack}
            className="h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10"
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View className="ml-3 flex-1">
            <Text className="text-[19px] font-extrabold text-white">
              {headerTitle}
            </Text>
            {view === 'main' && (
              <Text className="text-[12px] text-white/65" numberOfLines={1}>
                Save a digital copy of your bill for later.
              </Text>
            )}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          className="px-4"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* MAIN — scan CTA + saved list */}
          {view === 'main' && (
            <View>
              <GlassShell radius={22} blurTarget={backgroundRef}>
                <View className="items-center p-5">
                  <View
                    className="h-16 w-16 items-center justify-center rounded-full border border-white/25"
                    style={{
                      backgroundColor: 'rgba(52,211,153,0.16)',
                      shadowColor: GREEN,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.55,
                      shadowRadius: 14,
                      elevation: 7,
                    }}
                  >
                    <Ionicons name="scan" size={30} color="#FFFFFF" />
                  </View>
                  <Text className="mt-3 text-center text-[16px] font-extrabold text-white">
                    Scan a physical bill
                  </Text>
                  <Text className="mt-1 px-2 text-center text-[13px] text-white/65">
                    Keep a digital copy inside the app — split it now or
                    whenever you are ready.
                  </Text>
                  <View className="mt-4 w-full">
                    <EmeraldCTA
                      label={camBusy ? 'Opening camera…' : 'Scan Receipt'}
                      loading={camBusy}
                      disabled={camBusy}
                      onPress={scanBill}
                    />
                  </View>
                  {camError && (
                    <Text className="mt-2 text-center text-[12px] text-white/70">
                      {camError}
                    </Text>
                  )}
                </View>
              </GlassShell>

              <Text className="mb-2.5 mt-5 text-[17px] font-extrabold text-white">
                Saved Receipts
              </Text>
              {receipts.length === 0 && (
                <GlassShell radius={22} blurTarget={backgroundRef}>
                  <View className="items-center p-5">
                    <Text className="text-[14px] font-bold text-white">
                      No receipts yet
                    </Text>
                    <Text className="mt-1 text-center text-[13px] text-white/65">
                      Scanned bills saved for later will appear here.
                    </Text>
                  </View>
                </GlassShell>
              )}
              {receipts.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedId(r.id);
                    setView('detail');
                  }}
                  className="mb-2.5"
                >
                  <GlassShell radius={22} blurTarget={backgroundRef}>
                    <View className="flex-row items-center p-3">
                      <Image
                        source={{ uri: r.imageUri }}
                        resizeMode="cover"
                        style={{ width: 56, height: 56, borderRadius: 12 }}
                      />
                      <View className="ml-3 min-w-0 flex-1">
                        <Text
                          className="text-[15px] font-bold text-white"
                          numberOfLines={1}
                        >
                          Receipt
                        </Text>
                        <Text className="mt-0.5 text-[12px] text-white/60">
                          {receiptDateLabel(r.createdAt)}
                        </Text>
                      </View>
                      <StatusPill receipt={r} />
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="rgba(255,255,255,0.5)"
                        style={{ marginLeft: 6 }}
                      />
                    </View>
                  </GlassShell>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* PREVIEW — unsaved capture */}
          {view === 'preview' && captureUri && (
            <View>
              <GlassShell radius={22} blurTarget={backgroundRef}>
                <View className="p-4">
                  <View className="flex-row items-center">
                    <Image
                      source={{ uri: captureUri }}
                      resizeMode="cover"
                      style={{ width: 96, height: 96, borderRadius: 14 }}
                    />
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center">
                        <Ionicons
                          name="checkmark-circle"
                          size={17}
                          color={GREEN}
                        />
                        <Text className="ml-1.5 text-[14px] font-bold text-white">
                          Receipt captured
                        </Text>
                      </View>
                      <Text className="mt-1 text-[12px] text-white/65">
                        This receipt is preview only until you save it.
                      </Text>
                    </View>
                  </View>
                  <View className="mt-3 flex-row gap-2">
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={scanBill}
                      className="flex-1 items-center rounded-xl border border-white/20 bg-white/10 py-2.5"
                    >
                      <Text className="text-[13px] font-bold text-white">
                        Retake
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={discardCapture}
                      className="flex-1 flex-row items-center justify-center rounded-xl border border-white/20 bg-white/10 py-2.5"
                    >
                      <Ionicons name="trash" size={15} color={CORAL} />
                      <Text className="ml-1.5 text-[13px] font-bold text-white">
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassShell>

              <View className="mt-4">
                <EmeraldCTA
                  label="Split / Add Expense Now"
                  onPress={splitNow}
                />
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={saveForLater}
                  className="mt-2.5 items-center rounded-2xl border border-white/20 bg-white/10 py-3.5"
                >
                  <Text className="text-[15px] font-bold text-white">
                    Save for Later
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* SAVED — success */}
          {view === 'saved' && savedReceipt && (
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
                Receipt Saved
              </Text>
              <Text className="mt-1.5 px-6 text-center text-[14px] text-white/75">
                Your digital copy is safely stored. You can split it whenever
                you are ready.
              </Text>
              <View className="mt-5 w-full">
                <EmeraldCTA
                  label="View Receipt"
                  onPress={() => {
                    setSelectedId(savedReceipt.id);
                    setView('detail');
                  }}
                />
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.back()}
                  className="mt-2.5 items-center rounded-2xl border border-white/20 bg-white/10 py-3.5"
                >
                  <Text className="text-[15px] font-bold text-white">Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* DETAIL — saved receipt */}
          {view === 'detail' && selected && (
            <View>
              <GlassShell radius={22} blurTarget={backgroundRef}>
                <View className="p-4">
                  <Image
                    source={{ uri: selected.imageUri }}
                    resizeMode="cover"
                    style={{ width: '100%', height: 320, borderRadius: 14 }}
                  />
                  <View className="mt-3 flex-row items-center justify-between">
                    <Text className="text-[13px] text-white/65">
                      Saved: {receiptDateLabel(selected.createdAt)}
                    </Text>
                    <StatusPill receipt={selected} />
                  </View>
                  {selected.status === 'linked' && (
                    <Text className="mt-1.5 text-[13px] text-white/75">
                      Added to expense
                      {linkedExpenseName ? `: ${linkedExpenseName}` : ''}
                      {selected.amountPaise != null
                        ? ` • ₹${(selected.amountPaise / 100).toLocaleString('en-IN')}`
                        : ''}
                    </Text>
                  )}
                </View>
              </GlassShell>

              {selected.status === 'saved' ? (
                <View className="mt-4">
                  <EmeraldCTA
                    label="Split / Add Expense"
                    onPress={() =>
                      router.push(`/add-expense?receiptId=${selected.id}` as any)
                    }
                  />
                </View>
              ) : (
                <View
                  className="mt-4 items-center rounded-2xl border border-white/15 bg-white/10 py-3"
                >
                  <Text className="text-[13px] font-semibold text-white/70">
                    Already added to an expense
                  </Text>
                </View>
              )}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => confirmDelete(selected)}
                className="mt-2.5 flex-row items-center justify-center rounded-2xl border border-white/15 py-3"
                style={{ backgroundColor: 'rgba(251,113,133,0.10)' }}
              >
                <Ionicons name="trash" size={16} color={CORAL} />
                <Text className="ml-1.5 text-[14px] font-bold" style={{ color: CORAL }}>
                  Delete Receipt
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
