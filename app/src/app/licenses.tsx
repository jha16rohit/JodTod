/**
 * Open Source Licenses — real attribution from installed dependencies.
 *
 * Entries below were read from the installed node_modules package
 * metadata (name, version, license id) at implementation time. When
 * dependencies change, update this list from package metadata again —
 * never fabricate entries.
 */

import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface LicenseEntry {
  name: string;
  version: string;
  license: string;
}

const LICENSES: LicenseEntry[] = [
  { name: "expo", version: "57.0.25", license: "MIT" },
  { name: "expo-router", version: "57.0.23", license: "MIT" },
  { name: "expo-constants", version: "57.0.19", license: "MIT" },
  { name: "expo-secure-store", version: "57.0.4", license: "MIT" },
  { name: "expo-image-picker", version: "57.0.20", license: "MIT" },
  { name: "expo-blur", version: "57.0.3", license: "MIT" },
  { name: "expo-linking", version: "57.0.11", license: "MIT" },
  { name: "expo-splash-screen", version: "57.0.9", license: "MIT" },
  { name: "expo-status-bar", version: "57.0.1", license: "MIT" },
  { name: "react", version: "19.2.3", license: "MIT" },
  { name: "react-native", version: "0.86.3", license: "MIT" },
  { name: "react-native-safe-area-context", version: "5.7.0", license: "MIT" },
  { name: "@react-native-async-storage/async-storage", version: "2.2.0", license: "MIT" },
  { name: "@react-native-community/netinfo", version: "12.0.1", license: "MIT" },
  { name: "nativewind", version: "4.2.6", license: "MIT" },
  { name: "tailwindcss", version: "3.4.19", license: "MIT" },
];

export default function OpenSourceLicenses() {
  const router = useRouter();

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
            accessibilityLabel="Back to About JodTod"
            className="h-11 w-11 items-center justify-center rounded-full bg-white/30"
          >
            <Ionicons name="arrow-back-outline" size={24} color="#0B3D62" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-[22px] font-extrabold text-[#0B3D62]">
            Licenses
          </Text>
          <View className="h-11 w-11" />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-8"
        >
          <View className="overflow-hidden rounded-[26px] border border-white/50 bg-white/35">
            {LICENSES.map((entry, index) => (
              <View key={entry.name}>
                {index > 0 ? <View className="mx-5 h-px bg-white/50" /> : null}
                <View className="px-5 py-3.5">
                  <Text className="text-[15px] font-bold text-[#0B3D62]">
                    {entry.name}
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-[#4B5A66]">
                    Version {entry.version} — {entry.license} License
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <Text className="mt-4 text-center text-[12px] leading-5 text-[#6B7280]">
            Full license texts ship with each package. JodTod itself is a
            private application.
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
