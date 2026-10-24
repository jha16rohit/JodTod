/**
 * Help & Support (Page 10).
 *
 * Rounded search filters the support options locally (no remote
 * request per keystroke) and surfaces matching FAQ entries, which
 * open the FAQ List pre-filtered. Every row navigates to a real
 * implemented screen � no dead links, no crashes on missing routes.
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
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  fetchFaqs,
  getCachedFaqs,
  matchesFaq,
  saveCachedFaqs,
  type Faq,
} from "../services/support.api";

interface SupportOption {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  title: string;
  description: string;
  route: string;
}

const SUPPORT_OPTIONS: SupportOption[] = [
  {
    key: "faqs",
    icon: "help-circle-outline",
    iconBg: "bg-[#00B894]/15",
    title: "FAQs",
    description: "Find answers to common questions",
    route: "/faqs",
  },
  {
    key: "contact",
    icon: "mail-outline",
    iconBg: "bg-[#0B3D62]/10",
    title: "Contact Support",
    description: "Get in touch with our team",
    route: "/contact-support",
  },
  {
    key: "bug",
    icon: "bug-outline",
    iconBg: "bg-red-500/10",
    title: "Report a Bug",
    description: "Help us improve",
    route: "/report-bug",
  },
  {
    key: "feature",
    icon: "bulb-outline",
    iconBg: "bg-amber-500/15",
    title: "Feature Request",
    description: "Suggest a new feature",
    route: "/feature-request",
  },
  {
    key: "howto",
    icon: "book-outline",
    iconBg: "bg-violet-500/10",
    title: "How to Use JodTod",
    description: "Step-by-step guides",
    route: "/how-to-use",
  },
];

function matchesOption(option: SupportOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    option.title.toLowerCase().includes(q) ||
    option.description.toLowerCase().includes(q)
  );
}

export default function HelpSupport() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load FAQ content once for search hits (cached first, then sync).
  // Failures are silent here � search simply covers the options.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = await getCachedFaqs();
        if (!cancelled && cached) {
          setFaqs(cached);
          return;
        }
      } catch {
        // Cache is best-effort.
      }
      if (mountedRef.current) setFaqsLoading(true);
      try {
        const fresh = await fetchFaqs();
        if (!cancelled) {
          setFaqs(fresh);
          void saveCachedFaqs(fresh);
        }
      } catch {
        // Offline: options search still works.
      } finally {
        if (!cancelled && mountedRef.current) setFaqsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleOptions = useMemo(
    () => SUPPORT_OPTIONS.filter((o) => matchesOption(o, query)),
    [query],
  );

  const faqHits = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return faqs.filter((f) => matchesFaq(f, q)).slice(0, 5);
  }, [faqs, query]);

  const searching = query.trim().length > 0;

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
            accessibilityLabel="Back"
            className="h-11 w-11 items-center justify-center rounded-full bg-white/30"
          >
            <Ionicons name="arrow-back-outline" size={24} color="#0B3D62" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-[22px] font-extrabold text-[#0B3D62]">
            Help & Support
          </Text>
          <View className="h-11 w-11" />
        </View>

        {/* Search */}
        <View className="flex-row items-center rounded-[16px] border border-white/50 bg-white/45 px-4 py-3">
          <Ionicons name="search-outline" size={19} color="#4B5A66" />
          <TextInput
            className="ml-2 flex-1 text-[15px] text-[#14212B]"
            placeholder="Search for help..."
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

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="pb-8"
        >
          {/* Support options */}
          <View className="mt-4 overflow-hidden rounded-[26px] border border-white/50 bg-white/35">
            {visibleOptions.length === 0 && faqHits.length === 0 ? (
              <View className="items-center px-5 py-8">
                <Text className="text-[15px] font-bold text-[#0B3D62]">
                  No results found
                </Text>
                <Text className="mt-1 text-[13px] text-[#4B5A66]">
                  Try a different search.
                </Text>
              </View>
            ) : (
              visibleOptions.map((option, index) => (
                <View key={option.key}>
                  {index > 0 ? <View className="mx-5 h-px bg-white/50" /> : null}
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => router.push(option.route as any)}
                    accessibilityRole="button"
                    accessibilityLabel={option.title}
                    className="flex-row items-center px-5 py-4"
                  >
                    <View
                      className={`h-11 w-11 items-center justify-center rounded-full ${option.iconBg}`}
                    >
                      <Ionicons
                        name={option.icon}
                        size={21}
                        color="#0B3D62"
                      />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-[15px] font-bold text-[#0B3D62]">
                        {option.title}
                      </Text>
                      <Text className="mt-0.5 text-[12px] text-[#4B5A66]">
                        {option.description}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={19}
                      color="#2A5A82"
                    />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* FAQ search hits */}
          {searching && faqHits.length > 0 ? (
            <View className="mt-4 overflow-hidden rounded-[26px] border border-white/50 bg-white/35">
              <Text className="px-5 pb-1 pt-4 text-[13px] font-bold uppercase tracking-wide text-[#4B5A66]">
                Matching FAQs
              </Text>
              {faqHits.map((faq, index) => (
                <View key={faq.id}>
                  {index > 0 ? <View className="mx-5 h-px bg-white/50" /> : null}
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() =>
                      router.push({
                        pathname: "/faqs",
                        params: { q: query.trim() },
                      })
                    }
                    className="flex-row items-center px-5 py-3.5"
                  >
                    <Text
                      className="flex-1 text-[14px] font-medium text-[#14212B]"
                      numberOfLines={2}
                    >
                      {faq.question}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#2A5A82"
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          {faqsLoading && searching ? (
            <View className="mt-3 flex-row items-center justify-center">
              <ActivityIndicator size="small" color="#0B3D62" />
              <Text className="ml-2 text-[12px] text-[#4B5A66]">
                Searching help...
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

