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
} from 'react-native';
import { useRouter } from 'expo-router';

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
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setActiveIndex(index);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
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
    <View className="flex-1 bg-white">
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
              style={{ width: width * 0.85, height: width * 0.85 }}
              className="mb-6"
              resizeMode="contain"
            />
            <Text className="text-[22px] font-bold text-[#0B3D62] mb-3 text-center">
              {slide.title}
            </Text>
            <Text className="text-sm text-[#666] text-center leading-[21px] px-2">
              {slide.subtitle}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View className="flex-row items-center justify-between px-7 pb-10 pt-4">
        <TouchableOpacity onPress={handleSkip}>
          <Text className="text-[15px] font-semibold text-[#20A374]">Skip</Text>
        </TouchableOpacity>

        <View className="flex-row gap-1.5">
          {slides.map((_, index) => (
            <View
              key={index}
              className={
                index === activeIndex
                  ? 'h-2 w-5 rounded-full bg-[#20A374]'
                  : 'h-2 w-2 rounded-full bg-[#D9D9D9]'
              }
            />
          ))}
        </View>

        <TouchableOpacity
          className="bg-[#20A374] py-3 px-6 rounded-[10px] min-w-[100px] items-center"
          onPress={handleNext}
        >
          <Text className="text-white text-[15px] font-semibold">
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}