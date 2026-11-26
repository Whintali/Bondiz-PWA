import BackButton from "@/components/ui/BackButton";
import OutlinedField from "@/components/ui/OutlinedField";
import ShadowButton from "@/components/ui/ShadowButton";
import { authStyles as styles } from "@/components/ui/authStyles";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { resetPassword } from "../services/account";

// Ouvert depuis le lien de l'e-mail : /reset-password?code=…
export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (password !== confirmation) return setError("Les mots de passe ne correspondent pas.");
    try {
      setIsSubmitting(true);
      setError(null);
      await resetPassword(code!, password, confirmation);
      setDone(true);
    } catch (err: any) {
      setError(err.message?.replace(/^\d+: /, "") || "Impossible de changer le mot de passe.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toLogin = () => router.replace("/login");

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton onPress={toLogin} />

        <View style={styles.body}>
          <Text style={styles.title}>Nouveau mot de passe</Text>

          {!code ? (
            <>
              <Text style={styles.text}>Ce lien est incomplet. Ouvre le lien reçu par e-mail, ou fais une nouvelle demande.</Text>
              <ShadowButton label="Nouvelle demande" onPress={() => router.replace("/forgot-password")} style={styles.button} />
            </>
          ) : done ? (
            <>
              <Text style={styles.text}>C’est fait ! Connecte-toi avec ton nouveau mot de passe.</Text>
              <ShadowButton label="Se connecter" onPress={toLogin} style={styles.button} />
            </>
          ) : (
            <>
              {error && <Text style={styles.errorText}>{error}</Text>}
              <OutlinedField
                label="Nouveau mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />
              <OutlinedField
                label="Confirmer le mot de passe"
                value={confirmation}
                onChangeText={setConfirmation}
                secureTextEntry
                autoComplete="new-password"
              />
              <ShadowButton label="Valider" onPress={submit} loading={isSubmitting} style={styles.button} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
