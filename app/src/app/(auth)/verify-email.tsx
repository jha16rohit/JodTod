/** Pending-account verification. The existing route serves the backend-selected channel. */
import { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyAccount() {
  const router = useRouter();
  const { user, isVerificationPending, verificationMethod, sendOTP, sendEmailVerification, verifyOTP, verifyEmail, logout } = useAuth();
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (!isVerificationPending) router.replace("/(tabs)");
  }, [isVerificationPending, router]);

  const isEmail = verificationMethod === "email";
  const destination = isEmail ? user?.email : user?.phone;
  const channel = isEmail ? "email" : "phone";

  const resend = async () => {
    if (!destination || !verificationMethod || busy) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const result = isEmail
        ? await sendEmailVerification(destination)
        : await sendOTP({ destination, purpose: "phone_verification" });
      setCode(""); setSecondsLeft(RESEND_SECONDS);
      setMessage((result as { message?: string }).message ?? "A new code was sent.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not resend the code.");
    } finally { setBusy(false); }
  };

  const verify = async () => {
    if (!destination || !verificationMethod || code.length !== OTP_LENGTH || busy) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      if (isEmail) await verifyEmail({ email: destination, code });
      else await verifyOTP({ destination, otp: code, purpose: "phone_verification" });
      // AuthContext reloads the backend user only after successful OTP verification.
      router.replace("/(tabs)");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid or expired code.");
    } finally { setBusy(false); }
  };

  const leavePendingAccount = async () => { await logout(); router.replace("/login"); };

  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <Text className="text-2xl font-bold text-[#14212B]">Verify your {channel}</Text>
      <Text className="mt-2 text-sm text-[#4B5A66]">Enter the 6-digit code sent to {destination ?? `your ${channel}`}.</Text>
      <TextInput
        className="mt-6 min-h-[52px] rounded-2xl border border-[#D7E0E0] px-4 text-center text-lg tracking-[8px] text-[#14212B]"
        placeholder="000000" placeholderTextColor="rgba(20,33,43,0.4)" value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
        keyboardType="number-pad" maxLength={OTP_LENGTH}
      />
      {error ? <Text className="mt-4 text-[13px] text-red-600">{error}</Text> : null}
      {message ? <Text className="mt-4 text-[13px] text-[#4B5A66]">{message}</Text> : null}
      <TouchableOpacity className="mt-6 h-[54px] items-center justify-center rounded-full bg-[#00B894]" onPress={verify} disabled={busy || code.length !== OTP_LENGTH || !destination} activeOpacity={0.9}>
        <Text className="text-base font-bold text-white">{busy ? "Verifying…" : "Verify code"}</Text>
      </TouchableOpacity>
      <TouchableOpacity className="mt-5 items-center" onPress={resend} disabled={busy || secondsLeft > 0 || !destination}>
        <Text className="text-sm font-bold text-[#00896B]">{secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}</Text>
      </TouchableOpacity>
      <TouchableOpacity className="mt-6 items-center" onPress={leavePendingAccount}><Text className="text-sm font-bold text-[#00896B]">Back to login</Text></TouchableOpacity>
    </View>
  );
}
