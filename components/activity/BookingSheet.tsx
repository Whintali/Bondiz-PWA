import { COLORS } from "@/constants/Colors";
import { DESIGN } from "@/constants/Design";
import { FONTS } from "@/constants/Fonts";
import { useAuth } from "@/context/AuthContext";
import { Activity, createBooking } from "@/services/activities";
import { apiFetch } from "@/services/api";
import { displayName, getAvatarUrl } from "@/utils/media";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  activity: Activity | null;
  /** Participants déjà choisis, par exemple le contact d'une conversation. */
  presetParticipants?: number[];
  onClose: () => void;
  onBooked: (summary: { date: string; time: string }) => void;
};

type Contact = { id: number; name: string; avatar: string | null };

const SLOTS = [
  "16h30",
  "17h00",
  "17h30",
  "18h00",
  "18h30",
  "19h00",
  "19h30",
  "20h00",
  "20h30",
  "21h00",
  "21h30",
  "22h00",
];
const DAYS = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];
const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const pad = (n: number) => String(n).padStart(2, "0");
const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const nextDays = (count: number) =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });

// Feuille de réservation : avec qui, quel jour, à quelle heure. Le contenu
// est monté à chaque ouverture, pour repartir d'un état vierge.
export default function BookingSheet(props: Props) {
  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}
    >
      {props.visible && <SheetContent {...props} />}
    </Modal>
  );
}

