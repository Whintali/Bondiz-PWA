import { COLORS } from "@/constants/Colors";
import { DESIGN } from "@/constants/Design";
import { FONTS } from "@/constants/Fonts";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Pictogrammes de la maquette, associés aux centres d'intérêt qui en ont un.
const ICONS: Record<string, any> = {
  musculation: DESIGN.iconStrength,
  yoga: DESIGN.iconYoga,
  cuisine: DESIGN.iconStreetFood,
  chant: DESIGN.iconMicro,
};

const iconFor = (name: string) => ICONS[name.trim().toLowerCase()];

type Props = {
  label: string;
  size?: "regular" | "small";
  // "light" : texte blanc sur fond violet ; "dark" : texte noir sur fond clair.
  tone?: "light" | "dark";
  selected?: boolean;
  onPress?: () => void;
};

// Puce à contour gris clair, avec un pictogramme quand il en existe un.
export default function InterestChip({ label, size = "regular", tone = "dark", selected, onPress }: Props) {
  const small = size === "small";
  // Les pictos sont violets : invisibles sur le fond violet, la maquette n'en met pas.
  const icon = tone === "light" ? undefined : iconFor(label);
  const content = (
    <View
      style={[
        styles.chip,
        small && styles.chipSmall,
        selected && (tone === "light" ? styles.selectedLight : styles.selectedDark),
      ]}
    >
      {icon ? <Image source={icon} style={small ? styles.iconSmall : styles.icon} contentFit="contain" /> : null}
      <Text
        style={[
          styles.label,
          small && styles.labelSmall,
          { color: tone === "light" ? (selected ? COLORS.purple : "white") : "black" },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return content;
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="checkbox" aria-checked={!!selected}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 38,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 100,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipSmall: {
    height: 26,
    paddingHorizontal: 7,
  },
  selectedLight: {
    backgroundColor: "white",
    borderColor: "white",
  },
  selectedDark: {
    borderColor: COLORS.purple,
  },
  icon: {
    width: 18,
    height: 18,
  },
  iconSmall: {
    width: 13,
    height: 13,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
  },
  labelSmall: {
    fontSize: 11,
  },
});
