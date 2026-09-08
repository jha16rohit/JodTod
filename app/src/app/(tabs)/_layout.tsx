import { Tabs, useRouter } from "expo-router";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

function CustomTabBar({ state, navigation }: any) {
  const router = useRouter();

const tabs = [
  {
    name: "index",
    label: "Home",
    icon: "home",
  },
  {
    name: "groups",
    label: "Groups",
    icon: "people",
  },
  {
    name: "activity",
    label: "Activity",
    icon: "document-text",
  },
{
  name: "settle",
  label: "Settle",
  icon: "paper-plane",
},
];

  const renderTab = (tab: any) => {
    const routeIndex = state.routes.findIndex(
      (route: any) => route.name === tab.name
    );

    const isFocused = state.index === routeIndex;

    return (
      <TouchableOpacity
        key={tab.name}
        activeOpacity={0.7}
        onPress={() => navigation.navigate(tab.name)}
        className="flex-1 items-center justify-center"
      >
        <View className="items-center justify-center">
          <Ionicons
            name={tab.icon as keyof typeof Ionicons.glyphMap}
            size={24}
            color={isFocused ? "#0E8074" : "#8A94A6"}
          />

          <Text
            className={`mt-1 text-[11px] ${
              isFocused
                ? "font-bold text-[#0E8074]"
                : "font-medium text-[#8A94A6]"
            }`}
          >
            {tab.label}
          </Text>

          {isFocused && (
            <View className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#0E8074]" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="absolute bottom-5 left-4 right-4 z-50">

      {/* FLOATING NAVIGATION CONTAINER */}
      <View className="h-[78px] overflow-visible rounded-[30px]">

        {/* GLASS / BLUR LAYER */}
        <BlurView
          intensity={85}
          tint="light"
          className="absolute inset-0 rounded-[30px] border border-white/80 bg-white/80"
        />

        {/* SOFT WHITE GLASS SURFACE */}
        <View className="absolute inset-0 rounded-[30px] border border-[#E8EEF0] bg-white/90" />

        {/* NAV ITEMS */}
        <View className="h-[78px] flex-row items-center px-2">

          {/* HOME */}
          <View className="flex-1">
            {renderTab(tabs[0])}
          </View>

          {/* GROUPS */}
          <View className="flex-1">
            {renderTab(tabs[1])}
          </View>

          {/* CENTER GAP */}
          <View className="w-[72px]" />

          {/* ACTIVITY */}
          <View className="flex-1">
            {renderTab(tabs[2])}
          </View>

          {/* PROFILE */}
          <View className="flex-1">
            {renderTab(tabs[3])}
          </View>

        </View>

        {/* CENTER PLUS BUTTON */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/add-expense" as any)}
          className="absolute left-1/2 top-[-22px] z-[100] h-[68px] w-[68px] -translate-x-1/2 rounded-full"
        >
          <View className="h-[68px] w-[68px] items-center justify-center rounded-full border-[4px] border-white bg-[#FF6A4D] shadow-xl">
            <LinearGradient
              colors={["#FF8A5B", "#FF5A36"]}
              className="absolute inset-0 rounded-full"
            />

            <Ionicons
              name="add"
              size={34}
              color="#FFFFFF"
            />
          </View>
        </TouchableOpacity>

      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
        }}
      />

      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
        }}
      />

      <Tabs.Screen
        name="settle"
        options={{
          title: "Settle",
        }}
      />
    </Tabs>
  );
}