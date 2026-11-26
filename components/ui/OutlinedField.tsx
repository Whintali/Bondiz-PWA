import { COLORS } from "@/constants/Colors";
import { DESIGN } from "@/constants/Design";
import { FONTS } from "@/constants/Fonts";
import { Image } from "expo-image";
import React, { useState } from "react";
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View, ViewStyle } from "react-native";

type Props = TextInputProps & {
  label?: string;
  // "light" : sur fond violet (contour et texte blancs) ; "dark" : sur fond blanc (violet).
  tone?: "light" | "dark";
  width?: number;
  // Décalage de l'étiquette depuis le bord gauche du champ.
  labelOffset?: number;
  containerStyle?: StyleProp<ViewStyle>;
};

// Champ de la maquette : pilule à contour de 2 px, étiquette posée sur le
// bord supérieur (le fond de l'étiquette masque le trait).
export default function OutlinedField({
  label,
  tone = "light",
  width = 247,
  labelOffset = 33,
  containerStyle,
  secureTextEntry,
  ...props
}: Props) {
  const [hidden, setHidden] = useState(true);
  const color = tone === "light" ? "white" : COLORS.purple;
  const background = tone === "light" ? COLORS.purple : "white";

  return (
    <View style={[styles.container, { width }, containerStyle]}>
      <View style={[styles.field, { borderColor: color }]}>
        <TextInput
          // L'étiquette est un texte à part : on la donne aussi comme nom accessible.
          accessibilityLabel={label ?? props.placeholder}
          {...props}
          secureTextEntry={secureTextEntry && hidden}
          placeholderTextColor={tone === "light" ? COLORS.border : COLORS.muted}
          style={[styles.input, { color: tone === "light" ? "white" : COLORS.ink }]}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setHidden((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Afficher le mot de passe" : "Masquer le mot de passe"}
            style={styles.eye}
          >
            <Image source={DESIGN.iconHide} style={styles.eyeIcon} contentFit="contain" />
          </TouchableOpacity>
        )}
      </View>
      {label ? (
        <View style={[styles.labelWrap, { backgroundColor: background, left: labelOffset }]}>
          <Text style={[styles.label, { color }]}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    paddingTop: 8,
  },
  field: {
    height: 42,
    borderWidth: 2,
    borderRadius: 100,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    paddingVertical: 0,
    outlineStyle: "none",
  } as any,
  eye: {
    padding: 4,
  },
  eyeIcon: {
    width: 18,
    height: 18,
  },
  labelWrap: {
    position: "absolute",
    top: 0,
    paddingHorizontal: 9,
    height: 17,
    justifyContent: "center",
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
  },
});