function SheetContent({
  activity,
  presetParticipants = [],
  onClose,
  onBooked,
}: Props) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const days = useMemo(() => nextDays(14), []);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [participants, setParticipants] =
    useState<number[]>(presetParticipants);
  const [day, setDay] = useState<Date>(days[0]);
  const [slot, setSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    // Les participants doivent être des contacts (matchs) : on les propose.
    apiFetch<any>("/conversations?pageSize=50", {}, token)
      .then((res) =>
        setContacts(
          (res.data ?? []).map((conversation: any) => ({
            id: conversation.otherUser.id,
            name: displayName(conversation.otherUser),
            avatar: getAvatarUrl(conversation.otherUser),
          })),
        ),
      )
      .catch(() => setContacts([]));
  }, [token]);

  const max = activity?.maxParticipants ?? null;
  const total = participants.length + 1;

  const toggleParticipant = (id: number) => {
    setError(null);
    setParticipants((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (max && current.length + 1 >= max) {
        setError(`Cette activité est limitée à ${max} personnes.`);
        return current;
      }
      return [...current, id];
    });
  };

  const confirm = async () => {
    if (!activity || !token) return;
    if (!slot) {
      setError("Choisis un horaire.");
      return;
    }

    const date = toIsoDate(day);
    const time = slot.replace("h", ":");
    try {
      setSubmitting(true);
      setError(null);
      await createBooking(token, {
        activity: activity.documentId ?? activity.id,
        date,
        time,
        participants,
      });
      onBooked({ date, time });
    } catch (err: any) {
      setError(err.message || "Réservation impossible pour le moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.backdrop}>
      <View style={[styles.sheet, { marginTop: insets.top + 54 }]}>
        <Image
          source={DESIGN.bookingSheetBg}
          style={[StyleSheet.absoluteFill, styles.sheetBg]}
          contentFit="cover"
        />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 30 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={DESIGN.sheetHandle}
            style={styles.handle}
            contentFit="contain"
          />

          <View style={[styles.card, styles.peopleCard]}>
            <View style={styles.peopleHeader}>
              <Text style={styles.cardTitle}>Personnes</Text>
              <View
                style={styles.counter}
                accessibilityLabel={`${total} personnes`}
              >
                <Text style={styles.counterText}>{total}</Text>
              </View>
            </View>
            {contacts.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.contacts}
              >
                {contacts.map((contact) => {
                  const selected = participants.includes(contact.id);
                  return (
                    <TouchableOpacity
                      key={contact.id}
                      style={styles.contact}
                      onPress={() => toggleParticipant(contact.id)}
                      accessibilityRole="checkbox"
                      aria-checked={selected}
                    >
                      <View
                        style={[
                          styles.contactAvatar,
                          selected && styles.contactAvatarSelected,
                        ]}
                      >
                        {contact.avatar ? (
                          <Image
                            source={{ uri: contact.avatar }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                          />
                        ) : null}
                      </View>
                      <Text style={styles.contactName} numberOfLines={1}>
                        {contact.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.hint}>
                Tu peux inviter tes contacts une fois connectés.
              </Text>
            )}
          </View>

          <View style={[styles.card, styles.dateCard]}>
            <View style={styles.dateHeader}>
              <Text style={styles.cardTitle}>Date</Text>
              <View style={styles.month}>
                <Text style={styles.monthText}>{MONTHS[day.getMonth()]}</Text>
                <Feather name="chevron-down" size={16} color={COLORS.ink} />
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.days}
            >
              {days.map((d) => {
                const selected = toIsoDate(d) === toIsoDate(day);
                return (
                  <TouchableOpacity
                    key={toIsoDate(d)}
                    style={[styles.day, selected && styles.daySelected]}
                    onPress={() => setDay(d)}
                    accessibilityRole="radio"
                    aria-checked={selected}
                  >
                    <Text
                      style={[
                        styles.dayName,
                        selected && styles.dayTextSelected,
                      ]}
                    >
                      {DAYS[d.getDay()]}
                    </Text>
                    <Text
                      style={[
                        styles.dayNumber,
                        selected && styles.dayTextSelected,
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={[styles.card, styles.timeCard]}>
            <Text style={styles.cardTitle}>Heure</Text>
            <View style={styles.slots}>
              {SLOTS.map((value) => {
                const selected = value === slot;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.slot, selected && styles.slotSelected]}
                    onPress={() => {
                      setSlot(value);
                      setError(null);
                    }}
                    accessibilityRole="radio"
                    aria-checked={selected}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        selected && styles.slotTextSelected,
                      ]}
                    >
                      {value}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancel}
              onPress={onClose}
              accessibilityRole="button"
            >
              <Text style={styles.actionText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirm}
              onPress={confirm}
              disabled={submitting}
              accessibilityRole="button"
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.ink} />
              ) : (
                <Text style={styles.actionText}>Confirmer</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 36, 0.2)",
  },
  sheet: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: "hidden",
  },
  sheetBg: {
    opacity: 0.5,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 21,
  },
  handle: {
    alignSelf: "center",
    width: 56,
    height: 3,
  },
  card: {
    marginTop: 15,
    backgroundColor: COLORS.white,
    borderRadius: 23,
    paddingHorizontal: 20,
    boxShadow: "0px 4px 4px rgba(163, 163, 163, 0.2)",
  },
  peopleCard: {
    marginTop: 38,
    paddingVertical: 24,
  },
  peopleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontFamily: FONTS.display,
    fontSize: 25,
    color: COLORS.ink,
  },
  counter: {
    width: 102,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.ink,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  counterText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.ink,
  },
  contacts: {
    marginTop: 16,
    gap: 12,
  },
  contact: {
    width: 56,
    alignItems: "center",
  },
  contactAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  contactAvatarSelected: {
    borderColor: COLORS.purple,
    borderWidth: 3,
  },
  contactName: {
    marginTop: 4,
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.ink,
  },
  hint: {
    marginTop: 12,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: "rgba(0, 0, 36, 0.5)",
  },
  dateCard: {
    paddingTop: 33,
    paddingBottom: 28,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  month: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.ink,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 28,
  },
  monthText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.ink,
  },
  days: {
    marginTop: 25,
    gap: 8,
  },
  day: {
    width: 66,
    height: 95,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  daySelected: {
    backgroundColor: COLORS.purple,
  },
  dayName: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: "rgba(0, 0, 36, 0.5)",
  },
  dayNumber: {
    fontFamily: FONTS.semiBold,
    fontSize: 25,
    color: "rgba(0, 0, 36, 0.5)",
  },
  dayTextSelected: {
    color: COLORS.white,
  },
  timeCard: {
    paddingTop: 24,
    paddingBottom: 29,
  },
  slots: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 11,
  },
  slot: {
    width: "31.5%",
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.ink,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  slotSelected: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  slotText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.ink,
  },
  slotTextSelected: {
    color: COLORS.white,
  },
  error: {
    marginTop: 16,
    textAlign: "center",
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.error,
  },
  actions: {
    marginTop: 45,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  cancel: {
    width: 167,
    height: 61,
    borderRadius: 20,
    backgroundColor: "rgba(249, 156, 215, 0.66)",
    alignItems: "center",
    justifyContent: "center",
  },
  confirm: {
    width: 167,
    height: 61,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.ink,
    backgroundColor: COLORS.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    color: "black",
  },
});
