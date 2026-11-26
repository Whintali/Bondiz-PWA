import BackButton from "@/components/ui/BackButton";
import HeroIllustration from "@/components/ui/HeroIllustration";
import OutlinedField from "@/components/ui/OutlinedField";
import ShadowButton from "@/components/ui/ShadowButton";
import { COLORS } from "@/constants/Colors";
import { FONTS } from "@/constants/Fonts";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await login(email, password);
      router.replace("/");
    } catch (err: any) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackButton style={styles.back} onPress={() => router.replace("/welcome")} />

        <HeroIllustration />

        <View style={styles.form}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          <OutlinedField
            label="Adresse mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <OutlinedField
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            onPress={() => router.push({ pathname: "/forgot-password", params: email ? { email } : {} })}
            accessibilityRole="link"
            style={styles.forgot}
          >
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <ShadowButton label="Connexion" onPress={handleLogin} loading={isSubmitting} style={styles.submit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.purple,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  back: {
    position: "absolute",
    left: 34,
    top: 36,
  },
  form: {
    marginTop: 59,
    gap: 24,
    alignItems: "center",
  },
  submit: {
    marginTop: 2,
  },
  forgot: {
    marginTop: -12,
    alignSelf: "flex-end",
  },
  forgotText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: "white",
    textDecorationLine: "underline",
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
