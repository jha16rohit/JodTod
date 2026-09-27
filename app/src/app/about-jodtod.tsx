/**
 * About JodTod (Page 12).
 *
 * Real branding (bundled jodtod-text asset), real version from the
 * Expo app config (never undefined), approved tagline, and the
 * legal/information menu. Every row navigates to a real screen.
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
import Constants from "expo-constants";
import { useRouter } from "expo-router";

interface AboutRow {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  title: string;
  subtitle: string;
  route: string;
}

const ABOUT_ROWS: AboutRow[] = [
  {
    key: "about-app",
    icon: "information-circle-outline",
    iconBg: "bg-[#00B894]/15",
    title: "About the App",
    subtitle: "Know more about JodTod",
    route: "/about-app",
  },
  {
    key: "terms",
    icon: "document-text-outline",
    iconBg: "bg-[#0B3D62]/10",
    title: "Terms of Service",
    subtitle: "Rules for using JodTod",
    route: "/terms",
  },
  {
    key: "privacy",
    icon: "shield-checkmark-outline",
    iconBg: "bg-sky-500/10",
    title: "Privacy Policy",
    subtitle: "How your data is handled",
    route: "/privacy-policy",
  },
  {
    key: "licenses",
    icon: "library-outline",
    iconBg: "bg-amber-500/15",
    title: "Open Source Licenses",
    subtitle: "Libraries that power JodTod",
    route: "/licenses",
  },
];

function appVersion(): string {
  const configured = Constants.expoConfig?.version;
  if (typeof configured === "string" && configured.trim()) {
    return configured.trim();
  }
  return "1.0.0";
}

export default function AboutJodTod() {
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
            accessibilityLabel="Back"
            className="h-11 w-11 items-center justify-center rounded-full bg-white/30"
          >
            <Ionicons name="arrow-back-outline" size={24} color="#0B3D62" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-[22px] font-extrabold text-[#0B3D62]">
            About JodTod
          </Text>
          <View className="h-11 w-11" />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-8"
        >
          {/* Branding */}
          <View className="items-center rounded-[26px] border border-white/50 bg-white/35 px-5 py-8">
            <Image
              source={require("../../assets/images/jodtod/jodtod-text.png")}
              resizeMode="contain"
              style={{ width: 180, height: 64 }}
            />
            <Text className="mt-4 text-[28px] font-extrabold text-[#0B3D62]">
              JodTod
            </Text>
            <Text className="mt-1 text-[16px] text-[#4B5A66]">
              Version {appVersion()}
            </Text>
            <Text className="mt-3 text-center text-[14px] font-medium text-[#2A5A82]">
              जोड़-तोड़ का हिसाब, अब आसान
            </Text>
          </View>

          {/* Information / legal menu */}
          <View className="mt-4 overflow-hidden rounded-[26px] border border-white/50 bg-white/35">
            {ABOUT_ROWS.map((row, index) => (
              <View key={row.key}>
                {index > 0 ? <View className="mx-5 h-px bg-white/50" /> : null}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => router.push(row.route as any)}
                  accessibilityRole="button"
                  accessibilityLabel={row.title}
                  className="flex-row items-center px-5 py-4"
                >
                  <View
                    className={`h-11 w-11 items-center justify-center rounded-full ${row.iconBg}`}
                  >
                    <Ionicons name={row.icon} size={21} color="#0B3D62" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-[15px] font-bold text-[#0B3D62]">
                      {row.title}
                    </Text>
                    <Text className="mt-0.5 text-[12px] text-[#4B5A66]">
                      {row.subtitle}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={19} color="#2A5A82" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
