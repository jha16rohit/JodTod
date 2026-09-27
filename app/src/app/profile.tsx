import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  fetchProfileDashboard,
  resolvePhotoUrl,
  type ProfileDashboard,
} from "../services/profile.api";
import { useProfilePhoto } from "../hooks/useProfilePhoto";
import { ProfilePhotoSheet } from "../components/profile/ProfilePhotoSheet";
import { fetchPreferences } from "../services/preferences.api";

type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
};

const PHOTO_PLACEHOLDER = require("../../assets/images/jodtod/people.png");

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

function StatCell({ value, label, loading }: { value: number; label: string; loading: boolean }) {
  return (
    <View className="flex-1 items-center py-5">
      <Text className="text-[22px] font-extrabold text-[#0B3D62]">
        {loading ? "…" : String(value)}
      </Text>

      <Text className="mt-1 text-[11px] font-medium text-[#4B5A66]">
        {label}
      </Text>
    </View>
  );
}

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [dashboard, setDashboard] = useState<ProfileDashboard | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  // Display-name choice (account_name | username); cached prefs load
  // best-effort so My Profile never blocks on it.
  const [displayChoice, setDisplayChoice] = useState<string>("account_name");

  // Local override set immediately after upload/remove so the new photo
  // shows without waiting for a refetch. Null means "no override".
  // `undefined` is never stored — absence of override is `overrideSet`.
  const [avatarOverride, setAvatarOverride] = useState<string | null | undefined>(undefined);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadProfile = useCallback(async () => {
    if (mountedRef.current) {
      setProfileLoading(true);
      setProfileError(null);
    }
    try {
      const data = await fetchProfileDashboard();
      if (!mountedRef.current) return;
      setDashboard(data);
      // Fresh server state wins over any stale local override.
      setAvatarOverride(undefined);
      // Display-name preference (best-effort; failure keeps default).
      try {
        const prefs = await fetchPreferences();
        if (mountedRef.current) setDisplayChoice(prefs.display_name);
      } catch {
        // Keep the default presentation.
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setProfileError(
        e instanceof Error ? e.message : "Could not load your profile.",
      );
    } finally {
      if (mountedRef.current) setProfileLoading(false);
    }
  }, []);

  // SINGLE loading trigger: useFocusEffect.
  //
  // useFocusEffect already fires on the FIRST focus as well as on every
  // later one, so a second useEffect(() => loadProfile()) call would
  // deterministically duplicate the very first request (two concurrent
  // /profile + two /preferences fetches on open). One trigger only:
  //   opened  -> one load
  // revisited -> one load (so edits saved on Personal Information /
  //                Edit Profile are visible here at once)
  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

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

  // ---------------------------------------------------------------
  // Photo source: fresh dashboard first, cached auth user fallback.
  // ---------------------------------------------------------------
  const storedAvatar =
    avatarOverride !== undefined
      ? avatarOverride
      : (dashboard?.profile.avatar_url ?? user?.avatar_url ?? null);
  const photoUrl = resolvePhotoUrl(storedAvatar);
  // Primary display name follows the Display Name preference:
  // "username" shows @username when one exists, otherwise the
  // account name. Both fields stay stored; only presentation changes.
  const accountName =
    dashboard?.profile.name?.trim() || user?.name?.trim() || "";
  const username =
    dashboard?.profile.username?.trim() || user?.username?.trim() || "";
  const displayName =
    displayChoice === "username" && username ? `@${username}` : accountName;
  const displayContact =
    dashboard?.profile.email ??
    dashboard?.profile.phone ??
    user?.email ??
    user?.phone ??
    "";

  // ---------------------------------------------------------------
  // Photo flow: shared Page 01 system (hook owns permissions, upload,
  // removal, loading, and errors; this screen owns the displayed URL).
  // ---------------------------------------------------------------
  const photo = useProfilePhoto({
    hasPhoto: photoUrl !== null,
    onAvatarChanged: (avatarUrl) => setAvatarOverride(avatarUrl),
  });

  return (
    <View className="flex-1">
      {/* =========================================================
          FULL SCREEN BACKGROUND
          This outer View lets the background continue behind the
          Android bottom gesture/navigation area.
      ========================================================= */}

      <Image
        source={require("../../assets/images/jodtod/background_home.png")}
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
            <Text className="flex-1 text-center text-[22px] font-extrabold text-[#0B3D62]">
              My Profile
            </Text>

            {/* Spacer keeps the header balanced now that editing
                lives in Personal Information (no Edit button here). */}
            <View className="h-11 w-11" />
          </View>

          {/* =======================================================
            PROFILE AVATAR
        ======================================================= */}

          <View className="items-center pt-8">
            {/* Avatar container */}
            <View className="relative">
              {profileLoading && !displayName && !photoUrl ? (
                <View className="h-36 w-36 items-center justify-center rounded-full border-4 border-white/70 bg-white/40">
                  <ActivityIndicator size="large" color="#0B3D62" />
                </View>
              ) : (
                <Image
                  source={photoUrl ? { uri: photoUrl } : PHOTO_PLACEHOLDER}
                  resizeMode="cover"
                  className="h-36 w-36 rounded-full border-4 border-white/70"
                />
              )}

              {/* Camera button — opens Take Photo / Choose from Gallery */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => photo.setShowSheet(true)}
                className="absolute bottom-0 right-0 h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-white/80"
              >
                <Ionicons name="camera-outline" size={20} color="#0B3D62" />
              </TouchableOpacity>
            </View>

            {/* Name */}
            <Text className="mt-5 text-[28px] font-extrabold text-[#0B3D62]">
              {displayName}
            </Text>

            {/* Email */}
            <Text className="mt-1 text-[15px] font-medium text-[#2A5A82]">
              {displayContact}
            </Text>

            {/* Load / error state (empty data shows real zeros below) */}
            {profileError ? (
              <View className="mt-3 items-center rounded-2xl border border-red-300/60 bg-white/60 px-4 py-3">
                <Text className="text-[13px] font-medium text-red-600">
                  {profileError}
                </Text>
                <TouchableOpacity
                  onPress={() => void loadProfile()}
                  activeOpacity={0.7}
                  className="mt-2 rounded-full bg-[#0B3D62] px-4 py-2"
                >
                  <Text className="text-[13px] font-bold text-white">
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* =======================================================
            STATISTICS (real backend counts; 0 until those modules land)
        ======================================================= */}

          <GlassCard className="mt-7">
            <View className="flex-row">
              {/* Groups */}
              <StatCell
                value={dashboard?.groups.count ?? 0}
                label="Groups"
                loading={profileLoading && !dashboard}
              />

              <View className="my-4 w-px bg-white/50" />

              {/* Expenses */}
              <StatCell
                value={dashboard?.expenses.count ?? 0}
                label="Expenses"
                loading={profileLoading && !dashboard}
              />

              <View className="my-4 w-px bg-white/50" />

              {/* Trips */}
              <StatCell
                value={dashboard?.trips.count ?? 0}
                label="Trips"
                loading={profileLoading && !dashboard}
              />

              <View className="my-4 w-px bg-white/50" />

              {/* Settlements */}
              <StatCell
                value={dashboard?.settlements.count ?? 0}
                label="Settlements"
                loading={profileLoading && !dashboard}
              />
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

            {/* People & Settlements */}
            <MenuItem
              icon="people-outline"
              title="People & Settlements"
              subtitle="See who you owe or who owes you"
              onPress={() => router.push("/people-settlements")}
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
          PHOTO ACTION SHEET — shared Page 01 flow
      ========================================================= */}

      <ProfilePhotoSheet
        visible={photo.showSheet}
        uploading={photo.uploading}
        hasPhoto={photoUrl !== null}
        onTakePhoto={() => void photo.takePhoto()}
        onChooseFromGallery={() => void photo.chooseFromGallery()}
        onRemovePhoto={photo.removePhoto}
        onClose={() => photo.setShowSheet(false)}
      />

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
