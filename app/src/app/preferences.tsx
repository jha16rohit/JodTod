import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Preferences() {
  const router = useRouter();

  const [theme, setTheme] = useState<'System' | 'Light' | 'Dark'>('System');
  const [notifications, setNotifications] = useState(true);

  return (
    <View className="flex-1">
      {/* =========================================================
          FULL SCREEN BACKGROUND
      ========================================================= */}

      <Image
        source={require('../../assets/images/jodtod/background_animation.png')}
        resizeMode="cover"
        className="absolute inset-0 h-full w-full"
      />

      {/* =========================================================
          SAFE AREA
      ========================================================= */}

      <SafeAreaView
        edges={['top', 'bottom']}
        className="flex-1 bg-transparent"
      >
        <View className="flex-1 px-5">
          {/* =====================================================
              HEADER
          ===================================================== */}

          <View className="flex-row items-center justify-between py-3">
            {/* Back button */}
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              className="h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/30"
            >
              <Ionicons
                name="arrow-back-outline"
                size={23}
                color="#0B3D62"
              />
            </TouchableOpacity>

            {/* Title */}
            <Text className="text-[22px] font-extrabold text-[#0B3D62]">
              Preferences
            </Text>

            {/* Right spacer keeps title centered */}
            <View className="h-11 w-11" />
          </View>

          {/* =====================================================
              SCROLLABLE CONTENT
          ===================================================== */}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="pb-10"
          >
            {/* ===================================================
                CURRENCY
            =================================================== */}

            <View className="mt-5 overflow-hidden rounded-[26px] border border-white/50 bg-white/35">
              <View className="flex-row items-center justify-between px-5 py-5">
                <View className="flex-1 pr-4">
                  <Text className="text-[16px] font-bold text-[#0B3D62]">
                    Currency
                  </Text>

                  <Text className="mt-1 text-[12px] text-[#4B5A66]">
                    Choose your default currency
                  </Text>
                </View>

                <View className="rounded-full border border-white/50 bg-white/45 px-4 py-2">
                  <Text className="text-[15px] font-bold text-[#14212B]">
                    INR (₹)
                  </Text>
                </View>
              </View>
            </View>

            {/* ===================================================
                THEME
            =================================================== */}

            <View className="mt-4 overflow-hidden rounded-[26px] border border-white/50 bg-white/35">
              <View className="px-5 py-5">
                <Text className="text-[16px] font-bold text-[#0B3D62]">
                  Theme
                </Text>

                <Text className="mt-1 text-[12px] text-[#4B5A66]">
                  Choose how JodTod looks
                </Text>

                {/* Theme selector */}
                <View className="mt-4 flex-row gap-3">
                  {/* SYSTEM */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setTheme('System')}
                    className={`flex-1 items-center justify-center rounded-[17px] border py-3 ${theme === 'System'
                      ? 'border-[#00B894] bg-[#00B894]/20'
                      : 'border-white/50 bg-white/30'
                      }`}
                  >
                    <Ionicons
                      name="phone-portrait-outline"
                      size={20}
                      color={
                        theme === 'System'
                          ? '#00896B'
                          : '#4B5A66'
                      }
                    />

                    <Text
                      className={`mt-1 text-[12px] font-semibold ${theme === 'System'
                        ? 'text-[#00896B]'
                        : 'text-[#4B5A66]'
                        }`}
                    >
                      System
                    </Text>
                  </TouchableOpacity>

                  {/* LIGHT */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setTheme('Light')}
                    className={`flex-1 items-center justify-center rounded-[17px] border py-3 ${theme === 'Light'
                      ? 'border-[#00B894] bg-[#00B894]/20'
                      : 'border-white/50 bg-white/30'
                      }`}
                  >
                    <Ionicons
                      name="sunny-outline"
                      size={20}
                      color={
                        theme === 'Light'
                          ? '#00896B'
                          : '#4B5A66'
                      }
                    />

                    <Text
                      className={`mt-1 text-[12px] font-semibold ${theme === 'Light'
                        ? 'text-[#00896B]'
                        : 'text-[#4B5A66]'
                        }`}
                    >
                      Light
                    </Text>
                  </TouchableOpacity>

                  {/* DARK */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setTheme('Dark')}
                    className={`flex-1 items-center justify-center rounded-[17px] border py-3 ${theme === 'Dark'
                      ? 'border-[#00B894] bg-[#00B894]/20'
                      : 'border-white/50 bg-white/30'
                      }`}
                  >
                    <Ionicons
                      name="moon-outline"
                      size={20}
                      color={
                        theme === 'Dark'
                          ? '#00896B'
                          : '#4B5A66'
                      }
                    />

                    <Text
                      className={`mt-1 text-[12px] font-semibold ${theme === 'Dark'
                        ? 'text-[#00896B]'
                        : 'text-[#4B5A66]'
                        }`}
                    >
                      Dark
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ===================================================
                NOTIFICATIONS
            =================================================== */}

            <View className="mt-4 overflow-hidden rounded-[26px] border border-white/50 bg-white/35">
              <View className="flex-row items-center justify-between px-5 py-5">
                <View className="flex-1 pr-5">
                  <Text className="text-[16px] font-bold text-[#0B3D62]">
                    Notifications
                  </Text>

                  <Text className="mt-1 text-[12px] leading-5 text-[#4B5A66]">
                    Receive expense and trip notifications
                  </Text>
                </View>

                <ToggleButton
                  checked={notifications}
                  onChange={setNotifications}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

/* ===============================================================
   TOGGLE BUTTON
=============================================================== */

function ToggleButton({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onChange(!checked)}
      className={`h-7 w-12 justify-center rounded-full px-1 ${checked ? 'bg-[#00B894]' : 'bg-[#D1D5DB]'
        }`}
    >
      <View
        className={`h-5 w-5 rounded-full bg-white ${checked ? 'self-end' : 'self-start'
          }`}
      />
    </TouchableOpacity>
  );
}