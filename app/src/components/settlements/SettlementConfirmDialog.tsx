import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  AppState,
  type AppStateStatus,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useAuth } from "../../context/AuthContext";
import {
  confirmSettlement,
  fetchPendingConfirmations,
  formatINR,
  rejectSettlement,
  type Settlement,
} from "../../services/settlements.api";

function formatWhen(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Global receiver-confirmation gate.
 *
 * When the authenticated user opens (or foregrounds) the app with
 * PENDING incoming payment claims, the first claim surfaces as a
 * JodTod-styled confirmation dialog — one at a time, never a stack.
 * Each claim resolves exactly once (confirm or reject); resolved
 * claims never reappear because the backend no longer lists them.
 */
export default function PendingSettlementGate() {
  const { isAuthenticated } = useAuth();

  const [queue, setQueue] = useState<Settlement[]>([]);
  const [visible, setVisible] = useState(false);
  const [acting, setActing] = useState<"confirm" | "reject" | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const checkingRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());

  const check = useCallback(async () => {
    if (checkingRef.current || !mountedRef.current) return;
    checkingRef.current = true;
    try {
      const pending = await fetchPendingConfirmations(20, 0);
      if (!mountedRef.current) return;
      const fresh = pending.filter((item) => !seenRef.current.has(item.id));
      if (fresh.length > 0) {
        setQueue(fresh);
        setResult(null);
        setError(null);
        setVisible(true);
      }
    } catch {
      // Silent: the gate must never block app startup on failure.
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Check on login + on foreground (one request per trigger, deduped).
  useEffect(() => {
    if (!isAuthenticated) {
      setVisible(false);
      setQueue([]);
      seenRef.current.clear();
      return;
    }
    seenRef.current.clear();
    void check();
  }, [isAuthenticated, check]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const subscription = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        if (next === "active") void check();
      },
    );
    return () => subscription.remove();
  }, [isAuthenticated, check]);

  const current: Settlement | null = queue.length > 0 ? queue[0] : null;

  const dismiss = useCallback(() => {
    setVisible(false);
    setActing(null);
    setResult(null);
    setError(null);
  }, []);

  const advance = useCallback(() => {
    setQueue((prev) => {
      const next = prev.slice(1);
      if (next.length === 0) {
        // Queue drained: close after the result is readable.
        setTimeout(() => {
          if (mountedRef.current) dismiss();
        }, 1400);
      }
      return next;
    });
    setActing(null);
  }, [dismiss]);

  const onConfirm = useCallback(async () => {
    if (!current || acting) return;
    setActing("confirm");
    setError(null);
    try {
      const updated = await confirmSettlement(current.id);
      if (!mountedRef.current) return;
      if (updated && updated.status === "paid") {
        seenRef.current.add(current.id);
        setResult("Payment confirmed. Balances have been updated.");
        advance();
      } else {
        setError("Could not confirm. Please try again.");
        setActing(null);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Could not confirm.");
      setActing(null);
    }
  }, [current, acting, advance]);

  const onReject = useCallback(async () => {
    if (!current || acting) return;
    setActing("reject");
    setError(null);
    try {
      const updated = await rejectSettlement(current.id);
      if (!mountedRef.current) return;
      if (updated && updated.status === "rejected") {
        seenRef.current.add(current.id);
        setResult("Marked as not received. The balance is unchanged.");
        advance();
      } else {
        setError("Could not respond. Please try again.");
        setActing(null);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Could not respond.");
      setActing(null);
    }
  }, [current, acting, advance]);

  if (!visible || !current) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View className="flex-1 items-center justify-center bg-[#0B3D62]/50 px-6">
        <View className="w-full overflow-hidden rounded-[28px] border border-white/50 bg-white/95">
          <BlurView intensity={30} tint="light" className="absolute inset-0" />

          <View className="px-6 pb-6 pt-6">
            <View className="items-center">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-[#FFF3DE]">
                <Ionicons name="cash-outline" size={28} color="#E0932E" />
              </View>

              <Text className="mt-3 text-[18px] font-extrabold text-[#0B3D62]">
                Payment Confirmation
              </Text>

              {queue.length > 1 ? (
                <Text className="mt-1 text-[12px] font-medium text-[#5B7C93]">
                  1 of {queue.length} pending
                </Text>
              ) : null}
            </View>

            <View className="mt-4 rounded-2xl bg-white/70 px-4 py-3">
              <Text className="text-center text-[14px] leading-6 text-[#0B3D62]">
                <Text className="font-extrabold">{current.payer_name}</Text>
                {" marked "}
                <Text className="font-extrabold">{formatINR(current.amount)}</Text>
                {" as paid to you for "}
                <Text className="font-extrabold">{current.group_name}</Text>.
              </Text>

              <Text className="mt-2 text-center text-[13px] font-semibold text-[#0B3D62]">
                Did you receive this payment?
              </Text>

              <Text className="mt-2 text-center text-[11px] text-[#8DA0B1]">
                {formatWhen(current.initiated_at ?? current.created_at)}
                {current.note ? ` · “${current.note}”` : ""}
              </Text>
            </View>

            {result ? (
              <View className="mt-4 flex-row items-center justify-center">
                <Ionicons name="checkmark-circle" size={18} color="#149C73" />
                <Text className="ml-2 flex-1 text-[13px] font-semibold text-[#149C73]">
                  {result}
                </Text>
              </View>
            ) : (
              <>
                {error ? (
                  <Text className="mt-3 text-center text-[12px] font-medium text-[#F04F38]">
                    {error}
                  </Text>
                ) : null}

                <View className="mt-4 flex-row">
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={acting !== null}
                    onPress={() => void onReject()}
                    className="mr-2 flex-1 items-center rounded-full border-2 border-[#F04F38] py-3"
                  >
                    {acting === "reject" ? (
                      <ActivityIndicator size="small" color="#F04F38" />
                    ) : (
                      <Text className="text-[14px] font-extrabold text-[#F04F38]">
                        Not Received
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={acting !== null}
                    onPress={() => void onConfirm()}
                    className="ml-2 flex-1 items-center rounded-full bg-[#149C73] py-3.5"
                  >
                    {acting === "confirm" ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-[14px] font-extrabold text-white">
                        Yes, Received
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={acting !== null}
                  onPress={() => {
                    // Decide later: skip this claim for now without
                    // resolving it (it stays PENDING server-side).
                    if (current) seenRef.current.add(current.id);
                    advance();
                    setResult(null);
                  }}
                  className="mt-3 items-center"
                >
                  <Text className="text-[12px] font-medium text-[#5B7C93]">
                    Decide later
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
