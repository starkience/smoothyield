import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { colors, spacing } from "../theme";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = SCREEN_W - spacing.md * 2;
const CARD_H = CARD_W * 0.58; // standard credit-card ratio ≈ 1.586

interface Props {
  front: React.ReactNode;
  back: React.ReactNode;
}

export const FlipCard: React.FC<Props> = ({ front, back }) => {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);

  const flip = () => {
    Animated.spring(flipAnim, {
      toValue: flipped ? 0 : 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
    setFlipped((f) => !f);
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["0deg", "90deg", "180deg"],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["180deg", "270deg", "360deg"],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <TouchableWithoutFeedback onPress={flip}>
      <View style={[styles.container, { height: CARD_H }]}>
        <Animated.View
          style={[
            styles.face,
            { width: CARD_W, height: CARD_H },
            { transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }], opacity: frontOpacity },
          ]}
        >
          {front}
        </Animated.View>

        <Animated.View
          style={[
            styles.face,
            styles.back,
            { width: CARD_W, height: CARD_H },
            { transform: [{ perspective: 1000 }, { rotateY: backInterpolate }], opacity: backOpacity },
          ]}
        >
          {back}
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    width: CARD_W,
    marginBottom: spacing.lg,
  },
  face: {
    position: "absolute",
    borderRadius: 16,
    backfaceVisibility: "hidden",
    overflow: "hidden",
  },
  back: {},
});
