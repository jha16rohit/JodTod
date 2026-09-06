import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';

export default function AnimatedIntro() {
  const router = useRouter();

  const dividerOpacity = useSharedValue(0);
  const dividerScale = useSharedValue(0.5);

  const peopleOpacity = useSharedValue(0);
  const peopleTranslateY = useSharedValue(20);

  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(15);

  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    // 1. divided-sign
    dividerOpacity.value = withTiming(1, { duration: 600 });
    dividerScale.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.back(1.5)),
    });

    // 2. people-money
    peopleOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
    peopleTranslateY.value = withDelay(600, withTiming(0, { duration: 600 }));

    // 3. JodTod text
    textOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));
    textTranslateY.value = withDelay(1200, withTiming(0, { duration: 600 }));

    // 4. tagline
    taglineOpacity.value = withDelay(1800, withTiming(1, { duration: 600 }));

    // Navigate after everything
    const timeout = setTimeout(() => {
      router.replace('/onboarding');
    }, 3700);

    return () => clearTimeout(timeout);
  }, []);

  const dividerStyle = useAnimatedStyle(() => ({
    opacity: dividerOpacity.value,
    transform: [{ scale: dividerScale.value }],
  }));
  const peopleStyle = useAnimatedStyle(() => ({
    opacity: peopleOpacity.value,
    transform: [{ translateY: peopleTranslateY.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <View className="flex-1 bg-white items-center justify-center">
      <View className="w-[340px] h-[340px] items-center justify-center bg-white">
        <Animated.Image
          source={require('../../../assets/images/jodtod/divided-sign.png')}
          className="absolute w-[130px] h-[130px] top-[25px]"
          style={dividerStyle}
          resizeMode="contain"
        />
        <Animated.Image
          source={require('../../../assets/images/jodtod/people-money.png')}
          className="absolute w-[420px] h-[520px]"
          style={peopleStyle}
          resizeMode="contain"
        />
      </View>
      <Animated.Image
        source={require('../../../assets/images/jodtod/jodtod-text.png')}
        className="w-[360px] h-[110px] top-[-70px] z-30"
        style={textStyle}
        resizeMode="contain"
      />
      <Animated.Image
        source={require('../../../assets/images/jodtod/tagline.png')}
        className="absolute w-[290px] h-[50px] bottom-[230px] z-20"
        style={taglineStyle}
        resizeMode="contain"
      />
    </View>
  );
}