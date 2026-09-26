import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ScreenHeader,
  LabeledField,
  GradientCTA,
  colors,
} from '@/components/groups/ui';
import { getGroup } from '@/lib/mockGroups';

const { width: SCREEN_W } = Dimensions.get('window');

export default function EditGroup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = getGroup(id as string);

  const [name, setName] = useState(group?.name ?? '');
  const [destination, setDestination] = useState(group?.destination ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [budget, setBudget] = useState(group?.budget ? String(group.budget) : '');
  const [startDate, setStartDate] = useState('Apr 10, 2025');
  const [endDate, setEndDate] = useState('Apr 18, 2025');

  if (!group) return null;

  const handleSave = () => {
    // TODO: wire up to real update-group mutation
    router.back();
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 56}
        className="flex-1"
      >
        <ScreenHeader title="Edit Group" />

        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cover image with change overlay */}
          <View style={{ width: SCREEN_W - 40, height: 140, borderRadius: 24, overflow: 'hidden', marginBottom: 20 }}>
            <LinearGradient colors={['#0EA98A', '#0B7EA8']} style={{ flex: 1 }} />
            <TouchableOpacity
              className="absolute bottom-3 right-3 flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            >
              <Ionicons name="camera-outline" size={14} color="#fff" />
              <Text className="text-[11px] font-semibold text-white">Change</Text>
            </TouchableOpacity>
          </View>

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
            label="Start Date"
            icon="calendar-outline"
            value={startDate}
            onChangeText={setStartDate}
            placeholder="Select start date"
          />

          <LabeledField
            label="End Date"
            icon="calendar-outline"
            value={endDate}
            onChangeText={setEndDate}
            placeholder="Select end date"
          />

          <View style={{ marginTop: 4 }}>
            <GradientCTA onPress={handleSave} icon={null}>
              <Text className="text-white text-[15px] font-bold">Save Changes</Text>
            </GradientCTA>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
