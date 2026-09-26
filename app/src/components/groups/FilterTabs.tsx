import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { GlassLayers, cardShadow, colors } from './ui';

type FilterTabsProps<T extends string> = {
  tabs: readonly T[];
  value: T;
  onChange: (tab: T) => void;
};

export function FilterTabs<T extends string>({ tabs, value, onChange }: FilterTabsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="flex-grow-0"
      contentContainerStyle={{ paddingBottom: 14, paddingRight: 12 }}
    >
      {tabs.map((t) => {
        const active = t === value;
        return (
          <TouchableOpacity
            key={t}
            activeOpacity={0.85}
            onPress={() => onChange(t)}
            className="mr-2 items-center justify-center overflow-hidden rounded-full border px-4"
            style={[
              { flexShrink: 0, height: 40 },
              active
                ? {
                    borderColor: 'transparent',
                    backgroundColor: colors.brand,
                    ...cardShadow,
                    shadowColor: colors.brand,
                    shadowOpacity: 0.35,
                  }
                : { borderColor: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.28)' },
            ]}
          >
            {!active ? <GlassLayers radius={24} /> : null}
            <Text
              className="text-[13.5px] font-bold"
              style={{ color: active ? '#fff' : colors.headerSub }}
            >
              {t}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
