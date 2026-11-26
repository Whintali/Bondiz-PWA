import BackButton from "@/components/ui/BackButton";
import OutlinedField from "@/components/ui/OutlinedField";
import ShadowButton from "@/components/ui/ShadowButton";
import { authStyles as styles } from "@/components/ui/authStyles";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { requestPasswordReset } from "../services/account";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Demande du lien de réinitialisation. La réponse est la même que l'adresse
// ait un compte ou non : on ne révèle pas qui est inscrit.
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!EMAIL.test(email.trim())) {
      setError("Indique une adresse mail valide.");
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await requestPasswordReset(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message?.replace(/^\d+: /, "") || "Envoi impossible pour le moment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton onPress={() => router.replace("/login")} />

        <View style={styles.body}>
          <Text style={styles.title}>Mot de passe oublié ?</Text>

          {sent ? (
            <>
              <Text style={styles.text}>
                Si un compte existe pour {email.trim()}, tu vas recevoir un e-mail avec un lien pour choisir un nouveau
                mot de passe. Pense à regarder dans tes spams.
              </Text>
              <ShadowButton label="Retour à la connexion" onPress={() => router.replace("/login")} style={styles.button} />
            </>
          ) : (
            <>
              <Text style={styles.text}>Indique l’adresse de ton compte : on t’envoie un lien pour le changer.</Text>
              {error && <Text style={styles.errorText}>{error}</Text>}
              <OutlinedField
                label="Adresse mail"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <ShadowButton label="Envoyer le lien" onPress={submit} loading={isSubmitting} style={styles.button} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
