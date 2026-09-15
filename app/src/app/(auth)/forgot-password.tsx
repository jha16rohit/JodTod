/**
 * Forgot-password foundation screen.
 *
 * Backend contract status: NO forgot/reset endpoint is implemented
 * (backend/routes/auth.py is empty). This screen calls
 * requestPasswordReset() and surfaces the honest "not available" error —
 * it never fakes a reset email being sent.
 */
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { requestPasswordReset } from "../../services/auth.service";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await requestPasswordReset({ email: email.trim() });
      setMessage("If an account exists for this email, a reset link was sent.");
    } catch (e) {
      const text = e instanceof Error ? e.message : "Request failed.";
      setMessage(text);
      Alert.alert("Password reset", text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <Text className="text-2xl font-bold text-[#14212B]">Reset your password</Text>
      <Text className="mt-2 text-sm text-[#4B5A66]">
        Enter your account email. Password reset is wired to the backend contract and will activate once the
        server endpoint is implemented.
      </Text>
      <TextInput
        className="mt-6 h-[52px] rounded-2xl border border-[#D7E0E0] px-4 text-sm text-[#14212B]"
        placeholder="Email address"
        placeholderTextColor="rgba(20,33,43,0.4)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {message ? <Text className="mt-4 text-[13px] text-[#4B5A66]">{message}</Text> : null}
      <TouchableOpacity
        className="mt-6 h-[54px] items-center justify-center rounded-full bg-[#00B894]"
        onPress={handleSubmit}
        disabled={busy || !email.trim()}
        activeOpacity={0.9}
      >
        <Text className="text-base font-bold text-white">{busy ? "Sending…" : "Send reset link"}</Text>
      </TouchableOpacity>
      <TouchableOpacity className="mt-6 items-center" onPress={() => router.back()}>
        <Text className="text-sm font-bold text-[#00896B]">Back to login</Text>
      </TouchableOpacity>
    </View>
  );
}
