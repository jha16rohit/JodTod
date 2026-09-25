import { Text, View } from 'react-native';
import { colors, inr } from './ui';

type BalanceSummaryProps = {
  youAreOwed: number;
  youOwe: number;
  totalExpenses?: number;
  variant?: 'row' | 'cards';
};

export function BalanceSummary({ youAreOwed, youOwe, totalExpenses, variant = 'row' }: BalanceSummaryProps) {
  if (variant === 'cards') {
    return (
      <View>
        {totalExpenses !== undefined && (
          <View className="rounded-2xl px-4 py-3.5 mb-3" style={{ backgroundColor: colors.neutralBg }}>
            <Text className="text-[12px] mb-1" style={{ color: colors.textMuted }}>
              Total Expenses
            </Text>
            <Text className="text-2xl font-extrabold" style={{ color: colors.textDark }}>
              {inr(totalExpenses)}
            </Text>
          </View>
        )}
        <View className="flex-row gap-3 mb-2">
          <View className="flex-1 rounded-2xl px-4 py-3.5" style={{ backgroundColor: colors.successBg }}>
            <Text className="text-[12px] font-bold" style={{ color: colors.brandDark }}>
              You&apos;re owed
            </Text>
            <Text className="mt-1 text-[20px] font-extrabold" style={{ color: colors.brandDark }}>
              {inr(youAreOwed)}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl px-4 py-3.5" style={{ backgroundColor: colors.dangerBg }}>
            <Text className="text-[12px] font-bold" style={{ color: colors.danger }}>
              You owe
            </Text>
            <Text className="mt-1 text-[20px] font-extrabold" style={{ color: colors.danger }}>
              {inr(youOwe)}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (youAreOwed > 0) {
    return (
      <View className="items-end">
        <Text className="text-[11px]" style={{ color: colors.textMuted }}>You&apos;re owed</Text>
        <Text className="text-[15px] font-extrabold" style={{ color: colors.brandDark }}>
          {inr(youAreOwed)}
        </Text>
      </View>
    );
  }

  if (youOwe > 0) {
    return (
      <View className="items-end">
        <Text className="text-[11px]" style={{ color: colors.textMuted }}>You owe</Text>
        <Text className="text-[15px] font-extrabold" style={{ color: colors.danger }}>
          {inr(youOwe)}
        </Text>
      </View>
    );
  }

  return (
    <View className="items-end">
      <Text className="text-[12px] font-semibold" style={{ color: colors.textMuted }}>Settled up</Text>
    </View>
  );
}
