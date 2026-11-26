// Feuille de réservation : contacts invités, limite de places, envoi.

import BookingSheet from "@/components/activity/BookingSheet";
import { createBooking } from "@/services/activities";
import { apiFetch } from "@/services/api";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("@/context/AuthContext", () => ({ useAuth: () => ({ token: "jwt" }) }));
jest.mock("@/services/api", () => ({ apiFetch: jest.fn(), STRAPI_BASE_URL: "" }));
jest.mock("@/services/activities", () => ({ createBooking: jest.fn() }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const api = apiFetch as jest.Mock;
const book = createBooking as jest.Mock;

const activity = {
  id: 1,
  documentId: "doc1",
  title: "Atelier",
  description: "",
  location: "",
  price: 20,
  image: null,
  category: null,
  maxParticipants: 2,
};

beforeAll(() => jest.useFakeTimers({ doNotFake: ["setTimeout", "setInterval", "queueMicrotask", "nextTick"] }).setSystemTime(new Date(2026, 10, 18, 10)));
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllMocks();
  api.mockResolvedValue({
    data: [
      { otherUser: { id: 4, firstName: "Clara" } },
      { otherUser: { id: 5, username: "max_2" } },
    ],
  });
  book.mockResolvedValue({});
});

const open = (props = {}) => {
  const onBooked = jest.fn();
  const onClose = jest.fn();
  render(<BookingSheet visible activity={activity} onClose={onClose} onBooked={onBooked} {...props} />);
  return { onBooked, onClose };
};

it("propose les contacts comme participants", async () => {
  open();
  expect(await screen.findByText("Clara")).toBeInTheDocument();
  expect(screen.getByText("max_2")).toBeInTheDocument();
  expect(api).toHaveBeenCalledWith("/conversations?pageSize=50", {}, "jwt");
});

it("compte l'organisateur et les invités", async () => {
  open();
  fireEvent.click(await screen.findByRole("checkbox", { name: /Clara/ }));
  expect(screen.getByLabelText("2 personnes")).toBeInTheDocument();
});

it("refuse de dépasser la limite de l'activité", async () => {
  open();
  fireEvent.click(await screen.findByRole("checkbox", { name: /Clara/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /max_2/ }));

  expect(screen.getByText("Cette activité est limitée à 2 personnes.")).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: /max_2/ })).toHaveAttribute("aria-checked", "false");
});

it("exige un horaire avant d'envoyer", async () => {
  open();
  fireEvent.click(await screen.findByText("Confirmer"));

  expect(screen.getByText("Choisis un horaire.")).toBeInTheDocument();
  expect(book).not.toHaveBeenCalled();
});

it("envoie la réservation du jour choisi, à l'heure choisie", async () => {
  const { onBooked } = open({ presetParticipants: [4] });

  await screen.findByText("Clara");
  fireEvent.click(screen.getByRole("radio", { name: /^VEN\s*20$/ }));
  fireEvent.click(screen.getByText("18h30"));
  fireEvent.click(screen.getByText("Confirmer"));

  await waitFor(() => expect(onBooked).toHaveBeenCalledWith({ date: "2026-11-20", time: "18:30" }));
  expect(book).toHaveBeenCalledWith("jwt", { activity: "doc1", date: "2026-11-20", time: "18:30", participants: [4] });
});

it("affiche le refus du serveur", async () => {
  book.mockRejectedValue(new Error("400: Une erreur est survenue. Veuillez réessayer."));
  const { onBooked } = open();

  await screen.findByText("Clara");
  fireEvent.click(screen.getByText("17h00"));
  fireEvent.click(screen.getByText("Confirmer"));

  expect(await screen.findByText("400: Une erreur est survenue. Veuillez réessayer.")).toBeInTheDocument();
  expect(onBooked).not.toHaveBeenCalled();
});

it("se ferme avec « Annuler »", async () => {
  const { onClose } = open();
  fireEvent.click(await screen.findByText("Annuler"));
  expect(onClose).toHaveBeenCalled();
});
