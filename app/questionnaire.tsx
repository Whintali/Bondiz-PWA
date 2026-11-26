import DateTimePickerModal from "@/components/DatePickerModal";
import BackButton from "@/components/ui/BackButton";
import InterestChip from "@/components/ui/InterestChip";
import OutlinedField from "@/components/ui/OutlinedField";
import ProgressDots from "@/components/ui/ProgressDots";
import ShadowButton from "@/components/ui/ShadowButton";
import { COLORS } from "@/constants/Colors";
import { DESIGN } from "@/constants/Design";
import { FONTS } from "@/constants/Fonts";
import { calculateAge, toCalendarDate } from "@/utils/date";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/api";

type Interet = { id: number; name: string };
type CategorieInterets = { id: number; name: string; interests: Interet[] };

const TOTAL_STEPS = 5;
const MIN_INTERESTS = 5;

const GENDERS = [
  { label: "Je suis un homme", value: "homme" },
  { label: "Je suis une femme", value: "femme" },
  { label: "Je suis non-genré", value: "non-genré" },
];

const maxBirthdate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date;
};

export default function QuestionnaireScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email: string; password: string; phone?: string }>();
  const { register } = useAuth();

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [hideLastName, setHideLastName] = useState(false);
  const [gender, setGender] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [birthdate, setBirthdate] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [interests, setInterests] = useState<Interet[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const chargerCatalogue = async () => {
      try {
        const res = await apiFetch<any>("/interest-categories?populate=interests&sort=sortOrder:asc");
        const categories: CategorieInterets[] = res.data ?? [];
        setInterests(categories.flatMap((category) => category.interests ?? []));
      } catch (err) {
        console.error("Chargement des centres d'intérêt impossible", err);
        setError("Impossible de charger les centres d'intérêt. Vérifiez votre connexion.");
      }
    };
    chargerCatalogue();
  }, []);

  const goBack = () => {
    setError(null);
    if (step === 1) router.back();
    else setStep(step - 1);
  };

  const next = () => {
    setError(null);
    if (step === 1 && !firstName.trim()) return setError("Indique ton prénom pour continuer.");
    if (step === 3 && !city.trim()) return setError("Indique ta ville pour continuer.");
    if (step === 4 && !birthdate) return setError("Indique ta date de naissance pour continuer.");
    setStep(step + 1);
  };

  const chooseGender = (value: string) => {
    setGender(value);
    setError(null);
    setStep(3);
  };

  const confirmBirthdate = (date: Date) => {
    setDatePickerVisible(false);
    if (date > maxBirthdate()) {
      setError("Tu dois avoir au moins 18 ans pour t’inscrire.");
      return;
    }
    setError(null);
    setBirthdate(date);
  };

  const toggleInterest = (id: number) => {
    setSelectedInterests((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  };

  const finish = async () => {
    if (selectedInterests.length < MIN_INTERESTS) {
      setError(`Choisis au moins ${MIN_INTERESTS} centres d’intérêt (${selectedInterests.length}/${MIN_INTERESTS}).`);
      return;
    }

    const { email, password, phone } = params;
    if (!email || !password) {
      setError("Informations d'inscription manquantes. Recommence depuis l’inscription.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await register(firstName.trim(), email, password, {
        firstName: firstName.trim(),
        // Le nom n'est jamais public ; on ne le garde pas si l'utilisateur ne le souhaite pas.
        lastName: hideLastName ? undefined : lastName.trim() || undefined,
        gender: gender ?? undefined,
        // Strapi attend une date au format AAAA-MM-JJ.
        age: birthdate ? toCalendarDate(birthdate) : undefined,
        city: city.trim(),
        ...(phone ? { phone } : {}),
        interestTags: selectedInterests,
      });

      router.replace("/");
    } catch (err: any) {
      console.error("Failed to register user", err);
      setError(err.message || "Impossible de finaliser ton inscription.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const age = birthdate ? calculateAge(birthdate.getTime()) : null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackButton onPress={goBack} />
        <View style={styles.dots}>
          <ProgressDots step={step} total={TOTAL_STEPS} />
        </View>

        {step === 1 && (
          <View style={styles.step}>
            <View>
              <Text style={styles.hello}>Salut toi !</Text>
              <Image source={DESIGN.sousLogo} style={styles.sousLogo} contentFit="contain" />
            </View>
            <Text style={styles.question}>Tu t’appelles comment ?</Text>

            <View style={styles.fields}>
              <OutlinedField label="Prénom" value={firstName} onChangeText={setFirstName} autoComplete="given-name" />
              <OutlinedField
                label="Nom"
                value={lastName}
                onChangeText={setLastName}
                autoComplete="family-name"
                editable={!hideLastName}
              />
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setHideLastName((value) => !value)}
              accessibilityRole="checkbox"
              aria-checked={hideLastName}
            >
              <View style={[styles.checkbox, hideLastName && styles.checkboxChecked]} />
              <Text style={styles.checkboxLabel}>Je ne souhaite pas afficher mon nom de famille sur mon profil</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={[styles.step, styles.stepCentered]}>
            <Text style={styles.question}>Comment te définis-tu ?</Text>
            <View style={styles.choices}>
              {GENDERS.map((option) => (
                <ShadowButton
                  key={option.value}
                  label={option.label}
                  variant={gender === option.value ? "yellow" : "white"}
                  onPress={() => chooseGender(option.value)}
                />
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={[styles.step, styles.stepCentered]}>
            <Text style={styles.question}>Où vis-tu actuellement ?</Text>
            <OutlinedField
              width={283}
              placeholder="Rechercher une ville"
              value={city}
              onChangeText={setCity}
              autoComplete="postal-address-locality"
              containerStyle={styles.cityField}
            />
          </View>
        )}

        {step === 4 && (
          <View style={[styles.step, styles.stepCentered]}>
            <Text style={styles.question}>Quel âge as-tu ?</Text>
            <TouchableOpacity onPress={() => setDatePickerVisible(true)} style={styles.ageField} accessibilityRole="button">
              <View style={{ pointerEvents: "none" }}>
                <OutlinedField
                  label="Âge"
                  editable={false}
                  value={age !== null ? `${age} ans` : ""}
                  placeholder="Ta date de naissance"
                />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {step === 5 && (
          <View style={styles.step}>
            <Text style={[styles.question, styles.hobbiesTitle]}>Sélectionne tes hobbies</Text>
            <View style={styles.chips}>
              {interests.map((interest) => (
                <InterestChip
                  key={interest.id}
                  label={interest.name}
                  tone="light"
                  selected={selectedInterests.includes(interest.id)}
                  onPress={() => toggleInterest(interest.id)}
                />
              ))}
            </View>
            <Text style={styles.counter}>
              {selectedInterests.length}/{MIN_INTERESTS} minimum
            </Text>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {step !== 2 && (
          <ShadowButton
            label={step === TOTAL_STEPS ? "Terminer" : "Suivant"}
            onPress={step === TOTAL_STEPS ? finish : next}
            loading={isSubmitting}
            style={styles.nextButton}
          />
        )}
      </ScrollView>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={confirmBirthdate}
        onCancel={() => setDatePickerVisible(false)}
        confirmTextIOS="Confirmer"
        cancelTextIOS="Annuler"
        locale="fr-FR"
        maximumDate={maxBirthdate()}
      />
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
    paddingHorizontal: 34,
  },
  dots: {
    marginTop: 43,
    marginLeft: 1,
  },
  step: {
    alignItems: "center",
    marginTop: 66,
  },
  stepCentered: {
    marginTop: 160,
  },
  sousLogo: {
    position: "absolute",
    right: -36,
    top: 8,
    width: 29,
    height: 29,
  },
  hello: {
    fontFamily: FONTS.extraBold,
    fontSize: 30,
    color: "white",
    textAlign: "center",
  },
  question: {
    marginTop: 8,
    fontFamily: FONTS.extraBold,
    fontSize: 20,
    color: "white",
    textAlign: "center",
  },
  fields: {
    marginTop: 40,
    gap: 30,
  },
  checkboxRow: {
    marginTop: 36,
    width: 255,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },
  checkbox: {
    marginTop: 2,
    width: 15,
    height: 15,
    borderWidth: 1.5,
    borderColor: "white",
  },
  checkboxChecked: {
    backgroundColor: "white",
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: "white",
  },
  choices: {
    marginTop: 41,
    gap: 26,
  },
  cityField: {
    marginTop: 55,
  },
  ageField: {
    marginTop: 49,
  },
  hobbiesTitle: {
    marginTop: 0,
  },
  chips: {
    marginTop: 28,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  counter: {
    marginTop: 20,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
  },
  nextButton: {
    marginTop: 56,
  },
  errorText: {
    marginTop: 24,
    alignSelf: "center",
    maxWidth: 300,
    color: "white",
    backgroundColor: "rgba(0, 0, 36, 0.25)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    fontFamily: FONTS.medium,
    fontSize: 13,
    textAlign: "center",
  },
});
