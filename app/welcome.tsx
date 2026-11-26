import HeroIllustration from "@/components/ui/HeroIllustration";
import ShadowButton from "@/components/ui/ShadowButton";
import { COLORS } from "@/constants/Colors";
import { FONTS } from "@/constants/Fonts";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";

const WelcomeScreen = () => {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.replace("/home");
    }
  }, [user]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <HeroIllustration />

      <Text style={styles.tagline}>{"Rencontrez des personnes qui partagent vos\ncentres d’intérêt"}</Text>

      <View style={styles.buttons}>
        <ShadowButton label="Se connecter" variant="white" onPress={() => router.push("/login")} />
        <ShadowButton label="S’inscrire" onPress={() => router.push("/register")} />
      </View>
    </View>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.purple,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 45,
  },
  tagline: {
    marginTop: 46,
    width: 312,
    fontFamily: FONTS.bold,
    fontSize: 23,
    lineHeight: 32,
    color: "white",
    textAlign: "center",
  },
  buttons: {
    marginTop: 47,
    gap: 15,
  },
});
