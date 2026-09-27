/**
 * Preferences (Page 04) — central settings for the authenticated user.
 *
 * Static preferences (currency, date format, start of week, language)
 * persist to the backend (GET/PATCH /api/users/me/preferences) with an
 * AsyncStorage cache for instant open + offline safety; the database
 * stays the source of truth (cache is only written after a successful
 * server round-trip, failed updates revert the UI).
 *
 * Notification rows show real dynamic counts
 * (GET /api/users/me/notifications/counts). Group Invitations opens the
 * existing invitation-acceptance surface (/(tabs)/groups/join).
 */

import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  DATE_FORMATS,
  DEFAULT_COUNTS,
  WEEK_STARTS,
  currencyMeta,
  fetchNotificationCounts,
  fetchPreferences,
  getCachedPreferences,
  saveCachedPreferences,
  updatePreferences,
  type DateFormat,
  type NotificationCounts,
  type Preferences,
  type UpdatePreferencesInput,
  type WeekStart,
} from "../services/preferences.api";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="mt-4 overflow-hidden rounded-[26px] border border-white/50 bg-white/35">
      <View className="px-5 py-5">{children}</View>
    </View>
  );
}

function CardTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View>
      <Text className="text-[16px] font-bold text-[#0B3D62]">{title}</Text>
      <Text className="mt-1 text-[12px] text-[#4B5A66]">{subtitle}</Text>
    </View>
  );
}

function CountRow({
  icon,
  title,
  subtitle,
  count,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  count: number;
  onPress?: () => void;
}) {
  const inner = (
    <View className="flex-row items-center justify-between">
      <View className="flex-1 flex-row items-center pr-4">
        <View className="h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/30">
          <Ionicons name={icon} size={20} color="#0B3D62" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-bold text-[#0B3D62]">{title}</Text>
          <Text className="mt-0.5 text-[12px] text-[#4B5A66]">{subtitle}</Text>
        </View>
      </View>
      <View className="flex-row items-center">
        <View className="min-w-[44px] items-center rounded-full border border-white/50 bg-white/45 px-4 py-2">
          <Text className="text-[15px] font-bold text-[#14212B]">{count}</Text>
        </View>
        {onPress ? (
          <Ionicons
            name="chevron-forward"
            size={19}
            color="#2A5A82"
            style={{ marginLeft: 6 }}
          />
        ) : null}
      </View>
    </View>
  );
  if (!onPress) {
    return <View>{inner}</View>;
  }
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress}>
      {inner}
    </TouchableOpacity>
  );
}

