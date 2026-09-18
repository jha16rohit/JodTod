import { ActivityIndicator, Text, View } from "react-native";

export default function AuthLoadingScreen({ message = "Restoring your session…" }: { message?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <ActivityIndicator size="large" color="#00B894" />
      <Text className="mt-4 text-center text-sm font-semibold text-[#4B5A66]">{message}</Text>
    </View>
  );
}
