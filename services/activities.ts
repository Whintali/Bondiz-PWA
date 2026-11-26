import { apiFetch } from "@/services/api";
import { getMediaUrl } from "@/utils/media";

export type Activity = {
  id: number;
  documentId?: string;
  title: string;
  description: string;
  location: string;
  price: number | null;
  image: string | null;
  category: string | null;
  maxParticipants: number | null;
  /** Adresse et position du partenaire, pour la carte. */
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type Booking = {
  id: number;
  documentId?: string;
  title: string;
  image: string | null;
  date: string | null;
  time: string | null;
  state: string;
  companions: string[];
};

// Catégories des partenaires Strapi, en libellés affichables.
const CATEGORY_LABELS: Record<string, string> = {
  restaurant: "Restaurant",
  bar: "Bar",
  cafe: "Café",
  bowling: "Bowling",
  escape_game: "Escape game",
  cinema: "Cinéma",
  museum: "Musée",
  sport: "Sport",
  karaoke: "Karaoké",
  concert_venue: "Concert",
};

const toNumber = (value: unknown) => (value === null || value === undefined || value === "" ? null : Number(value));

const validCoordinate = (value: number | null, limit: number) =>
  value !== null && Number.isFinite(value) && Math.abs(value) <= limit ? value : null;

/** L'activité peut-elle être placée sur la carte ? */
export const hasPosition = (activity: Activity): activity is Activity & { latitude: number; longitude: number } =>
  activity.latitude !== null && activity.longitude !== null;

export const normalizeActivity = (item: any): Activity => {
  const data = item?.attributes ?? item ?? {};
  const partner = data.partner?.data?.attributes ?? data.partner ?? null;
  return {
    id: item.id,
    documentId: item.documentId,
    title: data.title || "Activité",
    description: data.description || "",
    location: data.location || partner?.city || "",
    price: toNumber(data.price),
    image: getMediaUrl(data.image) ?? getMediaUrl(partner?.coverImage),
    category: partner?.category ? CATEGORY_LABELS[partner.category] ?? null : null,
    maxParticipants: toNumber(data.maxParticipants),
    address: [partner?.address, [partner?.postalCode, partner?.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null,
    latitude: validCoordinate(toNumber(partner?.latitude), 90),
    longitude: validCoordinate(toNumber(partner?.longitude), 180),
  };
};

const ACTIVITY_POPULATE = "populate[image]=true&populate[partner][populate][coverImage]=true";

export async function fetchActivities(): Promise<Activity[]> {
  const res = await apiFetch<any>(`/activities?${ACTIVITY_POPULATE}&pagination[pageSize]=100`);
  return (res.data ?? []).map(normalizeActivity);
}

export async function fetchActivity(id: string): Promise<Activity | null> {
  const res = await apiFetch<any>(`/activities/${id}?${ACTIVITY_POPULATE}`);
  return res.data ? normalizeActivity(res.data) : null;
}

/** Réservations où l'utilisateur est organisateur ou participant. */
export async function fetchMyBookings(userId: number, token: string): Promise<Booking[]> {
  const res = await apiFetch<any>(
    "/bookings?populate[activity][populate][image]=true&populate[organizer]=true&populate[participants]=true&pagination[pageSize]=100",
    {},
    token
  );

  return (res.data ?? []).map((booking: any) => {
    const data = booking.attributes ?? booking;
    const activity = data.activity?.data?.attributes ?? data.activity ?? {};
    const people = [data.organizer, ...(data.participants ?? [])].filter(Boolean);
    return {
      id: booking.id,
      documentId: booking.documentId,
      title: data.activityName || activity.title || "Activité",
      image: getMediaUrl(activity.image),
      date: data.date ?? null,
      time: data.time ? String(data.time).slice(0, 5) : null,
      state: data.state ?? "pending",
      companions: people
        .filter((person: any) => person.id !== userId)
        .map((person: any) => person.firstName || person.username),
    };
  });
}

export async function createBooking(
  token: string,
  input: { activity: string | number; date: string; time: string; participants: number[] }
) {
  return apiFetch<any>("/bookings", {
    method: "POST",
    body: JSON.stringify({ data: { ...input, state: "pending" } }),
  }, token);
}

/** « 8 € », « 20,5 € » ou null quand l'activité est gratuite ou sans prix. */
export const formatPrice = (price: number | null) =>
  price ? `${price.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}€` : null;
