/**
 * Email-verification foundation screen (deep-link/manual token entry).
 * Calls the real POST /api/v1/auth/verify-email endpoint; surfaces
 * honest backend errors until the route is implemented server-side.
 */
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function VerifyEmail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const { verifyEmail } = useAuth();
  const [token, setToken] = useState(typeof params.token === "string" ? params.token : "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleVerify = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = (await verifyEmail({ token: token.trim() })) as {
        message?: string;
        verified?: boolean;
      };
      setMessage(result?.message ?? (result?.verified ? "Email verified." : "Verification submitted."));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <Text className="text-2xl font-bold text-[#14212B]">Verify your email</Text>
      <Text className="mt-2 text-sm text-[#4B5A66]">Paste the verification token from your email.</Text>
      <TextInput
        className="mt-6 min-h-[52px] rounded-2xl border border-[#D7E0E0] px-4 text-sm text-[#14212B]"
        placeholder="Verification token"
        placeholderTextColor="rgba(20,33,43,0.4)"
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        multiline
      />
      {message ? <Text className="mt-4 text-[13px] text-[#4B5A66]">{message}</Text> : null}
      <TouchableOpacity
        className="mt-6 h-[54px] items-center justify-center rounded-full bg-[#00B894]"
        onPress={handleVerify}
        disabled={busy || !token.trim()}
        activeOpacity={0.9}
      >
        <Text className="text-base font-bold text-white">{busy ? "Verifying…" : "Verify email"}</Text>
      </TouchableOpacity>
      <TouchableOpacity className="mt-6 items-center" onPress={() => router.replace("/login" as any)}>
        <Text className="text-sm font-bold text-[#00896B]">Back to login</Text>
      </TouchableOpacity>
    </View>
  );
}
