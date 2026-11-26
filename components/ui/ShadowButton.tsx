import { COLORS } from "@/constants/Colors";
import { FONTS } from "@/constants/Fonts";
import React from "react";
import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "yellow" | "white";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Bouton principal de la maquette : pilule pleine avec une ombre noire
// décalée (2 px à droite, 3 px en bas), sans flou.
export default function ShadowButton({ label, onPress, variant = "yellow", loading, disabled, style }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      style={[styles.wrapper, (disabled || loading) && styles.disabled, style]}
    >
      <View style={styles.shadow} />
      <View style={[styles.face, { backgroundColor: variant === "yellow" ? COLORS.yellow : "white" }]}>
        {loading ? <ActivityIndicator color={COLORS.ink} /> : <Text style={styles.label}>{label}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 249,
    height: 45,
    alignSelf: "center",
  },
  shadow: {
    position: "absolute",
    left: 2,
    top: 3,
    width: 247,
    height: 42,
    borderRadius: 100,
    backgroundColor: "black",
  },
  face: {
    width: 247,
    height: 42,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: "black",
  },
  disabled: {
    opacity: 0.5,
  },
});
