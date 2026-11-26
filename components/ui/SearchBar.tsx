import { COLORS } from "@/constants/Colors";
import { FONTS } from "@/constants/Fonts";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TextInput, View } from "react-native";

// Barre de recherche blanche en pilule, loupe violette à droite.
export default function SearchBar({ value, onChangeText }: { value: string; onChangeText: (text: string) => void }) {
  return (
    <View style={styles.bar}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Recherche"
        placeholderTextColor="rgba(0, 0, 36, 0.3)"
        style={styles.input}
        accessibilityLabel="Rechercher"
      />
      <Feather name="search" size={16} color={COLORS.purple} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 34,
    borderRadius: 9999,
    backgroundColor: "white",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    boxShadow: "0px 4px 4px rgba(163, 163, 163, 0.2)",
  },
  input: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.ink,
    paddingVertical: 0,
    outlineStyle: "none",
  } as any,
});
