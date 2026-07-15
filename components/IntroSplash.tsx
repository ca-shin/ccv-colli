import React, { useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { homeStyles as styles } from "@/components/home/homeStyles";

const splashLogoSource = require("@/assets/images/logo-cashin2.webp");

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const shinOpacity = useRef(new Animated.Value(0)).current;
  const stageOpacity = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(shinOpacity, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.delay(400),
      Animated.timing(stageOpacity, {
        toValue: 0,
        duration: 1200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(() => onDone());
  }, [logoOpacity, onDone, shinOpacity, stageOpacity]);

  return (
    <View style={styles.splashContainer}>
      <Animated.View style={[styles.splashLogoStage, { opacity: stageOpacity }]}>
        <Animated.Image
          source={splashLogoSource}
          style={[styles.splashLogoImage, { opacity: logoOpacity }]}
          resizeMode="contain"
        />
        <View style={styles.splashShinMask} />
        <View style={styles.splashShinClip}>
          <Animated.Image
            source={splashLogoSource}
            style={[styles.splashShinImage, { opacity: shinOpacity }]}
            resizeMode="contain"
          />
        </View>
      </Animated.View>
    </View>
  );
}
