import BottomNav from "@/app/components/BottomNav";
import { fireEvent, render, screen } from "@testing-library/react";

const mockRouter = { replace: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

beforeEach(() => jest.clearAllMocks());

it("propose les cinq onglets de la maquette", () => {
  render(<BottomNav currentRoute="home" />);
  expect(screen.getAllByRole("tab").map((tab) => tab.getAttribute("aria-label"))).toEqual([
    "Accueil",
    "Activités",
    "Carte",
    "Messages",
    "Profil",
  ]);
});

it("met en avant l'onglet de l'écran affiché", () => {
  render(<BottomNav currentRoute="messages" />);
  expect(screen.getByRole("tab", { name: "Messages" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tab", { name: "Accueil" })).toHaveAttribute("aria-selected", "false");
});

it.each([
  ["Activités", "/activity"],
  ["Carte", "/map"],
  ["Messages", "/messages"],
  ["Profil", "/profile"],
])("l'onglet %s ouvre %s", (label, route) => {
  render(<BottomNav currentRoute="home" />);
  fireEvent.click(screen.getByRole("tab", { name: label }));
  expect(mockRouter.replace).toHaveBeenCalledWith(route);
});

it("ne recharge pas l'écran déjà affiché", () => {
  render(<BottomNav currentRoute="home" />);
  fireEvent.click(screen.getByRole("tab", { name: "Accueil" }));
  expect(mockRouter.replace).not.toHaveBeenCalled();
});
