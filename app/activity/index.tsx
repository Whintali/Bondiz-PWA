import ActivityCard from "@/components/activity/ActivityCard";
import PillTabs from "@/components/ui/PillTabs";
import ScreenBackground from "@/components/ui/ScreenBackground";
import SearchBar from "@/components/ui/SearchBar";
import { COLORS } from "@/constants/Colors";
import { DESIGN } from "@/constants/Design";
import { FONTS } from "@/constants/Fonts";
import { useAuth } from "@/context/AuthContext";
import { Activity, Booking, fetchActivities, fetchMyBookings } from "@/services/activities";
import { favoriteKey, useFavorites } from "@/utils/favorites";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomNav from "../components/BottomNav";

type Tab = "browse" | "bookings" | "favorites";

const TABS: { key: Tab; label: string }[] = [
  { key: "browse", label: "Parcourir" },
  { key: "bookings", label: "Mes réservations" },
  { key: "favorites", label: "Mes favoris" },
];

const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function ActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { favoriteIds, isFavorite, toggleFavorite } = useFavorites(user?.id, token);

  const [tab, setTab] = useState<Tab>("browse");
  const [search, setSearch] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const [all, mine] = await Promise.all([
            fetchActivities(),
            user && token ? fetchMyBookings(user.id, token) : Promise.resolve([]),
          ]);
          setActivities(all);
          setBookings(mine);
        } catch (error) {
          console.error("Chargement des activités impossible", error);
        } finally {
          setLoading(false);
        }
      };
      load();
    }, [user?.id, token])
  );

  const filtered = useMemo(() => {
    const query = normalize(search.trim());
    if (!query) return activities;
    return activities.filter((activity) =>
      [activity.title, activity.description, activity.location, activity.category ?? ""].some((field) =>
        normalize(field).includes(query)
      )
    );
  }, [activities, search]);

  const favorites = filtered.filter((activity) => favoriteIds.includes(favoriteKey(activity)));
  const open = (activity: Activity) => router.push(`/activity/${activity.documentId ?? activity.id}`);

  return (
    <View style={styles.container}>
      <ScreenBackground source={DESIGN.pageBgGradient} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 26, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>ACTIVITÉS</Text>

        <View style={styles.controls}>
          <SearchBar value={search} onChangeText={setSearch} />
          <PillTabs tabs={TABS} active={tab} onChange={setTab} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.purple} style={styles.loader} />
        ) : tab === "browse" ? (
          <View style={styles.list}>
            {filtered.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                favorite={isFavorite(favoriteKey(activity))}
                onToggleFavorite={() => toggleFavorite(favoriteKey(activity))}
                onOpen={() => open(activity)}
              />
            ))}
            {filtered.length === 0 && <Text style={styles.empty}>Aucune activité ne correspond à ta recherche.</Text>}
          </View>
        ) : tab === "favorites" ? (
          <View style={styles.grid}>
            {favorites.map((activity) => (
              <View key={activity.id} style={styles.gridItem}>
                <ActivityCard
                  variant="tile"
                  activity={activity}
                  favorite
                  onToggleFavorite={() => toggleFavorite(favoriteKey(activity))}
                  onOpen={() => open(activity)}
                />
              </View>
            ))}
            {favorites.length === 0 && (
              <Text style={styles.empty}>Touche le cœur d’une activité pour la retrouver ici.</Text>
            )}
          </View>
        ) : (
          <BookingsTab bookings={bookings} />
        )}
      </ScrollView>

      <BottomNav currentRoute="activity" />
    </View>
  );
}

// ─── Onglet « Mes réservations » : calendrier du mois + réservations du jour ──

const WEEKDAYS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const LONG_DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Six semaines du lundi au dimanche, débordant sur les mois voisins.
const monthGrid = (month: Date) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  // On retire la dernière semaine si elle est entièrement dans le mois suivant.
  return cells[35].getMonth() !== month.getMonth() ? cells.slice(0, 35) : cells;
};

