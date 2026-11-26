// Conversion des activités et réservations Strapi pour l'affichage.

import { apiFetch } from "@/services/api";
import { createBooking, fetchMyBookings, formatPrice, normalizeActivity } from "@/services/activities";

jest.mock("@/services/api", () => ({ apiFetch: jest.fn(), STRAPI_BASE_URL: "https://api.test" }));
const api = apiFetch as jest.Mock;

beforeEach(() => api.mockReset());

describe("normalizeActivity", () => {
  it("lit une activité Strapi 5 avec son partenaire", () => {
    const activity = normalizeActivity({
      id: 3,
      documentId: "doc3",
      title: "Buddy’s bar",
      description: "Bar ambiance",
      location: "Angers",
      price: "8",
      maxParticipants: 6,
      image: { url: "/uploads/bar.png" },
      partner: { category: "bar", city: "Angers" },
    });

    expect(activity).toEqual({
      id: 3,
      documentId: "doc3",
      title: "Buddy’s bar",
      description: "Bar ambiance",
      location: "Angers",
      price: 8,
      image: "https://api.test/uploads/bar.png",
      category: "Bar",
      maxParticipants: 6,
    });
  });

  it("lit aussi l'ancien format avec « attributes »", () => {
    const activity = normalizeActivity({ id: 1, attributes: { title: "Atelier", image: { data: { attributes: { url: "https://cdn/x.png" } } } } });
    expect(activity.title).toBe("Atelier");
    expect(activity.image).toBe("https://cdn/x.png");
  });

  it("se rabat sur la ville et la photo du partenaire", () => {
    const activity = normalizeActivity({ id: 2, title: "Pilates", partner: { city: "Nantes", coverImage: { url: "/uploads/cover.png" } } });
    expect(activity.location).toBe("Nantes");
    expect(activity.image).toBe("https://api.test/uploads/cover.png");
  });

  it("gère une activité incomplète", () => {
    const activity = normalizeActivity({ id: 9 });
    expect(activity).toMatchObject({ title: "Activité", description: "", location: "", price: null, image: null, category: null, maxParticipants: null });
  });

  it("n'affiche pas de catégorie inconnue", () => {
    expect(normalizeActivity({ id: 1, partner: { category: "other" } }).category).toBeNull();
  });
});

describe("formatPrice", () => {
  it.each([
    [8, "8€"],
    [20.5, "20,5€"],
    [0, null],
    [null, null],
  ])("%p → %p", (price, expected) => {
    expect(formatPrice(price as any)).toBe(expected);
  });
});

describe("fetchMyBookings", () => {
  it("résume chaque réservation sans l'utilisateur lui-même", async () => {
    api.mockResolvedValue({
      data: [
        {
          id: 7,
          documentId: "b7",
          date: "2026-11-18",
          time: "18:30:00.000",
          state: "pending",
          activity: { title: "Buddy’s bar", image: { url: "/uploads/bar.png" } },
          organizer: { id: 1, username: "nina" },
          participants: [{ id: 4, firstName: "Clara", username: "clara_1" }, { id: 5, username: "max_2" }],
        },
        { id: 8, activityName: "Renommée", state: "confirmed", organizer: { id: 4, firstName: "Clara" }, participants: [{ id: 1 }] },
      ],
    });

    const bookings = await fetchMyBookings(1, "jwt");

    expect(bookings[0]).toEqual({
      id: 7,
      documentId: "b7",
      title: "Buddy’s bar",
      image: "https://api.test/uploads/bar.png",
      date: "2026-11-18",
      time: "18:30",
      state: "pending",
      companions: ["Clara", "max_2"],
    });
    expect(bookings[1]).toMatchObject({ title: "Renommée", date: null, time: null, companions: ["Clara"] });
    expect(api.mock.calls[0][2]).toBe("jwt");
  });

  it("renvoie une liste vide sans réservation", async () => {
    api.mockResolvedValue({});
    expect(await fetchMyBookings(1, "jwt")).toEqual([]);
  });
});

it("createBooking envoie une réservation en attente", async () => {
  api.mockResolvedValue({ data: {} });

  await createBooking("jwt", { activity: "doc3", date: "2026-11-18", time: "18:30", participants: [4] });

  expect(api).toHaveBeenCalledWith(
    "/bookings",
    { method: "POST", body: JSON.stringify({ data: { activity: "doc3", date: "2026-11-18", time: "18:30", participants: [4], state: "pending" } }) },
    "jwt"
  );
});
