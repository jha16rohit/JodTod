import React from 'react';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import AuthLoadingScreen from '../../components/auth/AuthLoadingScreen';
import { AddActionBottomSheet } from '../../components/AddActionBottomSheet';

function isGroupsSubScreen(routeName: string) {
  return routeName.startsWith('groups/') && routeName !== 'groups/index' && routeName !== 'groups/[id]/index';
}

const EXTRA_HIDDEN_ROUTES = ['add-expense'];

function shouldHideTabBar(routeName: string | undefined) {
  if (!routeName) return false;
  if (isGroupsSubScreen(routeName)) return true;
  if (EXTRA_HIDDEN_ROUTES.includes(routeName)) return true;
  return false;
}

function CustomTabBar({ state, navigation, onAddActionPress }: any) {
  const router = useRouter();

  const tabs = [
    { name: 'index', label: 'Home', icon: 'home' },
    { name: 'groups/index', label: 'Groups', icon: 'people' },
    { name: 'activity', label: 'Activity', icon: 'document-text' },
    { name: 'settle', label: 'Settle', icon: 'paper-plane' },
  ];

  const focusedRouteName = state.routes[state.index]?.name as string | undefined;

  if (shouldHideTabBar(focusedRouteName)) {
    return null;
  }

  const isHomeScreen = focusedRouteName === 'index';

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
            color={isFocused ? '#0E8074' : '#8A94A6'}
          />

          <Text
            className={`mt-1 text-[11px] ${
              isFocused ? 'font-bold text-[#0E8074]' : 'font-medium text-[#8A94A6]'
            }`}
          >
            {tab.label}
          </Text>

          {isFocused && <View className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#0E8074]" />}
        </View>
      </TouchableOpacity>
    );
  };

  const handleAddButtonPress = () => {
    if (isHomeScreen) {
      onAddActionPress();
    } else {
      router.push('/add-expense' as any);
    }
  };

  return (
    <View className="absolute bottom-5 left-4 right-4 z-50">
      <View className="h-[78px] overflow-visible rounded-[30px]">
        <BlurView
          intensity={85}
          tint="light"
          className="absolute inset-0 rounded-[30px] border border-white/80 bg-white/80"
        />

        <View className="absolute inset-0 rounded-[30px] border border-[#E8EEF0] bg-white/90" />

        <View className="h-[78px] flex-row items-center px-2">
          <View className="flex-1">{renderTab(tabs[0])}</View>
          <View className="flex-1">{renderTab(tabs[1])}</View>

          <View className="w-[72px]" />

          <View className="flex-1">{renderTab(tabs[2])}</View>
          <View className="flex-1">{renderTab(tabs[3])}</View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleAddButtonPress}
          className="absolute left-1/2 top-[-22px] z-[100] h-[68px] w-[68px] -translate-x-1/2 rounded-full"
        >
          <View className="h-[68px] w-[68px] items-center justify-center rounded-full border-[4px] border-white bg-[#FF6A4D] shadow-xl">
            <LinearGradient colors={['#FF8A5B', '#FF5A36']} className="absolute inset-0 rounded-full" />
            <Ionicons name="add" size={34} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { isLoading, isAuthenticated, isVerificationPending } = useAuth();
  const [sheetVisible, setSheetVisible] = React.useState(false);

  const handleAddActionPress = React.useCallback(() => {
    // Only triggered on Home screen (index)
    setSheetVisible(true);
  }, []);

  const handleSheetClose = React.useCallback(() => {
    setSheetVisible(false);
  }, []);

  const handleAddExpense = React.useCallback(() => {
    setSheetVisible(false);
    console.log('Add Expense pressed');
  }, []);

  const handleAddSettlement = React.useCallback(() => {
    setSheetVisible(false);
    console.log('Add Settlement pressed');
  }, []);

  const handleAddMember = React.useCallback(() => {
    setSheetVisible(false);
    console.log('Add Member pressed');
  }, []);

  const handleScanReceipt = React.useCallback(() => {
    setSheetVisible(false);
    console.log('Scan Receipt pressed - Coming Soon');
  }, []);

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
    <>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} onAddActionPress={handleAddActionPress} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="groups/index" options={{ title: 'Groups' }} />
        <Tabs.Screen name="groups/create" options={{ title: 'Create Group' }} />
        <Tabs.Screen name="groups/[id]/index" options={{ title: 'Group Details' }} />
        <Tabs.Screen name="groups/[id]/members" options={{ title: 'Members' }} />
        <Tabs.Screen name="groups/[id]/expenses" options={{ title: 'Expenses' }} />
        <Tabs.Screen name="groups/[id]/settings" options={{ title: 'Group Settings' }} />
        <Tabs.Screen name="groups/[id]/invite" options={{ title: 'Invite Members' }} />
        <Tabs.Screen name="groups/[id]/edit" options={{ title: 'Edit Group' }} />
        <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
        <Tabs.Screen name="settle" options={{ title: 'Settle' }} />
      </Tabs>

      {/* Global Add Action Bottom Sheet - shown when "+" pressed on Home screen only */}
      <AddActionBottomSheet
        visible={sheetVisible}
        groupName="Goa Trip"
        onClose={handleSheetClose}
        onAddExpense={handleAddExpense}
        onAddSettlement={handleAddSettlement}
        onAddMember={handleAddMember}
        onScanReceipt={handleScanReceipt}
      />
    </>
  );
}