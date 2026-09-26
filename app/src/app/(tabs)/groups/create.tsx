import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BubbleBackdrop,
  ScreenHeader,
  LabeledField,
  GradientCTA,
  colors,
} from '@/components/groups/ui';

export default function CreateGroup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const canCreate = name.trim().length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    // TODO: wire up to real create-group mutation
    router.replace('/(tabs)/groups' as any);
  };

  return (
    <BubbleBackdrop>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 56}
        className="flex-1"
      >
        <ScreenHeader title="Create a Group" />

        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cover image picker */}
          <TouchableOpacity
            activeOpacity={0.8}
            className="items-center justify-center rounded-3xl border-2 border-dashed mb-6"
            style={{
              height: 140,
              borderColor: colors.inputBorder,
              backgroundColor: 'rgba(255,255,255,0.35)',
            }}
          >
            <View
              className="items-center justify-center rounded-full mb-2"
              style={{ width: 44, height: 44, backgroundColor: colors.successBg }}
            >
              <Ionicons name="camera-outline" size={20} color={colors.brandDark} />
            </View>
            <Text className="text-[13px] font-semibold" style={{ color: colors.textMuted }}>
              Add Cover Image
            </Text>
            <Text className="text-[11px]" style={{ color: colors.textMuted }}>
              (optional)
            </Text>
          </TouchableOpacity>

          <LabeledField label="Group Name *" value={name} onChangeText={setName} placeholder="e.g., Goa Trip" />

          <LabeledField
            label="Destination"
            icon="location-outline"
            value={destination}
            onChangeText={setDestination}
            placeholder="e.g., Goa, India"
          />

          <LabeledField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="What's this trip about?"
            multiline
          />

          <LabeledField
            label="Budget (optional)"
            icon="pricetag-outline"
            value={budget}
            onChangeText={setBudget}
            placeholder="e.g., 50000"
            keyboardType="numeric"
          />

          <LabeledField
            label="Start Date (optional)"
            icon="calendar-outline"
            value={startDate}
            onChangeText={setStartDate}
            placeholder="Select start date"
          />

          <LabeledField
            label="End Date (optional)"
            icon="calendar-outline"
            value={endDate}
            onChangeText={setEndDate}
            placeholder="Select end date"
          />

          {/* Create Group button — sits right after the last field instead
              of being pinned to the bottom of a tall screen, so it reads as
              part of the form on every phone size. */}
          <View style={{ marginTop: 4 }}>
            <GradientCTA onPress={handleCreate} disabled={!canCreate} icon={null}>
              <Text className="text-white text-[15px] font-bold">Create Group</Text>
            </GradientCTA>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BubbleBackdrop>
  );
}
