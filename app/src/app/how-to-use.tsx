/**
 * How to Use JodTod — static step-by-step guides.
 *
 * Covers only features that exist in the app today (groups, expenses,
 * activity, settle, profile, preferences). Static product
 * documentation; intentionally not a database CMS.
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

interface Guide {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  title: string;
  steps: string[];
}

const GUIDES: Guide[] = [
  {
    icon: "people-outline",
    iconBg: "bg-[#00B894]/15",
    title: "Groups",
    steps: [
      "Open the Groups tab to see all your groups.",
      "Tap Create to start a group with a name and members.",
      "Tap Join and enter an invite code to join a group.",
      "Open a group to see expenses, members, and settings.",
    ],
  },
  {
    icon: "receipt-outline",
    iconBg: "bg-[#0B3D62]/10",
    title: "Expenses",
    steps: [
      "Open a group and go to Expenses.",
      "Add the amount, category, and who paid.",
      "New expenses appear in your Activity feed.",
    ],
  },
  {
    icon: "swap-horizontal-outline",
    iconBg: "bg-amber-500/15",
    title: "Settlements",
    steps: [
      "Open the Settle tab to see who owes whom.",
      "Record a settlement once money changes hands.",
      "Balances update for everyone in the group.",
    ],
  },
  {
    icon: "person-outline",
    iconBg: "bg-violet-500/10",
    title: "Profile",
    steps: [
      "Open My Profile to see your groups, expenses, trips, and settlements.",
      "Open Personal Information and tap Edit to update your name, username, or phone.",
      "Tap the camera icon on your photo to take, choose, or remove it.",
    ],
  },
  {
    icon: "settings-outline",
    iconBg: "bg-sky-500/10",
    title: "Preferences",
    steps: [
      "Open Preferences from My Profile.",
      "Tap Currency to confirm INR as your currency.",
      "Choose your date format and start of week.",
      "Group Invitations takes you to the Join a Group screen.",
    ],
  },
];

export default function HowToUse() {
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
            accessibilityLabel="Back to Help and Support"
            className="h-11 w-11 items-center justify-center rounded-full bg-white/30"
          >
            <Ionicons name="arrow-back-outline" size={24} color="#0B3D62" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-[22px] font-extrabold text-[#0B3D62]">
            How to Use JodTod
          </Text>
          <View className="h-11 w-11" />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-8"
        >
          {GUIDES.map((guide) => (
            <View
              key={guide.title}
              className="mb-4 overflow-hidden rounded-[26px] border border-white/50 bg-white/35"
            >
              <View className="px-5 py-5">
                <View className="flex-row items-center">
                  <View
                    className={`h-11 w-11 items-center justify-center rounded-full ${guide.iconBg}`}
                  >
                    <Ionicons name={guide.icon} size={21} color="#0B3D62" />
                  </View>
                  <Text className="ml-3 text-[16px] font-bold text-[#0B3D62]">
                    {guide.title}
                  </Text>
                </View>
                {guide.steps.map((step, index) => (
                  <View key={index} className="mt-3 flex-row">
                    <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-[#0B3D62]/10">
                      <Text className="text-[12px] font-bold text-[#0B3D62]">
                        {index + 1}
                      </Text>
                    </View>
                    <Text className="flex-1 text-[14px] leading-6 text-[#4B5A66]">
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
