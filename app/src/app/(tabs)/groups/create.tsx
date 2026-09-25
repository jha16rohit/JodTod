import { ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BubbleBackdrop, ScreenHeader } from "@/components/groups/ui";
import { GroupForm } from "@/components/groups/GroupForm";

export default function CreateGroup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <BubbleBackdrop>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 56}
        className="flex-1"
      >
        <ScreenHeader title="Create a Group" />

        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Create Group button sits right after the last field instead
              of being pinned to the bottom of a tall screen, so it reads as
              part of the form on every phone size. */}
          <GroupForm
            submitLabel="Create Group"
            showCover="picker"
            onSubmit={() => {
              // TODO: wire up to real create-group mutation
              router.replace("/(tabs)/groups" as any);
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </BubbleBackdrop>
  );
}
