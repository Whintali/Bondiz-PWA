import { DESIGN } from "@/constants/Design";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";

type Props = {
  // "light" : chevron blanc, pour les fonds violets ou les photos ;
  // "dark" : chevron noir, pour les fonds clairs.
  tone?: "light" | "dark";
  size?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

// Cercle gris clair avec un chevron « < » au centre.
export default function BackButton({ tone = "light", size = 45, onPress, style }: Props) {
  const router = useRouter();
  const icon = size * (20 / 45);

  return (
    <TouchableOpacity
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace("/home")))}
      accessibilityRole="button"
      accessibilityLabel="Retour"
      style={[{ width: size, height: size }, styles.center, style]}
    >
      <Image source={tone === "light" ? DESIGN.backCircleWhite : DESIGN.backCircleLight} style={StyleSheet.absoluteFill} />
      <Image
        source={tone === "light" ? DESIGN.iconLessThanWhite : DESIGN.iconLessThanBlack}
        style={{ width: icon, height: icon }}
        contentFit="contain"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});
