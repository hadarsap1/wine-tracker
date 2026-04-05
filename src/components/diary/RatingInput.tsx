import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@config/theme";

interface RatingInputProps {
  value: number | null;
  onChange?: (rating: number) => void;
  size?: number;
}

const STAR_COLOR = colors.gold;

export default function RatingInput({
  value,
  onChange,
  size = 28,
}: RatingInputProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const icon = value !== null && star <= value ? "star" : "star-outline";
        if (onChange) {
          return (
            <Pressable
              key={star}
              onPress={() => onChange(star)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`${star} כוכבים`}
              accessibilityState={{ selected: value !== null && star <= value }}
            >
              <MaterialCommunityIcons
                name={icon}
                size={size}
                color={STAR_COLOR}
              />
            </Pressable>
          );
        }
        return (
          <MaterialCommunityIcons
            key={star}
            name={icon}
            size={size}
            color={STAR_COLOR}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
