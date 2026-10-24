/**
 * Shared support-request form (Contact / Bug / Feature).
 *
 * One form for the generalized support-request model (type
 * discriminator), so the three screens share validation, submission,
 * loading, success, and error behavior. Identity always comes from
 * the Bearer session via support.api — never client-supplied.
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
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  SupportApiError,
  createSupportRequest,
  type SupportRequestType,
} from "../../services/support.api";

interface SupportFormProps {
  type: SupportRequestType;
  title: string;
  subtitle: string;
  subjectLabel: string;
  subjectPlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  /** Screen identifier sent as backend context (optional). */
  screen: string;
  submitLabel: string;
  successTitle: string;
  successMessage: string;
}

function validateSubject(value: string): string | null {
  const cleaned = value.trim();
  if (cleaned.length < 3) return "Enter a subject (at least 3 characters).";
  if (cleaned.length > 200) return "Subject must be 200 characters or fewer.";
  return null;
}

function validateDescription(value: string): string | null {
  const cleaned = value.trim();
  if (cleaned.length < 10)
    return "Describe the issue in at least 10 characters.";
  if (cleaned.length > 5000)
    return "Description must be 5000 characters or fewer.";
  return null;
}

export function SupportForm({
  type,
  title,
  subtitle,
  subjectLabel,
  subjectPlaceholder,
  descriptionLabel,
  descriptionPlaceholder,
  screen,
  submitLabel,
  successTitle,
  successMessage,
}: SupportFormProps) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    subject?: string;
    description?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/help-support");
    }
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return;
    const errors: typeof fieldErrors = {};
    const subjectError = validateSubject(subject);
    const descriptionError = validateDescription(description);
    if (subjectError) errors.subject = subjectError;
    if (descriptionError) errors.description = descriptionError;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (mountedRef.current) {
      setSubmitting(true);
      setSubmitError(null);
    }
    try {
      const appVersion =
        typeof Constants.expoConfig?.version === "string"
          ? Constants.expoConfig.version
          : undefined;
      await createSupportRequest({
        type,
        subject: subject.trim(),
        description: description.trim(),
        app_version: appVersion,
        screen,
      });
      if (!mountedRef.current) return;
      setSubmitted(true);
    } catch (e) {
      if (!mountedRef.current) return;
      if (e instanceof SupportApiError && (e.status === 401 || e.status === 403)) {
        setSubmitError("Your session expired. Please log in again.");
      } else {
        setSubmitError(
          e instanceof Error ? e.message : "Could not submit your request.",
        );
      }
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }, [description, screen, subject, submitted, submitting, type]);

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
            onPress={goBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to Help and Support"
            className="h-11 w-11 items-center justify-center rounded-full bg-white/30"
          >
            <Ionicons name="arrow-back-outline" size={24} color="#0B3D62" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-[22px] font-extrabold text-[#0B3D62]">
            {title}
          </Text>
          <View className="h-11 w-11" />
        </View>

        {submitted ? (
          <View className="items-center rounded-[26px] border border-white/50 bg-white/35 px-6 py-10">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-[#00B894]/15">
              <Ionicons name="checkmark-circle" size={34} color="#00896B" />
            </View>
            <Text className="mt-4 text-center text-[19px] font-extrabold text-[#0B3D62]">
              {successTitle}
            </Text>
            <Text className="mt-2 text-center text-[14px] leading-6 text-[#4B5A66]">
              {successMessage}
            </Text>
            <TouchableOpacity
              onPress={goBack}
              activeOpacity={0.8}
              className="mt-6 w-full items-center justify-center rounded-[24px] bg-[#00B894] py-3"
            >
              <Text className="text-[16px] font-bold text-white">
                Back to Help & Support
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="pb-8"
          >
            <Text className="mb-4 text-[14px] leading-6 text-[#4B5A66]">
              {subtitle}
            </Text>

            {/* Subject */}
            <View className="mb-4">
              <Text className="mb-2 text-[15px] font-medium text-[#0B3D62]">
                {subjectLabel}
              </Text>
              <TextInput
                className="w-full rounded-[12px] border border-white/30 bg-white/50 px-4 py-3 text-[15px] text-[#14212B]"
                placeholder={subjectPlaceholder}
                placeholderTextColor="#6B7280"
                value={subject}
                onChangeText={(value) => {
                  setSubject(value);
                  setFieldErrors((prev) => ({ ...prev, subject: undefined }));
                }}
                editable={!submitting}
                maxLength={200}
              />
              {fieldErrors.subject ? (
                <Text className="mt-1.5 text-[12px] text-red-600">
                  {fieldErrors.subject}
                </Text>
              ) : null}
            </View>

            {/* Description */}
            <View className="mb-4">
              <Text className="mb-2 text-[15px] font-medium text-[#0B3D62]">
                {descriptionLabel}
              </Text>
              <TextInput
                className="w-full rounded-[12px] border border-white/30 bg-white/50 px-4 py-3 text-[15px] text-[#14212B]"
                placeholder={descriptionPlaceholder}
                placeholderTextColor="#6B7280"
                value={description}
                onChangeText={(value) => {
                  setDescription(value);
                  setFieldErrors((prev) => ({
                    ...prev,
                    description: undefined,
                  }));
                }}
                editable={!submitting}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={5000}
                style={{ minHeight: 140 }}
              />
              {fieldErrors.description ? (
                <Text className="mt-1.5 text-[12px] text-red-600">
                  {fieldErrors.description}
                </Text>
              ) : null}
            </View>

            {submitError ? (
              <View className="mb-4 rounded-2xl border border-red-300/60 bg-white/60 px-4 py-3">
                <Text className="text-[13px] font-medium text-red-600">
                  {submitError}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={() => void handleSubmit()}
              disabled={submitting}
              activeOpacity={0.8}
              className={`w-full flex-row items-center justify-center rounded-[24px] py-3 ${
                submitting ? "bg-[#00B894]/60" : "bg-[#00B894]"
              }`}
            >
              {submitting ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
              ) : null}
              <Text className="text-[16px] font-bold text-white">
                {submitting ? "Submitting..." : submitLabel}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
