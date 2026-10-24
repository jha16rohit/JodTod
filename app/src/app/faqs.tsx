/**
 * FAQ List (Page 11).
 *
 * Active FAQs from GET /api/support/faqs (cached in AsyncStorage for
 * instant open + offline). Local search filters question/answer/
 * category case-insensitively (no remote request per keystroke).
 * Single-expand accordion; long answers scroll naturally inside the
 * page ScrollView. Accepts an optional `q` route param (e.g. from
 * Help & Support search hits) as the initial query.
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
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  fetchFaqs,
  getCachedFaqs,
  matchesFaq,
  saveCachedFaqs,
  type Faq,
} from "../services/support.api";

export default function FaqList() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string | string[] }>();
  const initialQuery =
    typeof params.q === "string" ? params.q : Array.isArray(params.q) ? (params.q[0] ?? "") : "";

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Adopt a new incoming `q` param (e.g. returning from Help search).
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const loadFaqs = useCallback(async () => {
    try {
      const cached = await getCachedFaqs();
      if (mountedRef.current && cached) {
        setFaqs(cached);
        setLoading(false);
      }
    } catch {
      // Cache is best-effort.
    }
    if (mountedRef.current) setError(null);
    try {
      const fresh = await fetchFaqs();
      if (!mountedRef.current) return;
      setFaqs(fresh);
      void saveCachedFaqs(fresh);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Could not load FAQs.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // SINGLE loading trigger: useFocusEffect.
  //
  // useFocusEffect already runs on the first focus, so the previous
  // paired useEffect duplicated the initial fetch. One trigger only:
  //   opened   -> one load
  // revisited -> one load (picks up FAQ content changes)
  useFocusEffect(
    useCallback(() => {
      void loadFaqs();
    }, [loadFaqs]),
  );

  const visible = useMemo(
    () => faqs.filter((f) => matchesFaq(f, query)),
    [faqs, query],
  );

  const toggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-[#F5F9FC]">
      {/* Background */}
      <Image
        source={require("../../assets/images/jodtod/background_home.png")}
        resizeMode="cover"
        className="absolute inset-0 h-full w-full"
      />

      <View className="relative z-10 flex-1 p-6">
        {/* Header: back (top-left) | title | spacer */}
        <View className="mb-5 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to Help and Support"
            className="h-11 w-11 items-center justify-center rounded-full bg-white/30"
          >
            <Ionicons name="arrow-back-outline" size={24} color="#0B3D62" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-[22px] font-extrabold text-[#0B3D62]">
            FAQs
          </Text>
          <View className="h-11 w-11" />
        </View>

        {/* Search */}
        <View className="flex-row items-center rounded-[16px] border border-white/50 bg-white/45 px-4 py-3">
          <Ionicons name="search-outline" size={19} color="#4B5A66" />
          <TextInput
            className="ml-2 flex-1 text-[15px] text-[#14212B]"
            placeholder="Search FAQs..."
            placeholderTextColor="#6B7280"
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              setExpandedId(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                setQuery("");
                setExpandedId(null);
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              className="ml-2"
            >
              <Ionicons name="close-circle" size={19} color="#4B5A66" />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading && faqs.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0B3D62" />
            <Text className="mt-3 text-[13px] font-medium text-[#4B5A66]">
              Loading FAQs...
            </Text>
          </View>
        ) : error && faqs.length === 0 ? (
          <View className="mt-4 items-center rounded-2xl border border-red-300/60 bg-white/60 px-4 py-5">
            <Text className="text-center text-[13px] font-medium text-red-600">
              {error}
            </Text>
            <TouchableOpacity
              onPress={() => void loadFaqs()}
              activeOpacity={0.7}
              className="mt-3 rounded-full bg-[#0B3D62] px-4 py-2"
            >
              <Text className="text-[13px] font-bold text-white">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : visible.length === 0 ? (
          <View className="mt-4 items-center rounded-[26px] border border-white/50 bg-white/35 px-5 py-8">
            <Text className="text-[15px] font-bold text-[#0B3D62]">
              {faqs.length === 0 ? "FAQs are currently unavailable." : "No FAQs found"}
            </Text>
            <Text className="mt-1 text-[13px] text-[#4B5A66]">
              {faqs.length === 0
                ? "Please check back later."
                : "Try a different search."}
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="pb-8"
          >
            {error ? (
              <View className="mb-3 mt-4 rounded-2xl border border-red-300/60 bg-white/60 px-4 py-3">
                <Text className="text-[13px] font-medium text-red-600">
                  {error}
                </Text>
              </View>
            ) : null}
            <View className="mt-4 overflow-hidden rounded-[26px] border border-white/50 bg-white/35">
              {visible.map((faq, index) => {
                const expanded = expandedId === faq.id;
                return (
                  <View key={faq.id}>
                    {index > 0 ? (
                      <View className="mx-5 h-px bg-white/50" />
                    ) : null}
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => toggle(faq.id)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                      className="px-5 py-4"
                    >
                      <View className="flex-row items-center">
                        <Text className="flex-1 text-[15px] font-semibold text-[#14212B]">
                          {faq.question}
                        </Text>
                        <Ionicons
                          name={expanded ? "chevron-down" : "chevron-forward"}
                          size={19}
                          color="#2A5A82"
                        />
                      </View>
                      {expanded ? (
                        <View className="mt-2 pr-6">
                          <Text className="text-[11px] font-bold uppercase tracking-wide text-[#4B5A66]">
                            {faq.category}
                          </Text>
                          <Text className="mt-1 text-[14px] leading-6 text-[#4B5A66]">
                            {faq.answer}
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
