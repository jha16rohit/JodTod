import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  }

  if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  }

  if (hour >= 17 && hour < 21) {
    return 'Good Evening';
  }

  return 'Good Night';
};

const userName = 'Rohit';

const groups = [
  {
    name: 'Goa Trip',
    members: '5 members',
    icon: 'sunny',
    iconBg: 'bg-[#DFF5EF]',
    status: 'owed',
    amount: '₹2,450',
  },
  {
    name: 'Flatmates',
    members: '4 members',
    icon: 'home',
    iconBg: 'bg-[#FDE8E3]',
    status: 'owe',
    amount: '₹680',
  },
];

const expenses = [
  {
    title: "Dinner at Bruno's",
    meta: 'Paid by you • 4 people',
    date: 'Apr 16, 2025',
    amount: '₹2,850',
    amountColor: 'text-[#F04F38]',
    icon: 'restaurant',
    iconColor: '#F04F38',
    iconBg: 'bg-[#FDE3E8]',
  },
  {
    title: 'Electricity Bill',
    meta: 'Paid by Aman • 3 people',
    date: 'Apr 14, 2025',
    amount: '₹1,200',
    amountColor: 'text-[#149C73]',
    icon: 'flash',
    iconColor: '#2563EB',
    iconBg: 'bg-[#DDEBFF]',
  },
  {
    title: 'Movie Night',
    meta: 'Paid by Neha • 5 people',
    date: 'Apr 12, 2025',
    amount: '₹980',
    amountColor: 'text-[#F04F38]',
    icon: 'film',
    iconColor: '#F04F38',
    iconBg: 'bg-[#FDE3E8]',
  },
  {
    title: 'Grocery Run',
    meta: 'Paid by Karan • 3 people',
    date: 'Apr 10, 2025',
    amount: '₹540',
    amountColor: 'text-[#149C73]',
    icon: 'cart',
    iconColor: '#149C73',
    iconBg: 'bg-[#DFF5EF]',
  },
];

