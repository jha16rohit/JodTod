/**
 * Shared static information screen (About App, Terms, Privacy).
 *
 * One header/scroll/section layout for bundled static content, so
 * legal/information screens share behavior without duplication.
 * Content is passed as data — this component never invents copy.
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

export interface InfoSection {
  heading: string;
  body: string;
}

interface InfoScreenProps {
  title: string;
  intro?: string;
  sections: InfoSection[];
  footer?: string;
}

export function InfoScreen({ title, intro, sections, footer }: InfoScreenProps) {
  const router = useRouter();

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-[#F5F9FC]">
      {/* Background */}
      <Image
        source={require("../../../assets/images/jodtod/background_home.png")}
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
            {title}
          </Text>
          <View className="h-11 w-11" />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-8"
        >
          <View className="overflow-hidden rounded-[26px] border border-white/50 bg-white/35">
            <View className="px-5 py-5">
              {intro ? (
                <Text className="mb-4 text-[14px] leading-6 text-[#4B5A66]">
                  {intro}
                </Text>
              ) : null}
              {sections.map((section, index) => (
                <View key={section.heading} className={index > 0 ? "mt-5" : ""}>
                  <Text className="text-[16px] font-bold text-[#0B3D62]">
                    {section.heading}
                  </Text>
                  <Text className="mt-1.5 text-[14px] leading-6 text-[#4B5A66]">
                    {section.body}
                  </Text>
                </View>
              ))}
              {footer ? (
                <Text className="mt-5 text-[12px] leading-5 text-[#6B7280]">
                  {footer}
                </Text>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
