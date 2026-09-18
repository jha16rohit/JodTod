import { Redirect, Tabs, useRouter } from "expo-router";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import AuthLoadingScreen from "../../components/auth/AuthLoadingScreen";

// ---------------------------------------------------------------------------
// Routes where the floating tab bar (Home / Groups / Activity / Settle + the
// center "+" button) should be completely hidden — full-screen sub-pages
// like Create Group, Group Details, Members, Expenses, Settings, Invite,
// Edit. Pressing back always lands the user back on "groups/index", where
// the bar re-appears automatically.
//
// A route is hidden if its name is exactly listed here, OR it lives under
// "groups/" but is NOT the groups list itself ("groups/index").
// ---------------------------------------------------------------------------

function isGroupsSubScreen(routeName: string) {
  return routeName.startsWith("groups/") && routeName !== "groups/index";
}

const EXTRA_HIDDEN_ROUTES = ["add-expense"];

function shouldHideTabBar(routeName: string | undefined) {
  if (!routeName) return false;
  if (isGroupsSubScreen(routeName)) return true;
  if (EXTRA_HIDDEN_ROUTES.includes(routeName)) return true;
  return false;
}

function CustomTabBar({ state, navigation }: any) {
  const router = useRouter();

  const tabs = [
    { name: "index", label: "Home", icon: "home" },
    { name: "groups/index", label: "Groups", icon: "people" },
    { name: "activity", label: "Activity", icon: "document-text" },
    { name: "settle", label: "Settle", icon: "paper-plane" },
  ];

  // Current focused leaf route, e.g. "index", "groups/index",
  // "groups/create", "groups/[id]/members", "activity"...
  const focusedRouteName = state.routes[state.index]?.name as string | undefined;

  // Bail out completely on any screen we don't want the bar on — nothing
  // is rendered, so it doesn't reserve space or sit behind the content
  // (the bar is an absolutely-positioned floating pill, not a fixed
  // reserved area, so hiding it costs nothing layout-wise).
  if (shouldHideTabBar(focusedRouteName)) {
    return null;
  }

  const renderTab = (tab: any) => {
    const routeIndex = state.routes.findIndex((route: any) => route.name === tab.name);
    const isFocused = state.index === routeIndex;

    const handlePress = () => {
      navigation.navigate(tab.name);
    };

    return (
      <TouchableOpacity
        key={tab.name}
        activeOpacity={0.7}
        onPress={handlePress}
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
              isFocused ? "font-bold text-[#0E8074]" : "font-medium text-[#8A94A6]"
            }`}
          >
            {tab.label}
          </Text>

          {isFocused && <View className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#0E8074]" />}
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

        <View className="absolute inset-0 rounded-[30px] border border-[#E8EEF0] bg-white/90" />

        <View className="h-[78px] flex-row items-center px-2">
          {/* HOME */}
          <View className="flex-1">{renderTab(tabs[0])}</View>

          {/* GROUPS */}
          <View className="flex-1">{renderTab(tabs[1])}</View>

          <View className="w-[72px]" />

          {/* ACTIVITY */}
          <View className="flex-1">{renderTab(tabs[2])}</View>

          {/* SETTLE */}
          <View className="flex-1">{renderTab(tabs[3])}</View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/add-expense" as any)}
          className="absolute left-1/2 top-[-22px] z-[100] h-[68px] w-[68px] -translate-x-1/2 rounded-full"
        >
          <View className="h-[68px] w-[68px] items-center justify-center rounded-full border-[4px] border-white bg-[#FF6A4D] shadow-xl">
            <LinearGradient colors={["#FF8A5B", "#FF5A36"]} className="absolute inset-0 rounded-full" />
            <Ionicons name="add" size={34} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { isLoading, isAuthenticated, isVerificationPending } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen message="Loading your account…" />;
  }

  if (!isAuthenticated && !isVerificationPending) {
    return <Redirect href="/login" />;
  }

  if (isVerificationPending) {
    return <Redirect href="/verify-email" />;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="groups/index" options={{ title: "Groups" }} />
      <Tabs.Screen name="groups/create" options={{ title: "Create Group" }} />
      <Tabs.Screen name="groups/[id]/index" options={{ title: "Group Details" }} />
      <Tabs.Screen name="groups/[id]/members" options={{ title: "Members" }} />
      <Tabs.Screen name="groups/[id]/expenses" options={{ title: "Expenses" }} />
      <Tabs.Screen name="groups/[id]/settings" options={{ title: "Group Settings" }} />
      <Tabs.Screen name="groups/[id]/invite" options={{ title: "Invite Members" }} />
      <Tabs.Screen name="groups/[id]/edit" options={{ title: "Edit Group" }} />
      <Tabs.Screen name="activity" options={{ title: "Activity" }} />
      <Tabs.Screen name="settle" options={{ title: "Settle" }} />
    </Tabs>
  );
}