import { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';

export default function AnimatedIntro() {
  const router = useRouter();

  const dividerOpacity = useSharedValue(0);
  const dividerScale = useSharedValue(0.5);

  const circleOpacity = useSharedValue(0);
  const circleScale = useSharedValue(0.8);

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

// 2. circle
circleOpacity.value = withDelay(
  600,
  withTiming(1, { duration: 600 })
);

circleScale.value = withDelay(
  600,
  withTiming(1, {
    duration: 600,
    easing: Easing.out(Easing.exp),
  })
);

// 3. people-money
peopleOpacity.value = withDelay(
  1200,
  withTiming(1, { duration: 600 })
);

peopleTranslateY.value = withDelay(
  1200,
  withTiming(0, { duration: 600 })
);

// 4. JodTod
textOpacity.value = withDelay(
  1800,
  withTiming(1, { duration: 600 })
);

textTranslateY.value = withDelay(
  1800,
  withTiming(0, { duration: 600 })
);

// 5. tagline
taglineOpacity.value = withDelay(
  2400,
  withTiming(1, { duration: 600 })
);

// Navigate after everything
const timeout = setTimeout(() => {
  router.replace("/onboarding");
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
    <View style={styles.container}>
      <View style={styles.mark}>
        
        <Animated.Image
          source={require('../../../assets/images/jodtod/divided-sign.png')}
          style={[styles.divider, dividerStyle]}
          resizeMode="contain"
        />
        <Animated.Image
          source={require('../../../assets/images/jodtod/people-money.png')}
          style={[styles.people, peopleStyle]}
          resizeMode="contain"
        />
      </View>
      <Animated.Image
        source={require('../../../assets/images/jodtod/jodtod-text.png')}
        style={[styles.text, textStyle]}
        resizeMode="contain"
      />
      <Animated.Image
        source={require('../../../assets/images/jodtod/tagline.png')}
        style={[styles.tagline, taglineStyle]}
        resizeMode="contain"
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mark: {
    width: 340,
    height: 340,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },

  divider: {
    position: 'absolute',
    width: 130,
    height: 130,
    top: 25,

  },

  people: {
    position: 'absolute',
    width: 420,
    height: 520,
    
  },

  text: {
    width: 360,
    height: 110,
    top: -70,
    zIndex: 30,
  },

  tagline: {
    position: 'absolute',
    width: 290,
    height: 50,
    bottom: 230,
    zIndex: 20,
  },

  content: {
    marginTop: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0B3D62',
    marginBottom: 10,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },

  button: {
    marginTop: 40,
    backgroundColor: '#FF5722',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 10,
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});