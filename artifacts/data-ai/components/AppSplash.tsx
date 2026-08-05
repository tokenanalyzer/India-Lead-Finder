import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, ImageBackground, Dimensions,
} from 'react-native';

interface Props {
  onDone: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function AppSplash({ onDone }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const screenFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in background first, then text
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 600, useNativeDriver: false,
      }),
      Animated.timing(textFade, {
        toValue: 1, duration: 500, delay: 200, useNativeDriver: false,
      }),
    ]).start();

    // Fade out entire screen after 2.8s
    const timer = setTimeout(() => {
      Animated.timing(screenFade, {
        toValue: 0, duration: 400, useNativeDriver: false,
      }).start(() => onDone());
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.wrapper, { opacity: screenFade }]}>
      <ImageBackground
        source={require('@/assets/images/splash-bg.png')}
        style={styles.bg}
        resizeMode="cover"
      >
        {/* Dark overlay to deepen the navy */}
        <View style={styles.overlay} />

        {/* Bottom text section */}
        <Animated.View style={[styles.textSection, { opacity: textFade }]}>
          <Text style={styles.title}>
            <Text style={styles.titleData}>Data </Text>
            <Text style={styles.titleAi}>Ai</Text>
          </Text>
          <Text style={styles.tagline}>
            <Text style={styles.taglineNormal}>Scrape </Text>
            <Text style={styles.taglineHighlight}>Data</Text>
            <Text style={styles.taglineNormal}>. Unlock </Text>
            <Text style={styles.taglineHighlight}>Insights</Text>
            <Text style={styles.taglineNormal}>.</Text>
          </Text>
        </Animated.View>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#050A2B',
  },
  bg: {
    flex: 1,
    width: '100%',
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 10, 43, 0.35)',
  },
  textSection: {
    alignItems: 'center',
    paddingBottom: 90,
    gap: 10,
  },
  title: {
    lineHeight: 62,
  },
  titleData: {
    fontFamily: 'Inter_700Bold',
    fontSize: 52,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  titleAi: {
    fontFamily: 'Inter_700Bold',
    fontSize: 52,
    color: '#38BDF8',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 15,
    letterSpacing: 0.3,
  },
  taglineNormal: {
    fontFamily: 'Inter_400Regular',
    color: '#CBD5E1',
  },
  taglineHighlight: {
    fontFamily: 'Inter_600SemiBold',
    color: '#38BDF8',
  },
});