export default function Preferences() {
  const router = useRouter();

  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [counts, setCounts] = useState<NotificationCounts>({ ...DEFAULT_COUNTS });
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const prefsRef = useRef<Preferences | null>(null);
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);
  // Save serialization (no duplicate in-flight PATCHes) + staleness
  // guards. savingRef is checked AND set synchronously so a second tap
  // before the next render can never double-submit; pendingRef chains
  // the latest intent so rapid taps resolve last-tap-wins with one
  // request at a time. saveGenRef lets loads tell fresh saves apart
  // from the state they started from.
  const savingRef = useRef<string | null>(null);
  const pendingRef = useRef<{
    field: keyof UpdatePreferencesInput;
    input: UpdatePreferencesInput;
  } | null>(null);
  const saveGenRef = useRef(0);

  const loadAll = useCallback(async () => {
    const saveGenAtStart = saveGenRef.current;
    // Cache first: instant, crash-safe render even offline.
    try {
      const cached = await getCachedPreferences();
      if (mountedRef.current && cached) {
        setPrefs(cached);
        setLoading(false);
      }
    } catch {
      // Cache is best-effort.
    }
    if (mountedRef.current) {
      setError(null);
    }
    try {
      const [fresh, freshCounts] = await Promise.all([
        fetchPreferences(),
        fetchNotificationCounts(),
      ]);
      if (!mountedRef.current) return;
      setCounts(freshCounts);
      // A save that started after this load began owns the prefs UI
      // now: never clobber optimistic/saved state (or the cache) with
      // this older server snapshot.
      if (saveGenRef.current !== saveGenAtStart) return;
      setPrefs(fresh);
      void saveCachedPreferences(fresh);
    } catch (e) {
      if (!mountedRef.current) return;
      // Keep cached prefs visible; surface a recoverable error.
      setError(e instanceof Error ? e.message : "Could not load preferences.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // SINGLE loading trigger: useFocusEffect.
  //
  // useFocusEffect already runs on the first focus, so the previous
  // paired useEffect duplicated the initial load (2x preferences +
  // 2x notification counts on open). One trigger only:
  //   opened   -> one load
  // revisited -> one load (e.g. back from Currency Selection, so a
  //               saved value is immediately visible)
  useFocusEffect(
    useCallback(() => {
      void loadAll();
    }, [loadAll]),
  );

  const saveField = useCallback(
    async (field: keyof UpdatePreferencesInput, input: UpdatePreferencesInput) => {
      const previous = prefsRef.current;
      if (!previous) return;
      if (savingRef.current) {
        // A save is already in flight: queue the latest intent instead
        // of firing a duplicate PATCH. It runs when the current save
        // settles, so rapid taps resolve last-tap-wins.
        pendingRef.current = { field, input };
        return;
      }
      savingRef.current = field;
      saveGenRef.current += 1;
      if (mountedRef.current) {
        setSavingField(field);
        setError(null);
        // Optimistic UI; reverted below if the backend rejects.
        setPrefs({ ...previous, ...input });
      }
      try {
        const saved = await updatePreferences(input);
        if (!mountedRef.current) return;
        setPrefs(saved);
        void saveCachedPreferences(saved);
      } catch (e) {
        if (!mountedRef.current) return;
        // Revert: never leave the UI showing a rejected value.
        setPrefs(previous);
        setError(
          e instanceof Error ? e.message : "Could not save preferences.",
        );
      } finally {
        const next = pendingRef.current;
        pendingRef.current = null;
        savingRef.current = null;
        if (mountedRef.current) setSavingField(null);
        // Drain one queued intent (it re-arms the flags above).
        if (next && mountedRef.current) {
          void saveField(next.field, next.input);
        }
      }
    },
    [],
  );

  const setDateFormat = useCallback(
    (format: DateFormat) => {
      if (prefsRef.current?.date_format !== format) {
        void saveField("date_format", { date_format: format });
      }
    },
    [saveField],
  );

  const setWeekStart = useCallback(
    (value: WeekStart) => {
      if (prefsRef.current?.start_of_week !== value) {
        void saveField("start_of_week", { start_of_week: value });
      }
    },
    [saveField],
  );

  const meta = currencyMeta(prefs?.currency);
  const busy = savingField !== null;

  return (
    <View className="flex-1">
      {/* Background */}
      <Image
        source={require("../../assets/images/jodtod/background_home.png")}
        resizeMode="cover"
        className="absolute inset-0 h-full w-full"
      />

      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-transparent">
        <View className="flex-1 px-5">
          {/* Header */}
          <View className="flex-row items-center justify-between py-3">
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Back"
              className="h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/30"
            >
              <Ionicons name="arrow-back-outline" size={23} color="#0B3D62" />
            </TouchableOpacity>
            <Text className="text-[22px] font-extrabold text-[#0B3D62]">
              Preferences
            </Text>
            <View className="h-11 w-11" />
          </View>

          {loading && !prefs ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#0B3D62" />
              <Text className="mt-3 text-[13px] font-medium text-[#4B5A66]">
                Loading preferences...
              </Text>
            </View>
          ) : error && !prefs ? (
            <View className="items-center rounded-2xl border border-red-300/60 bg-white/60 px-4 py-5">
              <Text className="text-center text-[13px] font-medium text-red-600">
                {error}
              </Text>
              <TouchableOpacity
                onPress={() => void loadAll()}
                activeOpacity={0.7}
                className="mt-3 rounded-full bg-[#0B3D62] px-4 py-2"
              >
                <Text className="text-[13px] font-bold text-white">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerClassName="pb-10"
            >
              {error ? (
                <View className="mt-4 rounded-2xl border border-red-300/60 bg-white/60 px-4 py-3">
                  <Text className="text-[13px] font-medium text-red-600">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Currency -> Currency Selection */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/currency-selection")}
                className="mt-5 overflow-hidden rounded-[26px] border border-white/50 bg-white/35"
              >
                <View className="flex-row items-center justify-between px-5 py-5">
                  <View className="flex-1 pr-4">
                    <Text className="text-[16px] font-bold text-[#0B3D62]">
                      Currency
                    </Text>
                    <Text className="mt-1 text-[12px] text-[#4B5A66]">
                      Choose your default currency
                    </Text>
                  </View>
                  <View className="flex-row items-center rounded-full border border-white/50 bg-white/45 px-4 py-2">
                    <Text className="text-[15px] font-bold text-[#14212B]">
                      {meta.code} ({meta.symbol})
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color="#2A5A82"
                      style={{ marginLeft: 4 }}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Date Format */}
              <Card>
                <CardTitle
                  title="Date Format"
                  subtitle="How dates appear across the app"
                />
                <View className="mt-4 flex-row gap-2">
                  {DATE_FORMATS.map((format) => {
                    const active = prefs?.date_format === format;
                    return (
                      <TouchableOpacity
                        key={format}
                        activeOpacity={0.8}
                        disabled={busy}
                        onPress={() => setDateFormat(format)}
                        className={`flex-1 items-center justify-center rounded-[14px] border py-3 ${
                          active
                            ? "border-[#00B894] bg-[#00B894]/20"
                            : "border-white/50 bg-white/30"
                        }`}
                      >
                        <Text
                          className={`text-[12px] font-semibold ${
                            active ? "text-[#00896B]" : "text-[#4B5A66]"
                          }`}
                        >
                          {format}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Card>

              {/* Start of Week */}
              <Card>
                <CardTitle
                  title="Start of Week"
                  subtitle="First day shown in week views"
                />
                <View className="mt-4 flex-row gap-3">
                  {WEEK_STARTS.map((option) => {
                    const active = prefs?.start_of_week === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        activeOpacity={0.8}
                        disabled={busy}
                        onPress={() => setWeekStart(option.value)}
                        className={`flex-1 items-center justify-center rounded-[17px] border py-3 ${
                          active
                            ? "border-[#00B894] bg-[#00B894]/20"
                            : "border-white/50 bg-white/30"
                        }`}
                      >
                        <Text
                          className={`text-[13px] font-semibold ${
                            active ? "text-[#00896B]" : "text-[#4B5A66]"
                          }`}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Card>

              {/* App Language (English only) */}
              <Card>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-[16px] font-bold text-[#0B3D62]">
                      App Language
                    </Text>
                    <Text className="mt-1 text-[12px] text-[#4B5A66]">
                      Only English is available for now
                    </Text>
                  </View>
                  <View className="rounded-full border border-white/50 bg-white/45 px-4 py-2">
                    <Text className="text-[15px] font-bold text-[#14212B]">
                      English
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Expense Updates (number only) */}
              <Card>
                <CountRow
                  icon="receipt-outline"
                  title="Expense Updates"
                  subtitle="New expense activity"
                  count={counts.expense_updates}
                />
              </Card>

              {/* Settlement Reminders (number only) */}
              <Card>
                <CountRow
                  icon="swap-horizontal-outline"
                  title="Settlement Reminders"
                  subtitle="Pending settlements"
                  count={counts.settlement_reminders}
                />
              </Card>

              {/* Group Invitations -> existing acceptance page */}
              <Card>
                <CountRow
                  icon="people-outline"
                  title="Group Invitations"
                  subtitle="Pending group invites"
                  count={counts.group_invitations}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/groups/join",
                      params: { from: "/preferences" },
                    })
                  }
                />
              </Card>

              {busy ? (
                <View className="mt-4 flex-row items-center justify-center">
                  <ActivityIndicator size="small" color="#0B3D62" />
                  <Text className="ml-2 text-[13px] text-[#4B5A66]">
                    Saving...
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
