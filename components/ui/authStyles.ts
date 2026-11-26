// Écrans violets de compte (mot de passe oublié, réinitialisation).
import { COLORS } from "@/constants/Colors";
import { FONTS } from "@/constants/Fonts";
import { StyleSheet } from "react-native";

export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.purple,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 34,
  },
  body: {
    marginTop: 80,
    alignItems: "center",
    gap: 24,
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 26,
    color: "white",
    textAlign: "center",
  },
  text: {
    maxWidth: 300,
    fontFamily: FONTS.medium,
    fontSize: 15,
    lineHeight: 22,
    color: "white",
    textAlign: "center",
  },
  button: {
    marginTop: 8,
  },
  errorText: {
    color: "white",
    backgroundColor: "rgba(0, 0, 36, 0.25)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    fontFamily: FONTS.medium,
    fontSize: 13,
    textAlign: "center",
    maxWidth: 300,
  },
});
