import { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
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
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width }]}>
            <Image source={slide.image} style={styles.image} resizeMode="contain" />
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={handleNext}>
          <Text style={styles.actionButtonText}>
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  image: {
    width: width * 0.85,
    height: width * 0.85,
    marginBottom: 24,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0B3D62',
    marginBottom: 12,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 16,
  },

  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#20A374',
  },

  dots: {
    flexDirection: 'row',
    gap: 6,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D9D9D9',
  },

  dotActive: {
    backgroundColor: '#20A374',
    width: 20,
  },

  actionButton: {
    backgroundColor: '#20A374',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },

  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});