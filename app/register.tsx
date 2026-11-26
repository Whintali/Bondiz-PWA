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

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleRegister = () => {
    if (!email || !password || !confirmPassword) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au minimum 8 caractères");
      return;
    }

    const digits = phone.replace(/\D/g, "");
    if (phone && digits.length < 9) {
      setError("Le numéro de téléphone est invalide");
      return;
    }

    // Le compte est créé à la fin du questionnaire, avec le profil complet.
    router.push({
      pathname: "/questionnaire",
      params: { email, password, phone: digits },
    });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 76 }]}>
          <HeroIllustration scale={0.577} />
        </View>

        <View style={styles.sheet}>
          <TouchableOpacity style={styles.backRow} onPress={() => router.replace("/login")}>
            <BackButton tone="dark" size={32} onPress={() => router.replace("/login")} />
            <Text style={styles.backText}>Retourner sur la page de connexion</Text>
          </TouchableOpacity>

          <Text style={styles.title}>S’INSCRIRE</Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.form}>
            <OutlinedField
              tone="dark"
              width={298}
              labelOffset={53}
              label="Adresse mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <OutlinedField
              tone="dark"
              width={298}
              labelOffset={53}
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
            <OutlinedField
              tone="dark"
              width={298}
              labelOffset={53}
              label="Confirmer le mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
            />
            <OutlinedField
              tone="dark"
              width={298}
              labelOffset={53}
              label="Numéro de téléphone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </View>

          <ShadowButton label="S’inscrire" onPress={handleRegister} style={styles.submit} />
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
  },
  hero: {
    alignItems: "center",
    paddingBottom: 62,
  },
  sheet: {
    flexGrow: 1,
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
    paddingBottom: 54,
    alignItems: "center",
  },
  backRow: {
    alignSelf: "flex-start",
    marginLeft: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  backText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.muted,
  },
  title: {
    marginTop: 25,
    fontFamily: FONTS.extraBold,
    fontSize: 20,
    color: "black",
  },
  form: {
    marginTop: 22,
    gap: 24,
  },
  submit: {
    marginTop: 30,
  },
  errorText: {
    marginTop: 12,
    color: COLORS.error,
    fontFamily: FONTS.medium,
    fontSize: 13,
    textAlign: "center",
    maxWidth: 300,
  },
});
