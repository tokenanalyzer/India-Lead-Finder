import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';

interface Props {
  onDone: () => void;
}

export function AppSplash({ onDone }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 700, useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1, duration: 700, useNativeDriver: false,
        }),
      ]),
      Animated.timing(taglineFade, {
        toValue: 1, duration: 400, delay: 50, useNativeDriver: false,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0, duration: 400, useNativeDriver: false,
      }).start(() => onDone());
    }, 2600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.title}>
          <Text style={styles.titleData}>Data </Text>
          <Text style={styles.titleAi}>Ai</Text>
        </Text>
      </Animated.View>
      <Animated.Text style={[styles.tagline, { opacity: taglineFade }]}>
        Scrape Data. Unlock Insights.
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050A2B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  content: {
    alignItems: 'center',
    gap: 22,
  },
  icon: {
    width: 110,
    height: 110,
    borderRadius: 26,
  },
  title: {
    lineHeight: 56,
  },
  titleData: {
    fontFamily: 'Inter_700Bold',
    fontSize: 48,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  titleAi: {
    fontFamily: 'Inter_700Bold',
    fontSize: 48,
    color: '#4F8AFF',
    letterSpacing: 1.5,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6B82A8',
    letterSpacing: 0.8,
  },
});
