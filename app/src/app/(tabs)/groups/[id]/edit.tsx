import { ScrollView, KeyboardAvoidingView, Platform, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader, colors } from "@/components/groups/ui";
import { GroupForm } from "@/components/groups/GroupForm";
import { getGroup } from "@/lib/mockGroups";

export default function EditGroup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = getGroup(id as string);

  if (!group) return null;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 56}
        className="flex-1"
      >
        <ScreenHeader title="Edit Group" />

        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <GroupForm
            initialValues={{
              name: group.name,
              destination: group.destination,
              description: group.description,
              budget: group.budget ? String(group.budget) : "",
              startDate: "Apr 10, 2025",
              endDate: "Apr 18, 2025",
            }}
            submitLabel="Save Changes"
            showCover="banner"
            coverImage={group.coverImage}
            onSubmit={() => {
              // TODO: wire up to real update-group mutation
              router.back();
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
