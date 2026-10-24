/**
 * Currency Selection (Page 05).
 *
 * Exactly 5 static currencies (local list, no external API). Only INR
 * is applicable/selectable; the rest are visible with a
 * "Not Applicable" indicator and cannot be selected. Search filters
 * locally by code, name, or symbol (case-insensitive).
 *
 * Flow: Preferences -> Currency Selection -> Back -> Preferences.
 * Selecting INR persists via PATCH /users/me/preferences and returns.
 */

import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CURRENCIES,
  currencyMeta,
  fetchPreferences,
  getCachedPreferences,
  saveCachedPreferences,
  updatePreferences,
  type CurrencyInfo,
} from "../services/preferences.api";

function matchesQuery(item: CurrencyInfo, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.code.toLowerCase().includes(q) ||
    item.name.toLowerCase().includes(q) ||
    item.symbol.includes(query.trim())
  );
}

export default function CurrencySelection() {
  const router = useRouter();

  const [selectedCode, setSelectedCode] = useState<string>("INR");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadSelected = useCallback(async () => {
    try {
      const cached = await getCachedPreferences();
      if (mountedRef.current && cached) {
        setSelectedCode(currencyMeta(cached.currency).code);
        setLoading(false);
      }
    } catch {
      // Cache is best-effort.
    }
    try {
      const fresh = await fetchPreferences();
      if (!mountedRef.current) return;
      setSelectedCode(currencyMeta(fresh.currency).code);
      void saveCachedPreferences(fresh);
      setError(null);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Could not load currency.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // SINGLE loading trigger: useFocusEffect.
  //
  // useFocusEffect already runs on the first focus, so the previous
  // paired useEffect duplicated the initial fetch. One trigger only:
  //   opened   -> one load
  // revisited -> one load (reflects a currency change made elsewhere)
  useFocusEffect(
    useCallback(() => {
      void loadSelected();
    }, [loadSelected]),
  );

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/preferences");
    }
  }, [router]);

  const selectINR = useCallback(async () => {
    if (saving || loading) return;
    if (selectedCode === "INR") {
      goBack();
      return;
    }
    if (mountedRef.current) {
      setSaving(true);
      setError(null);
    }
    try {
      const saved = await updatePreferences({ currency: "INR" });
      if (!mountedRef.current) return;
      setSelectedCode(currencyMeta(saved.currency).code);
      void saveCachedPreferences(saved);
      goBack();
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Could not save currency.");
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [goBack, loading, saving, selectedCode]);

  const results = useMemo(
    () => CURRENCIES.filter((item) => matchesQuery(item, query)),
    [query],
  );

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
          {/* Header: back (top-left) | title | spacer */}
          <View className="flex-row items-center justify-between py-3">
            <TouchableOpacity
              onPress={goBack}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Back to Preferences"
              className="h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/30"
            >
              <Ionicons name="arrow-back-outline" size={23} color="#0B3D62" />
            </TouchableOpacity>
            <Text className="flex-1 text-center text-[22px] font-extrabold text-[#0B3D62]">
              Select Currency
            </Text>
            <View className="h-11 w-11" />
          </View>

          {/* Search (local filter over the 5 static entries) */}
          <View className="mt-3 flex-row items-center rounded-[16px] border border-white/50 bg-white/45 px-4 py-3">
            <Ionicons name="search-outline" size={19} color="#4B5A66" />
            <TextInput
              className="ml-2 flex-1 text-[15px] text-[#14212B]"
              placeholder="Search by code, name, or symbol"
              placeholderTextColor="#6B7280"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <TouchableOpacity
                onPress={() => setQuery("")}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                className="ml-2"
              >
                <Ionicons name="close-circle" size={19} color="#4B5A66" />
              </TouchableOpacity>
            ) : null}
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#0B3D62" />
              <Text className="mt-3 text-[13px] font-medium text-[#4B5A66]">
                Loading currencies...
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerClassName="pb-10"
              keyboardShouldPersistTaps="handled"
            >
              {error ? (
                <View className="mt-4 rounded-2xl border border-red-300/60 bg-white/60 px-4 py-3">
                  <Text className="text-[13px] font-medium text-red-600">
                    {error}
                  </Text>
                </View>
              ) : null}

              {results.length === 0 ? (
                <View className="mt-6 items-center rounded-[26px] border border-white/50 bg-white/35 px-5 py-8">
                  <Ionicons
                    name="search-outline"
                    size={28}
                    color="#4B5A66"
                  />
                  <Text className="mt-3 text-[15px] font-bold text-[#0B3D62]">
                    No currencies found
                  </Text>
                  <Text className="mt-1 text-[13px] text-[#4B5A66]">
                    Try a different search.
                  </Text>
                </View>
              ) : (
                results.map((item) => {
                  const selected = selectedCode === item.code;
                  const disabled = !item.available;
                  return (
                    <TouchableOpacity
                      key={item.code}
                      activeOpacity={disabled ? 1 : 0.75}
                      disabled={disabled || saving}
                      onPress={selectINR}
                      accessibilityRole="button"
                      accessibilityLabel={
                        disabled
                          ? `${item.name}, not applicable`
                          : `${item.name}, select`
                      }
                      accessibilityState={{
                        disabled: disabled || saving,
                        selected,
                      }}
                      className={`mt-3 overflow-hidden rounded-[22px] border px-5 py-4 ${
                        selected
                          ? "border-[#00B894] bg-[#00B894]/15"
                          : "border-white/50 bg-white/35"
                      } ${disabled ? "opacity-70" : ""}`}
                    >
                      <View className="flex-row items-center">
                        <View className="h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/45">
                          <Text className="text-[19px] font-bold text-[#0B3D62]">
                            {item.symbol}
                          </Text>
                        </View>
                        <View className="ml-3 flex-1">
                          <Text className="text-[15px] font-bold text-[#0B3D62]">
                            {item.code} — {item.name}
                          </Text>
                          {disabled ? (
                            <View className="mt-1.5 self-start rounded-full bg-black/10 px-2.5 py-1">
                              <Text className="text-[11px] font-semibold text-[#4B5A66]">
                                Not Applicable
                              </Text>
                            </View>
                          ) : (
                            <Text className="mt-1 text-[12px] text-[#4B5A66]">
                              Available
                            </Text>
                          )}
                        </View>
                        {selected && !disabled ? (
                          <View className="h-7 w-7 items-center justify-center rounded-full bg-[#00B894]">
                            <Ionicons
                              name="checkmark"
                              size={17}
                              color="#FFFFFF"
                            />
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}

              {saving ? (
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
