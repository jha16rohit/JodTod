import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  fetchPeople,
  formatINR,
  type PeopleDirection,
  type PersonSummary,
} from "../services/settlements.api";
import { resolvePhotoUrl } from "../services/profile.api";

const AVATAR_PLACEHOLDER = require("../../assets/images/jodtod/people.png");

const FILTERS: { key: PeopleDirection; label: string }[] = [
  { key: "all", label: "All" },
  { key: "you_owe", label: "You Owe" },
  { key: "they_owe", label: "They Owe" },
];

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

function Avatar({ uri, size = 52 }: { uri: string | null; size?: number }) {
  if (uri) {
    return (
      <Image
        source={{ uri: resolvePhotoUrl(uri) ?? uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <Image
      source={AVATAR_PLACEHOLDER}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      resizeMode="cover"
    />
  );
}

export default function PeopleSettlements() {
  const router = useRouter();

  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [filter, setFilter] = useState<PeopleDirection>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const requestRef = useRef(0);
  const filterRef = useRef(filter);
  filterRef.current = filter;
  const searchRef = useRef(search);
  searchRef.current = search;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (direction: PeopleDirection, query: string, silent = false) => {
    const requestId = (requestRef.current += 1);
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const result = await fetchPeople(direction, query || undefined);
      if (!mountedRef.current || requestRef.current !== requestId) return;
      setPeople(result.people);
    } catch (err) {
      if (!mountedRef.current || requestRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : "Could not load people.");
      setPeople([]);
    } finally {
      if (mountedRef.current && requestRef.current === requestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Single focus-driven load (focus fires on mount too — no separate
  // mount fetch, so no double request). Filters/search reload explicitly.
  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      void load(filterRef.current, searchRef.current);
      return () => {
        mountedRef.current = false;
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, [load]),
  );

  const onFilterChange = useCallback(
    (next: PeopleDirection) => {
      setFilter(next);
      void load(next, searchRef.current);
    },
    [load],
  );

  const onSearchChange = useCallback(
    (text: string) => {
      setSearch(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (mountedRef.current) void load(filterRef.current, text);
      }, 400);
    },
    [load],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load(filterRef.current, searchRef.current, true);
  }, [load]);

  const renderRow = (person: PersonSummary) => {
    const owe = person.direction === "YOU_OWE";
    return (
      <TouchableOpacity
        key={person.user_id}
        activeOpacity={0.75}
        onPress={() =>
          router.push({
            pathname: "/person-detail",
            params: { userId: person.user_id },
          } as any)
        }
        className="flex-row items-center px-4 py-3.5"
      >
        <Avatar uri={person.profile_photo} />

        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-semibold text-[#0B3D62]">
            {person.display_name}
          </Text>

          <Text className="mt-0.5 text-[12px] text-[#4B5A66]">
            {person.common_group_count === 1
              ? "1 group together"
              : `${person.common_group_count} groups together`}
          </Text>
        </View>

        <View className="items-end">
          <Text
            className="text-[14px] font-extrabold"
            style={{ color: owe ? "#F04F38" : "#149C73" }}
          >
            {owe ? formatINR(person.you_owe) : formatINR(person.they_owe)}
          </Text>

          <Text className="mt-0.5 text-[11px] font-medium text-[#4B5A66]">
            {owe ? "You owe" : "They owe you"}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#2A5A82" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F2F7F9]">
      {/* Header */}
      <View className="flex-row items-center px-5 pb-3 pt-2">
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/40"
        >
          <Ionicons name="chevron-back" size={19} color="#0B3D62" />
        </TouchableOpacity>

        <Text className="ml-3 text-[19px] font-extrabold text-[#0B3D62]">
          People & Settlements
        </Text>
      </View>

      {/* Search */}
      <View className="px-5">
        <View className="flex-row items-center rounded-full border border-white/60 bg-white/50 px-4 py-2.5">
          <Ionicons name="search" size={17} color="#5B7C93" />

          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search people..."
            placeholderTextColor="#8DA0B1"
            autoCapitalize="none"
            autoCorrect={false}
            className="ml-2 flex-1 text-[14px] text-[#0B3D62]"
          />

          {search.length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onSearchChange("")}
            >
              <Ionicons name="close-circle" size={17} color="#8DA0B1" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filters */}
      <View className="mt-3 flex-row px-5">
        {FILTERS.map((item) => {
          const active = filter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.8}
              onPress={() => onFilterChange(item.key)}
              className={`mr-2 rounded-full px-4 py-2 ${
                active ? "bg-[#0B3D62]" : "border border-white/60 bg-white/40"
              }`}
            >
              <Text
                className={`text-[13px] ${
                  active ? "font-bold text-white" : "font-medium text-[#0B3D62]"
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <ScrollView
        className="mt-3 flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B3D62" />
        }
      >
        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#0B3D62" />
            <Text className="mt-3 text-[13px] text-[#5B7C93]">
              Loading settlements…
            </Text>
          </View>
        ) : error ? (
          <GlassCard className="mt-2">
            <View className="items-center px-6 py-10">
              <Ionicons name="cloud-offline-outline" size={40} color="#F04F38" />
              <Text className="mt-3 text-center text-[15px] font-bold text-[#0B3D62]">
                Could not load settlements
              </Text>
              <Text className="mt-1 text-center text-[13px] text-[#4B5A66]">
                {error}
              </Text>
              <TouchableOpacity
                onPress={() => void load(filterRef.current, searchRef.current)}
                activeOpacity={0.7}
                className="mt-4 rounded-full bg-[#0B3D62] px-5 py-2.5"
              >
                <Text className="text-[13px] font-bold text-white">Retry</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        ) : people.length === 0 ? (
          <GlassCard className="mt-2">
            <View className="items-center px-6 py-12">
              <Ionicons name="people-outline" size={44} color="#8DA0B1" />
              <Text className="mt-3 text-center text-[15px] font-bold text-[#0B3D62]">
                No active settlements
              </Text>
              <Text className="mt-1 text-center text-[13px] text-[#4B5A66]">
                {search.trim()
                  ? "Nobody matches that search."
                  : "Everyone is settled up. New balances from shared group expenses will appear here."}
              </Text>
            </View>
          </GlassCard>
        ) : (
          <GlassCard className="mt-2">
            {people.map((person, index) => (
              <View key={person.user_id}>
                {renderRow(person)}
                {index < people.length - 1 ? (
                  <View className="mx-4 h-px bg-white/40" />
                ) : null}
              </View>
            ))}
          </GlassCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
