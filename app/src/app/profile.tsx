import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
};

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
      <BlurView intensity={20} tint="light" className="absolute inset-0" />

      <View className="bg-white/25">{children}</View>
    </View>
  );
}

function MenuItem({ icon, title, subtitle, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      className="flex-row items-center px-4 py-4"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/30">
        <Ionicons name={icon} size={21} color="#0B3D62" />
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-[15px] font-semibold text-[#0B3D62]">
          {title}
        </Text>

        <Text className="mt-1 text-[12px] text-[#4B5A66]">{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={19} color="#2A5A82" />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View className="mx-4 h-px bg-white/40" />;
}

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    router.replace("/login");
  };

  return (
    <View className="flex-1">
      {/* =========================================================
          FULL SCREEN BACKGROUND
          This outer View lets the background continue behind the
          Android bottom gesture/navigation area.
      ========================================================= */}

      <Image
        source={require("../../assets/images/jodtod/background_animation.png")}
        resizeMode="cover"
        className="absolute inset-0 h-full w-full"
      />

      {/* Very subtle glass/white overlay */}
      <View className="absolute inset-0 bg-white/10" />

      {/* =========================================================
          SAFE AREA + MAIN SCROLLABLE CONTENT
      ======================================================= */}

      <SafeAreaView edges={["top"]} className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5 pb-10"
        >
          {/* =======================================================
            HEADER
        ======================================================= */}

          <View className="flex-row items-center justify-between pt-2">
            {/* Back */}
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              className="h-11 w-11 items-center justify-center rounded-full bg-white/30"
            >
              <Ionicons name="arrow-back-outline" size={24} color="#0B3D62" />
            </TouchableOpacity>

            {/* Title */}
            <Text className="text-[22px] font-extrabold text-[#0B3D62]">
              My Profile
            </Text>

            {/* Edit */}
            <TouchableOpacity
              onPress={() => router.push("/edit-profile")}
              activeOpacity={0.8}
              className="rounded-full bg-[#00B894] px-5 py-2.5"
            >
              <Text className="text-[14px] font-bold text-white">Edit</Text>
            </TouchableOpacity>
          </View>

          {/* =======================================================
            PROFILE AVATAR
        ======================================================= */}

          <View className="items-center pt-8">
            {/* Avatar container */}
            <View className="relative">
              <Image
                source={require("../../assets/images/jodtod/people.png")}
                resizeMode="cover"
                className="h-36 w-36 rounded-full border-4 border-white/70"
              />

              {/* Camera button */}
              <TouchableOpacity
                activeOpacity={0.8}
                className="absolute bottom-0 right-0 h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-white/80"
              >
                <Ionicons name="camera-outline" size={20} color="#0B3D62" />
              </TouchableOpacity>
            </View>

            {/* Name */}
            <Text className="mt-5 text-[28px] font-extrabold text-[#0B3D62]">
              {user?.name?.trim() || ""}
            </Text>

            {/* Email */}
            <Text className="mt-1 text-[15px] font-medium text-[#2A5A82]">
              {user?.email ?? user?.phone ?? ""}
            </Text>
          </View>

          {/* =======================================================
            STATISTICS
        ======================================================= */}

          <GlassCard className="mt-7">
            <View className="flex-row">
              {/* Groups */}
              <View className="flex-1 items-center py-5">
                <Text className="text-[22px] font-extrabold text-[#0B3D62]">
                  5
                </Text>

                <Text className="mt-1 text-[11px] font-medium text-[#4B5A66]">
                  Groups
                </Text>
              </View>

              <View className="my-4 w-px bg-white/50" />

              {/* Expenses */}
              <View className="flex-1 items-center py-5">
                <Text className="text-[22px] font-extrabold text-[#0B3D62]">
                  24
                </Text>

                <Text className="mt-1 text-[11px] font-medium text-[#4B5A66]">
                  Expenses
                </Text>
              </View>

              <View className="my-4 w-px bg-white/50" />

              {/* Trips */}
              <View className="flex-1 items-center py-5">
                <Text className="text-[22px] font-extrabold text-[#0B3D62]">
                  3
                </Text>

                <Text className="mt-1 text-[11px] font-medium text-[#4B5A66]">
                  Trips
                </Text>
              </View>

              <View className="my-4 w-px bg-white/50" />

              {/* Settlements */}
              <View className="flex-1 items-center py-5">
                <Text className="text-[22px] font-extrabold text-[#0B3D62]">
                  2
                </Text>

                <Text className="mt-1 text-[11px] font-medium text-[#4B5A66]">
                  Settlements
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* =======================================================
            PROFILE MENU
        ======================================================= */}

          <GlassCard className="mt-6">
            {/* Personal Information */}
            <MenuItem
              icon="person-outline"
              title="Personal Information"
              subtitle="Name, email, phone"
              onPress={() => router.push("/personal-information")}
            />

            <Divider />

            {/* Preferences */}
            <MenuItem
              icon="settings-outline"
              title="Preferences"
              subtitle="Currency, theme, notifications"
              onPress={() => router.push("/preferences")}
            />

            <Divider />

            {/* Linked Accounts */}
            <MenuItem
              icon="link-outline"
              title="Linked Accounts"
              subtitle="Google, phone number"
              onPress={() => router.push("/linked-accounts")}
            />

            <Divider />

            {/* App Settings */}
            <MenuItem
              icon="settings-outline"
              title="App Settings"
              subtitle="Language, privacy, data"
              onPress={() => router.push("/app-settings")}
            />

            <Divider />

            {/* Help & Support */}
            <MenuItem
              icon="help-circle-outline"
              title="Help & Support"
              subtitle="FAQs, contact us"
              onPress={() => router.push("/help-support")}
            />

            <Divider />

            {/* About JodTod */}
            <MenuItem
              icon="information-circle-outline"
              title="About JodTod"
              subtitle="Version 1.0.0"
              onPress={() => router.push("/about-jodtod")}
            />
          </GlassCard>

          {/* =======================================================
            LOGOUT
        ======================================================= */}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLogout}
            className="mt-6 mb-4"
          >
            <View className="h-14 flex-row items-center justify-center rounded-[22px] border border-red-400/60 bg-white/50">
              <Ionicons name="log-out-outline" size={21} color="#EF4444" />

              <Text className="ml-2 text-[15px] font-bold text-red-500">
                Log Out
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* =========================================================
          LOGOUT CONFIRMATION
      ========================================================= */}

      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View className="w-full max-w-[360px] overflow-hidden rounded-[28px] border border-white/50 bg-white/90 p-6">
            {/* Header */}
            <View className="flex-row items-center justify-between">
              <Text className="text-[21px] font-extrabold text-[#14212B]">
                Log Out?
              </Text>

              <TouchableOpacity
                onPress={cancelLogout}
                activeOpacity={0.7}
                className="h-9 w-9 items-center justify-center rounded-full bg-black/5"
              >
                <Ionicons name="close" size={21} color="#4B5A66" />
              </TouchableOpacity>
            </View>

            {/* Message */}
            <Text className="mt-3 text-[14px] leading-5 text-[#4B5A66]">
              Are you sure you want to log out?
            </Text>

            {/* Buttons */}
            <View className="mt-6 flex-row gap-3">
              {/* Cancel */}
              <TouchableOpacity
                onPress={cancelLogout}
                activeOpacity={0.8}
                className="flex-1 items-center justify-center rounded-[16px] border border-[#D5DEE5] bg-white py-3.5"
              >
                <Text className="text-[14px] font-bold text-[#4B5A66]">
                  Cancel
                </Text>
              </TouchableOpacity>

              {/* Logout */}
              <TouchableOpacity
                onPress={confirmLogout}
                activeOpacity={0.8}
                className="flex-1 items-center justify-center rounded-[16px] bg-red-500 py-3.5"
              >
                <Text className="text-[14px] font-bold text-white">
                  Log Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