function BookingsTab({ bookings }: { bookings: Booking[] }) {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(isoDate(today));

  const bookedDays = new Set(bookings.filter((b) => b.state !== "cancelled" && b.date).map((b) => b.date!));
  const ofDay = bookings.filter((b) => b.date === selected && b.state !== "cancelled");
  const upcoming = bookings
    .filter((b) => b.date && b.date >= isoDate(today) && b.state !== "cancelled")
    .sort((a, b) => (a.date! + (a.time ?? "")).localeCompare(b.date! + (b.time ?? "")));
  const shown = ofDay.length > 0 ? ofDay : upcoming;

  const shiftMonth = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  return (
    <View style={styles.bookings}>
      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          <Text style={styles.monthTitle}>{MONTHS[month.getMonth()]}</Text>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={8} accessibilityLabel="Mois précédent">
              <Feather name="chevron-left" size={20} color={COLORS.ink} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={8} accessibilityLabel="Mois suivant">
              <Feather name="chevron-right" size={20} color={COLORS.ink} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekday}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {monthGrid(month).map((d) => {
            const key = isoDate(d);
            const inMonth = d.getMonth() === month.getMonth();
            const isSelected = key === selected;
            return (
              <TouchableOpacity key={key} style={styles.dayCell} onPress={() => setSelected(key)} accessibilityRole="radio" aria-checked={isSelected}>
                {isSelected && <Image source={DESIGN.calendarSelected} style={styles.daySelected} />}
                <Text style={[styles.dayText, !inMonth && styles.dayOutside, isSelected && styles.dayTextSelected]}>{d.getDate()}</Text>
                {bookedDays.has(key) && <Image source={DESIGN.calendarEventDot} style={styles.eventDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {shown.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
      {shown.length === 0 && <Text style={styles.empty}>Aucune réservation à venir.</Text>}
    </View>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const date = booking.date ? new Date(`${booking.date}T00:00:00`) : null;
  const dateLabel = date ? `${LONG_DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()].toLowerCase()}` : "Date à définir";

  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingImage}>
        {booking.image ? <Image source={{ uri: booking.image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      </View>
      <View style={styles.bookingInfo}>
        <Text style={styles.bookingTitle} numberOfLines={1}>
          {booking.title}
        </Text>
        <View style={styles.bookingRow}>
          <Feather name="calendar" size={16} color={COLORS.purple} />
          <Text style={styles.bookingText}>{dateLabel}</Text>
        </View>
        {booking.time ? (
          <View style={styles.bookingRow}>
            <Feather name="clock" size={16} color={COLORS.purple} />
            <Text style={styles.bookingText}>{booking.time.replace(":", "h")}</Text>
          </View>
        ) : null}
        {booking.companions.length > 0 ? (
          <View style={styles.bookingRow}>
            <Feather name="user" size={18} color={COLORS.purple} />
            <Text style={styles.bookingText} numberOfLines={1}>
              Avec {booking.companions.join(", ")}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    paddingHorizontal: 8,
  },
  title: {
    marginTop: 36,
    fontFamily: FONTS.display,
    fontSize: 25,
    color: COLORS.ink,
    textAlign: "center",
  },
  controls: {
    marginTop: 43,
    gap: 13,
  },
  loader: {
    marginTop: 60,
  },
  list: {
    marginTop: 38,
    gap: 23,
    paddingHorizontal: 2,
  },
  grid: {
    marginTop: 27,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    paddingHorizontal: 14,
  },
  gridItem: {
    width: "47.5%",
  },
  empty: {
    marginTop: 30,
    width: "100%",
    textAlign: "center",
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: "rgba(0, 0, 36, 0.6)",
  },
  bookings: {
    marginTop: 38,
    gap: 19,
  },
  calendar: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 23,
    paddingBottom: 16,
    boxShadow: "0px 4px 4px rgba(0, 0, 36, 0.2)",
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  monthTitle: {
    fontFamily: FONTS.display,
    fontSize: 25,
    color: COLORS.ink,
  },
  monthNav: {
    flexDirection: "row",
    gap: 12,
  },
  weekRow: {
    marginTop: 17,
    flexDirection: "row",
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.ink,
  },
  daysGrid: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  daySelected: {
    position: "absolute",
    width: 36,
    height: 36,
  },
  dayText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.ink,
  },
  dayOutside: {
    color: "rgba(0, 0, 36, 0.4)",
  },
  dayTextSelected: {
    color: COLORS.white,
  },
  eventDot: {
    position: "absolute",
    bottom: 1,
    width: 7,
    height: 7,
  },
  bookingCard: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0px 4px 4px rgba(0, 0, 36, 0.2)",
  },
  bookingImage: {
    width: 145,
    height: 144,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.ink,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  bookingInfo: {
    flex: 1,
    paddingLeft: 20,
    paddingRight: 12,
    paddingTop: 15,
    gap: 3,
  },
  bookingTitle: {
    marginBottom: 6,
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.ink,
  },
  bookingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bookingText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.ink,
  },
});
