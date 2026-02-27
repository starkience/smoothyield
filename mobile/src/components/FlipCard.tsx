import React, { useRef, useState } from "react";
import { Animated, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  height: number;
  style?: ViewStyle;
}

/**
 * A card that flips 180° on tap to reveal the back face.
 * Uses opacity cross-fade at the midpoint for reliable cross-platform rendering
 * (avoids Android `backfaceVisibility` bugs).
 */
export const FlipCard: React.FC<FlipCardProps> = ({ front, back, height, style }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const flip = () => {
    const toValue = isFlipped ? 0 : 1;
    Animated.spring(anim, {
      toValue,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start(() => setIsFlipped((f) => !f));
  };

  // Rotation: front 0→180, back 180→360
  const frontRotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backRotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  // Opacity snaps at the midpoint so neither face bleeds through
  const frontOpacity = anim.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = anim.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={flip}
      style={[styles.container, { height }, style]}
    >
      {/* Front */}
      <Animated.View
        style={[
          styles.face,
          { transform: [{ rotateY: frontRotate }], opacity: frontOpacity },
        ]}
      >
        {front}
      </Animated.View>

      {/* Back */}
      <Animated.View
        style={[
          styles.face,
          styles.faceBack,
          { transform: [{ rotateY: backRotate }], opacity: backOpacity },
        ]}
      >
        {back}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: "hidden",
  },
  faceBack: {
    backfaceVisibility: "hidden",
  },
});
