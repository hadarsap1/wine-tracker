import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

interface RatingInputProps {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
}

const STAR_COLOR = "#FFD700";

export default function RatingInput({
  value,
  onChange,
  size = 28,
}: RatingInputProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const icon = star <= value ? "star" : "star-outline";
        if (onChange) {
          return (
            <Pressable
              key={star}
              onPress={() => onChange(star)}
              hitSlop={4}
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
    gap: 2,
  },
});
