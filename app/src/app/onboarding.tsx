import { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    image: require('../../assets/images/jodtod/split-expenses.png'),
    title: 'Split expenses easily',
    subtitle:
      'Add every expense as it happens, split bills fairly among friends, and always know exactly who owes what — no more awkward money talk.',
  },
  {
    id: '2',
    image: require('../../assets/images/jodtod/plan-trips.png'),
    title: 'Plan trips together',
    subtitle:
      'Create a trip, invite your friends, and manage flights, stays, and activities all in one place — planning has never been this smooth.',
  },
  {
    id: '3',
    image: require('../../assets/images/jodtod/settle-up.png'),
    title: 'Settle up, stress free',
    subtitle:
      'See exactly who owes whom at a glance, and settle every group expense in a few taps — clean, simple, and drama free.',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLastSlide = activeIndex === slides.length - 1;

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({
      x: index * width,
      animated: true,
    });

    setActiveIndex(index);
  };

  const handleScroll = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const index = Math.round(
      e.nativeEvent.contentOffset.x / width
    );

    setActiveIndex(index);
  };

  const handleNext = () => {
    if (isLastSlide) {
      router.push('/login');
    } else {
      goToSlide(activeIndex + 1);
    }
  };

  const handleSkip = () => {
    router.push('/login');
  };

  return (
    <ImageBackground
      source={require('../../assets/images/jodtod/background_onboarding.png')}
      resizeMode="cover"
      className="flex-1"
    >
      <View className="flex-1">

        {/* ================= CONTENT ================= */}

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
        >
          {slides.map((slide) => (
            <View
              key={slide.id}
              style={{ width }}
              className="flex-1 items-center justify-center px-7"
            >
              <Image
                source={slide.image}
                style={{
                  width: width * 0.85,
                  height: width * 0.85,
                }}
                className="mb-6"
                resizeMode="contain"
              />

              <Text className="mb-3 text-center text-[22px] font-bold text-[#0B3D62]">
                {slide.title}
              </Text>

              <Text className="px-2 text-center text-sm leading-[21px] text-[#666]">
                {slide.subtitle}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* ================= BOTTOM CONTROLS ================= */}

        <View className="flex-row items-center justify-between px-7 pb-10 pt-4">

          {/* ================= SKIP ================= */}

          <TouchableOpacity
            onPress={handleSkip}
            activeOpacity={0.85}
            className="overflow-hidden rounded-[16px]"
          >
            <View
              className="
                min-w-[80px]
                overflow-hidden
                rounded-[16px]
                border
                border-white/60
              "
            >

              {/* Blur */}
              <BlurView
  intensity={75}
  tint="light"
  className="absolute inset-0"
/>

<View className="absolute inset-0 bg-[#00A83B]/75" />

             

              <View className="items-center justify-center px-6 py-3">
                <Text className="text-[15px] text-white font-bold text-[#0B3D62]">
                  Skip
                </Text>
              </View>

            </View>
          </TouchableOpacity>


          {/* ================= PAGINATION ================= */}

          <View className="flex-row items-center gap-2">

            {slides.map((_, index) => (
              <View
                key={index}
                className={
                  index === activeIndex
                    ? 'h-2.5 w-8 rounded-full bg-[#FF6A4D]/75'
                    : 'h-2.5 w-2.5 rounded-full border border-white/70 bg-white/55'
                }
              />
            ))}

          </View>


          {/* ================= NEXT / GET STARTED ================= */}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNext}
            className="overflow-hidden rounded-[16px]"
          >
            <View
              className="
                min-w-[90px]
                overflow-hidden
                rounded-[16px]
                border
                border-white/85
              "
            >

           {/* Blur */}
<BlurView
  intensity={75}
  tint="light"
  className="absolute inset-0"
/>

{/* Blue glass background */}
<View className="absolute inset-0 bg-[#0064D8]/70" />
            

             

              <View className="items-center justify-center px-6 py-3">
                <Text className="whitespace-nowrap text-[15px] font-bold text-white">
                  {isLastSlide ? 'Get Started' : 'Next'}
                </Text>
              </View>

            </View>
          </TouchableOpacity>

        </View>

      </View>
    </ImageBackground>
  );
}