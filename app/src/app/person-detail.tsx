import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  fetchPersonDetail,
  fetchPersonHistory,
  formatINR,
  type PersonDetail,
  type Settlement,
} from "../services/settlements.api";
import { resolvePhotoUrl } from "../services/profile.api";

const AVATAR_PLACEHOLDER = require("../../assets/images/jodtod/people.png");
const HISTORY_PAGE_SIZE = 20;

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`overflow-hidden rounded-[28px] border border-white/40 bg-white/20 ${className}`}
    >
      <BlurView intensity={20} tint="light" className="absolute inset-0" style={{ borderRadius: 28 }} />

      <View>{children}</View>
    </View>
  );
}

function formatWhen(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PersonDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;

  const [detail, setDetail] = useState<PersonDetail | null>(null);
  const [history, setHistory] = useState<Settlement[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  const loadHistoryPage = useCallback(
    async (personId: string, offset: number): Promise<boolean> => {
      if (offset === 0) {
        // First page loads together with the detail (see load()).
        return true;
      }
      setHistoryLoadingMore(true);
      try {
        const page = await fetchPersonHistory(personId, HISTORY_PAGE_SIZE, offset);
        if (!mountedRef.current) return false;
        setHistory((prev) => [...prev, ...page.settlements]);
        setHistoryTotal(page.total);
        return true;
      } catch {
        return false;
      } finally {
        if (mountedRef.current) setHistoryLoadingMore(false);
      }
    },
    [],
  );

  const load = useCallback(async () => {
    if (!userId) {
      setError("Person not found.");
      setLoading(false);
      return;
    }
    const requestId = (requestRef.current += 1);
    setLoading(true);
    setError(null);
    try {
      // Summary + first history page in parallel (independent).
      const [person, firstPage] = await Promise.all([
        fetchPersonDetail(userId),
        fetchPersonHistory(userId, HISTORY_PAGE_SIZE, 0),
      ]);
      if (!mountedRef.current || requestRef.current !== requestId) return;
      if (!person) {
        setError("Person not found.");
        setDetail(null);
        return;
      }
      setDetail(person);
      setHistory(firstPage.settlements);
      setHistoryTotal(firstPage.total);
    } catch (err) {
      if (!mountedRef.current || requestRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : "Could not load person.");
      setDetail(null);
    } finally {
      if (mountedRef.current && requestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      void load();
      return () => {
        mountedRef.current = false;
      };
    }, [load]),
  );

  const openGroupInSettle = useCallback(
    (groupId: string) => {
      // Person -> group drill reuses the Settle tab's settlement
      // overview (the settlement-oriented detail UI) via deep link.
      router.push({ pathname: "/(tabs)/settle", params: { groupId } } as any);
    },
    [router],
  );

  const avatarUri = detail?.profile_photo
    ? (resolvePhotoUrl(detail.profile_photo) ?? detail.profile_photo)
    : null;

  const renderBalanceCell = (label: string, value: string, color: string) => (
    <View className="flex-1 items-center py-4">
      <Text className="text-[11px] font-medium text-[#4B5A66]">{label}</Text>
      <Text className="mt-1 text-[17px] font-extrabold" style={{ color }}>
        {formatINR(value)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F2F7F9]">
      <View className="flex-row items-center px-5 pb-3 pt-2">
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/40"
        >
          <Ionicons name="chevron-back" size={19} color="#0B3D62" />
        </TouchableOpacity>

        <Text className="ml-3 text-[19px] font-extrabold text-[#0B3D62]">
          Person Detail
        </Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#0B3D62" />
            <Text className="mt-3 text-[13px] text-[#5B7C93]">Loading…</Text>
          </View>
        ) : error || !detail ? (
          <GlassCard className="mt-2">
            <View className="items-center px-6 py-10">
              <Ionicons name="person-outline" size={40} color="#F04F38" />
              <Text className="mt-3 text-center text-[15px] font-bold text-[#0B3D62]">
                {error ?? "Person not found."}
              </Text>
              <TouchableOpacity
                onPress={() => void load()}
                activeOpacity={0.7}
                className="mt-4 rounded-full bg-[#0B3D62] px-5 py-2.5"
              >
                <Text className="text-[13px] font-bold text-white">Retry</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        ) : (
          <>
            {/* Identity */}
            <View className="mt-1 items-center">
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  className="h-20 w-20 rounded-full"
                />
              ) : (
                <Image
                  source={AVATAR_PLACEHOLDER}
                  className="h-20 w-20 rounded-full"
                  resizeMode="cover"
                />
              )}

              <Text className="mt-3 text-[20px] font-extrabold text-[#0B3D62]">
                {detail.display_name}
              </Text>

              <Text className="mt-1 text-[12px] text-[#4B5A66]">
                {detail.groups.length === 1
                  ? "1 trip together"
                  : `${detail.groups.length} trips together`}
              </Text>
            </View>

            {/* Balance summary */}
            <GlassCard className="mt-5">
              <View className="flex-row px-2">
                {renderBalanceCell("You Owe", detail.you_owe, "#F04F38")}
                <View className="my-4 w-px bg-white/50" />
                {renderBalanceCell("They Owe You", detail.they_owe, "#149C73")}
              </View>

              <View className="mx-4 h-px bg-white/40" />

              <View className="items-center px-4 py-4">
                <Text className="text-[11px] font-medium text-[#4B5A66]">
                  Net Balance
                </Text>
                <Text
                  className="mt-1 text-[19px] font-extrabold"
                  style={{
                    color:
                      detail.direction === "YOU_OWE"
                        ? "#F04F38"
                        : detail.direction === "THEY_OWE"
                          ? "#149C73"
                          : "#0B3D62",
                  }}
                >
                  {detail.direction === "SETTLED"
                    ? "Settled up"
                    : detail.direction === "YOU_OWE"
                      ? `You owe ${formatINR(detail.you_owe)}`
                      : `Owes you ${formatINR(detail.they_owe)}`}
                </Text>
              </View>
            </GlassCard>

            {/* Active common groups */}
            <Text className="mb-2 mt-6 text-[14px] font-bold text-[#0B3D62]">
              Active Groups
            </Text>

            {detail.groups.length === 0 ? (
              <GlassCard>
                <View className="items-center px-6 py-8">
                  <Ionicons name="checkmark-circle-outline" size={36} color="#149C73" />
                  <Text className="mt-2 text-center text-[14px] font-bold text-[#0B3D62]">
                    No active balances with this person
                  </Text>
                  <Text className="mt-1 text-center text-[12px] text-[#4B5A66]">
                    Settled groups live in history below.
                  </Text>
                </View>
              </GlassCard>
            ) : (
              <GlassCard>
                {detail.groups.map((group, index) => {
                  const owe = group.direction === "YOU_OWE";
                  return (
                    <View key={group.group_id}>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => openGroupInSettle(group.group_id)}
                        className="flex-row items-center px-4 py-3.5"
                      >
                        <View className="h-11 w-11 items-center justify-center rounded-full bg-white/50">
                          <Ionicons
                            name={group.group_type === "trip" ? "airplane-outline" : "people-outline"}
                            size={20}
                            color="#0B3D62"
                          />
                        </View>

                        <View className="ml-3 flex-1">
                          <Text className="text-[15px] font-semibold text-[#0B3D62]">
                            {group.name}
                          </Text>
                          <Text className="mt-0.5 text-[12px] text-[#4B5A66]">
                            {owe ? "You owe" : "Owes you"}
                          </Text>
                        </View>

                        <Text
                          className="text-[14px] font-extrabold"
                          style={{ color: owe ? "#F04F38" : "#149C73" }}
                        >
                          {owe ? formatINR(group.you_owe) : formatINR(group.they_owe)}
                        </Text>

                        <Ionicons name="chevron-forward" size={18} color="#2A5A82" />
                      </TouchableOpacity>

                      {index < detail.groups.length - 1 ? (
                        <View className="mx-4 h-px bg-white/40" />
                      ) : null}
                    </View>
                  );
                })}
              </GlassCard>
            )}

            {/* Settlement history */}
            <Text className="mb-2 mt-6 text-[14px] font-bold text-[#0B3D62]">
              Settlement History
            </Text>

            {history.length === 0 ? (
              <GlassCard>
                <View className="items-center px-6 py-8">
                  <Ionicons name="receipt-outline" size={34} color="#8DA0B1" />
                  <Text className="mt-2 text-center text-[14px] font-bold text-[#0B3D62]">
                    No settlement history
                  </Text>
                  <Text className="mt-1 text-center text-[12px] text-[#4B5A66]">
                    Confirmed payments with {detail.display_name} will appear here.
                  </Text>
                </View>
              </GlassCard>
            ) : (
              <GlassCard>
                {history.map((item, index) => {
                  const iPaid = item.payer_user_id !== detail.user_id;
                  return (
                    <View key={item.id}>
                      <View className="px-4 py-3.5">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-[13px] font-semibold text-[#0B3D62]">
                            {iPaid
                              ? `You → ${detail.display_name}`
                              : `${detail.display_name} → You`}
                          </Text>
                          <Text className="text-[14px] font-extrabold text-[#0B3D62]">
                            {formatINR(item.amount)}
                          </Text>
                        </View>

                        <View className="mt-1 flex-row items-center justify-between">
                          <Text className="text-[12px] text-[#4B5A66]">
                            {item.group_name} · Marked as paid
                          </Text>
                          <Text className="text-[11px] text-[#8DA0B1]">
                            {formatWhen(item.confirmed_at ?? item.created_at)}
                          </Text>
                        </View>

                        {item.note ? (
                          <Text className="mt-1 text-[12px] italic text-[#4B5A66]">
                            “{item.note}”
                          </Text>
                        ) : null}
                      </View>

                      {index < history.length - 1 ? (
                        <View className="mx-4 h-px bg-white/40" />
                      ) : null}
                    </View>
                  );
                })}

                {history.length < historyTotal ? (
                  <View className="px-4 pb-4">
                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={historyLoadingMore}
                      onPress={() => {
                        if (userId) void loadHistoryPage(userId, history.length);
                      }}
                      className="items-center rounded-full border-2 border-[#149C73] py-2.5"
                    >
                      {historyLoadingMore ? (
                        <ActivityIndicator size="small" color="#149C73" />
                      ) : (
                        <Text className="text-[13px] font-bold text-[#149C73]">
                          Load more ({historyTotal - history.length} remaining)
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null}
              </GlassCard>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