export default function Home() {
  return (
    <SafeAreaView
      edges={['top']}
      className="flex-1 bg-[#F5F9FC]"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="px-5"
        contentContainerClassName="pb-44 pt-3"
      >
        {/* Header */}
        <View className="mb-6 flex-row items-center justify-between">
  {/* Greeting */}
  <View className="flex-row items-center">
    

    <View>
      <View className="flex-row items-center">
        <Text className="text-[17px] font-semibold text-[#20B879]">
          {getGreeting()},
        </Text>

        <Text className="ml-1.5 text-[23px] font-extrabold text-[#FF5A36]">
          {userName}
        </Text>
      </View>

      <Text className="mt-1 text-[11px] font-medium text-[#20B879]">
        Split Smart. Stay Together.
      </Text>
    </View>
  </View>

  {/* Header Actions */}
  <View className="flex-row items-center gap-3">
    <TouchableOpacity
      activeOpacity={0.8}
      className="h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/70"
    >
      <Ionicons
        name="search"
        size={21}
        color="#0B3D62"
      />
    </TouchableOpacity>

    <TouchableOpacity
      activeOpacity={0.8}
      className="relative h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/70"
    >
      <Ionicons
        name="notifications"
        size={21}
        color="#0B3D62"
      />

      <View className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#FF6548]" />
    </TouchableOpacity>

    <TouchableOpacity
      activeOpacity={0.8}
      className="h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-[#6ED5B3] bg-[#E7F4F0]"
    >
      <Ionicons
        name="person"
        size={21}
        color="#0B3D62"
      />
    </TouchableOpacity>
  </View>
</View>

        {/* Balance Glass Card */}
        <View className="mb-7 overflow-hidden rounded-[30px] border border-white/60">
          <LinearGradient
            colors={['#248BA5', '#087B76', '#20B879']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="overflow-hidden rounded-[30px]"
          >
            <BlurView
              intensity={25}
              tint="light"
              className="absolute inset-0"
            />

            <View className="p-6">
              <View className="flex-row items-center">
                {/* You Owe */}
                <View className="flex-1">
                  <View className="mb-3 flex-row items-center">
                    <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-[#FF8EAB]/80">
                      <Ionicons
                        name="arrow-down"
                        size={22}
                        color="#FFFFFF"
                      />
                    </View>

                    <Text className="text-[13px] font-medium text-white/80">
                      You owe
                    </Text>
                  </View>

                  <Text className="text-[29px] font-extrabold text-white">
                    ₹1,230
                  </Text>

                  <Text className="mt-1 text-[12px] text-white/65">
                    Across 3 groups
                  </Text>
                </View>

                {/* Divider */}
                <View className="mx-3 h-20 w-px bg-white/25" />

                {/* You're Owed */}
                <View className="flex-1">
                  <View className="mb-3 flex-row items-center">
                    <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-[#39D59A]/80">
                      <Ionicons
                        name="arrow-up"
                        size={22}
                        color="#FFFFFF"
                      />
                    </View>

                    <Text className="text-[13px] font-medium text-white/80">
                      You're owed
                    </Text>
                  </View>

                  <Text className="text-[29px] font-extrabold text-white">
                    ₹3,680
                  </Text>

                  <Text className="mt-1 text-[12px] text-white/65">
                    Across 5 groups
                  </Text>
                </View>
              </View>

              {/* Balance Footer */}
              <View className="mt-5 flex-row items-center justify-between">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-white/15">
                  <Ionicons
                    name="bar-chart"
                    size={19}
                    color="#FFFFFF"
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  className="flex-row items-center rounded-full border border-white/15 bg-white/15 px-4 py-2.5"
                >
                  <Text className="mr-1.5 text-[12px] font-bold text-white">
                    View details
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Your Groups */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[22px] font-extrabold text-[#0B3D62]">
            Your Groups
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            className="flex-row items-center"
          >
            <Text className="mr-1 text-[14px] font-bold text-[#149C73]">
              See all
            </Text>

            <Ionicons
              name="chevron-forward"
              size={17}
              color="#149C73"
            />
          </TouchableOpacity>
        </View>

        {/* Group Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-1 mb-7"
          contentContainerClassName="px-1"
        >
          {groups.map((group, index) => (
            <TouchableOpacity
              key={group.name}
              activeOpacity={0.9}
              className={`mr-4 w-[270px] rounded-[28px] border border-white bg-white/85 p-5 ${
                index === groups.length - 1 ? 'mr-0' : ''
              }`}
            >
              <View className="mb-4 flex-row items-start justify-between">
                <View
                  className={`h-14 w-14 items-center justify-center rounded-full ${group.iconBg}`}
                >
                  <Ionicons
                    name={group.icon as any}
                    size={25}
                    color="#0B3D62"
                  />
                </View>

                <View className="h-8 w-8 items-center justify-center rounded-full bg-[#F4F7F9]">
                  <Ionicons
                    name="ellipsis-vertical"
                    size={16}
                    color="#8DA0B1"
                  />
                </View>
              </View>

              <Text className="text-[20px] font-extrabold text-[#0B3D62]">
                {group.name}
              </Text>

              <Text className="mt-1 text-[14px] text-[#8297AA]">
                {group.members}
              </Text>

              <View
                className={
                  group.status === 'owed'
                    ? 'mt-5 flex-row items-center justify-between rounded-2xl bg-[#E7F7F2] px-4 py-3'
                    : 'mt-5 flex-row items-center justify-between rounded-2xl bg-[#FDEDEA] px-4 py-3'
                }
              >
                <View>
                  <Text
                    className={
                      group.status === 'owed'
                        ? 'text-[12px] font-medium text-[#15866C]'
                        : 'text-[12px] font-medium text-[#E05A45]'
                    }
                  >
                    {group.status === 'owed'
                      ? "You're owed"
                      : 'You owe'}
                  </Text>

                  <Text
                    className={
                      group.status === 'owed'
                        ? 'mt-0.5 text-[21px] font-extrabold text-[#149C73]'
                        : 'mt-0.5 text-[21px] font-extrabold text-[#E84D39]'
                    }
                  >
                    {group.amount}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color="#0B3D62"
                />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recent Expenses */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[22px] font-extrabold text-[#0B3D62]">
            Recent Expenses
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            className="flex-row items-center"
          >
            <Text className="mr-1 text-[14px] font-bold text-[#149C73]">
              See all
            </Text>

            <Ionicons
              name="chevron-forward"
              size={17}
              color="#149C73"
            />
          </TouchableOpacity>
        </View>

        {/* Expense List */}
        <View className="mb-7 overflow-hidden rounded-[28px] border border-white bg-white/90 px-4">
          {expenses.map((expense, index) => (
            <TouchableOpacity
              key={expense.title}
              activeOpacity={0.8}
              className={
                index === expenses.length - 1
                  ? 'flex-row items-center py-4'
                  : 'flex-row items-center border-b border-[#EDF1F4] py-4'
              }
            >
              {/* Expense Icon */}
              <View
                className={`mr-4 h-12 w-12 items-center justify-center rounded-full ${expense.iconBg}`}
              >
                <Ionicons
                  name={expense.icon as any}
                  size={21}
                  color={expense.iconColor}
                />
              </View>

              {/* Expense Details */}
              <View className="flex-1">
                <Text
                  numberOfLines={1}
                  className="text-[15px] font-bold text-[#0B3D62]"
                >
                  {expense.title}
                </Text>

                <Text
                  numberOfLines={1}
                  className="mt-1 text-[12px] text-[#8A9CAF]"
                >
                  {expense.meta}
                </Text>
              </View>

              {/* Amount */}
              <View className="ml-3 items-end">
                <Text className="mb-1 text-[11px] text-[#91A2B3]">
                  {expense.date}
                </Text>

                <Text
                  className={`text-[16px] font-extrabold ${expense.amountColor}`}
                >
                  {expense.amount}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color="#9AAAB9"
                className="ml-2"
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}