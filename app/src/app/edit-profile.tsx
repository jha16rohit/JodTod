/**
 * Edit Profile — editing surface for the Personal Information page.
 *
 * Flow: Personal Information -> Edit Profile -> Save ->
 * Personal Information (updated). Back (top-left) returns to Personal
 * Information without saving. Only Full Name, Username, and Phone
 * Number are editable; Email is displayed read-only. Profile-photo
 * editing lives on Personal Information (photo edit icon), so the
 * photo here is display-only.
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
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  fetchProfileDashboard,
  resolvePhotoUrl,
  updateProfile,
  ProfileApiError,
} from "../services/profile.api";

const PHOTO_PLACEHOLDER = require("../../assets/images/jodtod/people.png");

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,32}$/;
const PHONE_ALLOWED_PATTERN = /^[+0-9()\-.\s]+$/;

function validateName(value: string): string | null {
  const cleaned = value.trim();
  if (!cleaned) return "Enter your full name.";
  if (cleaned.length > 100) return "Name must be 100 characters or fewer.";
  return null;
}

function validateUsername(value: string): string | null {
  const cleaned = value.trim();
  if (!cleaned) return "Choose a username.";
  if (!USERNAME_PATTERN.test(cleaned)) {
    return "3-32 characters: letters, numbers, dot, underscore, hyphen.";
  }
  return null;
}

function validatePhone(value: string): string | null {
  const cleaned = value.trim();
  if (!cleaned) return "Enter your phone number.";
  if (!PHONE_ALLOWED_PATTERN.test(cleaned)) {
    return "Phone number contains invalid characters.";
  }
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return "Phone number must contain 7-15 digits.";
  }
  return null;
}

export default function EditProfile() {
  const router = useRouter();
  const { user, adoptUser } = useAuth();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    username?: string;
    phone?: string;
  }>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Snapshot of the auth user for the one-time fallback below. A ref
  // (not state dep) so background session revalidations while typing
  // can never wipe the form.
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Load the form ONCE on mount. Deliberately no focus-reload and no
  // user-state dependency: refetching while the user types would wipe
  // in-flight edits (e.g. after a background session revalidation),
  // and Save navigates away anyway.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (mountedRef.current) {
        setLoading(true);
        setLoadError(null);
      }
      try {
        const data = await fetchProfileDashboard();
        if (cancelled || !mountedRef.current) return;
        setName(data.profile.name ?? "");
        setUsername(data.profile.username ?? "");
        setPhone(data.profile.phone ?? "");
        setEmail(data.profile.email ?? null);
        setAvatarUrl(data.profile.avatar_url ?? null);
      } catch (e) {
        // Fall back to the cached auth user so the form stays usable.
        if (cancelled || !mountedRef.current) return;
        const cached = userRef.current;
        if (cached) {
          setName(cached.name ?? "");
          setUsername(cached.username ?? "");
          setPhone(cached.phone ?? "");
          setEmail(cached.email ?? null);
          setAvatarUrl(cached.avatar_url ?? null);
          setLoadError(null);
        } else {
          setLoadError(
            e instanceof Error ? e.message : "Could not load your profile.",
          );
        }
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCurrent = useCallback(async () => {
    if (mountedRef.current) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const data = await fetchProfileDashboard();
      if (!mountedRef.current) return;
      setName(data.profile.name ?? "");
      setUsername(data.profile.username ?? "");
      setPhone(data.profile.phone ?? "");
      setEmail(data.profile.email ?? null);
      setAvatarUrl(data.profile.avatar_url ?? null);
    } catch (e) {
      if (!mountedRef.current) return;
      const cached = userRef.current;
      if (cached) {
        setName(cached.name ?? "");
        setUsername(cached.username ?? "");
        setPhone(cached.phone ?? "");
        setEmail(cached.email ?? null);
        setAvatarUrl(cached.avatar_url ?? null);
        setLoadError(null);
      } else {
        setLoadError(
          e instanceof Error ? e.message : "Could not load your profile.",
        );
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const goBackToPersonalInfo = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/personal-information");
    }
  }, [router]);

  const handleSave = useCallback(async () => {
    if (saving || loading) return;
    const errors = {
      name: validateName(name),
      username: validateUsername(username),
      phone: validatePhone(phone),
    };
    const next: typeof fieldErrors = {};
    if (errors.name) next.name = errors.name;
    if (errors.username) next.username = errors.username;
    if (errors.phone) next.phone = errors.phone;
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    if (mountedRef.current) {
      setSaving(true);
      setSaveError(null);
    }
    try {
      const updated = await updateProfile({
        name: name.trim(),
        username: username.trim(),
        phone: phone.trim(),
      });
      // Adopt the authoritative PATCH response directly (it carries the
      // persisted username): shared state + cache update with no extra
      // GET, so Personal Information shows the new value immediately.
      await adoptUser(updated).catch(() => undefined);
      if (!mountedRef.current) return;
      // Return to Personal Information; it refetches on focus so the
      // updated values are immediately visible.
      router.replace("/personal-information");
    } catch (e) {
      if (!mountedRef.current) return;
      if (e instanceof ProfileApiError && e.status === 409) {
        // Uniqueness collision — attach to the likely field.
        const detail = e.message.toLowerCase();
        if (detail.includes("username")) {
          setFieldErrors((prev) => ({ ...prev, username: e.message }));
        } else if (detail.includes("phone")) {
          setFieldErrors((prev) => ({ ...prev, phone: e.message }));
        } else {
          setSaveError(e.message);
        }
      } else {
        setSaveError(
          e instanceof Error ? e.message : "Could not save your profile.",
        );
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [adoptUser, loading, name, phone, router, saving, username]);

  const photoUrl = resolvePhotoUrl(avatarUrl);

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-[#F5F9FC]">
      {/* Background */}
      <Image
        source={require("../../assets/images/jodtod/background_home.png")}
        resizeMode="cover"
        className="absolute inset-0 h-full w-full"
      />

      {/* Content wrapper */}
      <View className="relative z-10 flex-1 p-6">
        {/* Header: back (top-left) | title | spacer */}
        <View className="mb-6 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={goBackToPersonalInfo}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to Personal Information"
            className="h-11 w-11 items-center justify-center rounded-full bg-white/30"
          >
            <Ionicons name="arrow-back-outline" size={24} color="#0B3D62" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-[22px] font-extrabold text-[#0B3D62]">
            Edit Profile
          </Text>
          {/* Spacer keeps the title centered (no redundant cross button). */}
          <View className="h-11 w-11" />
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0B3D62" />
            <Text className="mt-3 text-[13px] font-medium text-[#4B5A66]">
              Loading your profile...
            </Text>
          </View>
        ) : loadError ? (
          <View className="items-center rounded-2xl border border-red-300/60 bg-white/60 px-4 py-5">
            <Text className="text-center text-[13px] font-medium text-red-600">
              {loadError}
            </Text>
            <TouchableOpacity
              onPress={() => void loadCurrent()}
              activeOpacity={0.7}
              className="mt-3 rounded-full bg-[#0B3D62] px-4 py-2"
            >
              <Text className="text-[13px] font-bold text-white">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Profile Photo (display-only; edit via Personal Information) */}
            <View className="mb-6 flex-row items-center">
              <Image
                source={photoUrl ? { uri: photoUrl } : PHOTO_PLACEHOLDER}
                resizeMode="cover"
                className="h-20 w-20 rounded-full border-2 border-white/30"
              />
              <Text className="ml-4 flex-1 text-[12px] leading-5 text-[#4B5A66]">
                To change your photo, use the camera icon on the Personal
                Information page.
              </Text>
            </View>

            {/* Name Input */}
            <View className="mb-4">
              <Text className="mb-2 text-[15px] font-medium text-[#0B3D62]">
                Full Name
              </Text>
              <TextInput
                className="w-full rounded-[12px] border border-white/30 bg-white/50 px-4 py-3"
                placeholder="Enter your name"
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholderTextColor="#6B7280"
                editable={!saving}
              />
              {fieldErrors.name ? (
                <Text className="mt-1.5 text-[12px] text-red-600">
                  {fieldErrors.name}
                </Text>
              ) : null}
            </View>

            {/* Username Input */}
            <View className="mb-4">
              <Text className="mb-2 text-[15px] font-medium text-[#0B3D62]">
                Username
              </Text>
              <TextInput
                className="w-full rounded-[12px] border border-white/30 bg-white/50 px-4 py-3"
                placeholder="Choose a username"
                value={username}
                onChangeText={(v) => {
                  setUsername(v);
                  setFieldErrors((prev) => ({ ...prev, username: undefined }));
                }}
                placeholderTextColor="#6B7280"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!saving}
              />
              {fieldErrors.username ? (
                <Text className="mt-1.5 text-[12px] text-red-600">
                  {fieldErrors.username}
                </Text>
              ) : null}
            </View>

            {/* Email (read-only — never editable here) */}
            <View className="mb-4">
              <Text className="mb-2 text-[15px] font-medium text-[#0B3D62]">
                Email
              </Text>
              <View className="w-full flex-row items-center rounded-[12px] border border-white/30 bg-black/5 px-4 py-3">
                <Text className="flex-1 text-[15px] text-[#4B5A66]">
                  {email?.trim() || "Not set"}
                </Text>
                <Ionicons name="lock-closed-outline" size={15} color="#6B7280" />
              </View>
              <Text className="mt-1.5 text-[12px] text-[#6B7280]">
                Email cannot be changed.
              </Text>
            </View>

            {/* Phone Input */}
            <View className="mb-6">
              <Text className="mb-2 text-[15px] font-medium text-[#0B3D62]">
                Phone Number
              </Text>
              <TextInput
                className="w-full rounded-[12px] border border-white/30 bg-white/50 px-4 py-3"
                placeholder="+91 XXXX XXX XXX"
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                placeholderTextColor="#6B7280"
                keyboardType="phone-pad"
                editable={!saving}
              />
              {fieldErrors.phone ? (
                <Text className="mt-1.5 text-[12px] text-red-600">
                  {fieldErrors.phone}
                </Text>
              ) : null}
            </View>

            {saveError ? (
              <View className="mb-4 rounded-2xl border border-red-300/60 bg-white/60 px-4 py-3">
                <Text className="text-[13px] font-medium text-red-600">
                  {saveError}
                </Text>
              </View>
            ) : null}

            {/* Save Button */}
            <View className="mb-4 mt-2">
              <TouchableOpacity
                onPress={() => void handleSave()}
                disabled={saving || loading}
                activeOpacity={0.8}
                className={`w-full flex-row items-center justify-center rounded-[24px] py-3 ${
                  saving || loading ? "bg-[#00B894]/60" : "bg-[#00B894]"
                }`}
              >
                {saving ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                ) : null}
                <Text className="text-[16px] font-bold text-white">
                  {saving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
