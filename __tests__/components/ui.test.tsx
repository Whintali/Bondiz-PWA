// Composants partagés de la maquette, rendus en version web (DOM).

import BackButton from "@/components/ui/BackButton";
import InterestChip from "@/components/ui/InterestChip";
import OutlinedField from "@/components/ui/OutlinedField";
import PillTabs from "@/components/ui/PillTabs";
import ProgressDots from "@/components/ui/ProgressDots";
import SearchBar from "@/components/ui/SearchBar";
import ShadowButton from "@/components/ui/ShadowButton";
import { fireEvent, render, screen } from "@testing-library/react";

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));

beforeEach(() => jest.clearAllMocks());

describe("ShadowButton", () => {
  it("affiche son libellé et réagit au clic", () => {
    const onPress = jest.fn();
    render(<ShadowButton label="Suivant" onPress={onPress} />);

    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("ne réagit pas quand il est désactivé", () => {
    const onPress = jest.fn();
    render(<ShadowButton label="Suivant" onPress={onPress} disabled />);

    fireEvent.click(screen.getByRole("button"));

    expect(onPress).not.toHaveBeenCalled();
  });

  it("remplace le libellé par un indicateur pendant le chargement", () => {
    const onPress = jest.fn();
    render(<ShadowButton label="Connexion" onPress={onPress} loading />);

    expect(screen.queryByText("Connexion")).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("OutlinedField", () => {
  it("affiche l'étiquette et transmet la saisie", () => {
    const onChangeText = jest.fn();
    render(<OutlinedField label="Adresse mail" value="" onChangeText={onChangeText} />);

    expect(screen.getByText("Adresse mail")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "nina@test.fr" } });

    expect(onChangeText).toHaveBeenCalledWith("nina@test.fr");
  });

  it("masque le mot de passe et permet de l'afficher", () => {
    const { container } = render(<OutlinedField label="Mot de passe" value="secret" secureTextEntry />);
    const input = container.querySelector("input")!;

    expect(input).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
    expect(input).not.toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Masquer le mot de passe" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("n'affiche pas de bouton œil sur un champ normal", () => {
    render(<OutlinedField label="Prénom" value="" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("BackButton", () => {
  it("revient à l'écran précédent", () => {
    render(<BackButton />);
    fireEvent.click(screen.getByRole("button", { name: "Retour" }));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("retourne à l'accueil quand il n'y a pas d'écran précédent", () => {
    mockRouter.canGoBack.mockReturnValue(false);
    render(<BackButton />);
    fireEvent.click(screen.getByRole("button", { name: "Retour" }));
    expect(mockRouter.replace).toHaveBeenCalledWith("/home");
  });

  it("utilise l'action fournie", () => {
    const onPress = jest.fn();
    render(<BackButton onPress={onPress} />);
    fireEvent.click(screen.getByRole("button", { name: "Retour" }));
    expect(onPress).toHaveBeenCalled();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});

it("ProgressDots annonce l'étape en cours", () => {
  render(<ProgressDots step={2} total={5} />);
  expect(screen.getByLabelText("Étape 2 sur 5")).toBeInTheDocument();
});

describe("PillTabs", () => {
  const tabs = [
    { key: "browse", label: "Parcourir" },
    { key: "bookings", label: "Mes réservations" },
  ] as const;

  it("marque l'onglet actif", () => {
    render(<PillTabs tabs={[...tabs]} active="bookings" onChange={jest.fn()} />);

    expect(screen.getByRole("tab", { name: "Mes réservations" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Parcourir" })).toHaveAttribute("aria-selected", "false");
  });

  it("change d'onglet au clic", () => {
    const onChange = jest.fn();
    render(<PillTabs tabs={[...tabs]} active="browse" onChange={onChange} />);

    fireEvent.click(screen.getByRole("tab", { name: "Mes réservations" }));

    expect(onChange).toHaveBeenCalledWith("bookings");
  });
});

describe("InterestChip", () => {
  it("affiche un pictogramme pour les intérêts qui en ont un", () => {
    const { container } = render(<InterestChip label="Yoga" />);
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("n'affiche pas de pictogramme sur fond violet", () => {
    const { container } = render(<InterestChip label="Yoga" tone="light" />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("n'affiche pas de pictogramme pour un intérêt sans visuel", () => {
    const { container } = render(<InterestChip label="Randonnée" />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("se coche et se décoche quand il est sélectionnable", () => {
    const onPress = jest.fn();
    render(<InterestChip label="Sport" selected onPress={onPress} />);

    const chip = screen.getByRole("checkbox", { name: /Sport/ });
    expect(chip).toHaveAttribute("aria-checked", "true");
    fireEvent.click(chip);
    expect(onPress).toHaveBeenCalled();
  });

  it("n'est pas cliquable sans action", () => {
    render(<InterestChip label="Sport" />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});

it("SearchBar transmet la recherche", () => {
  const onChangeText = jest.fn();
  render(<SearchBar value="" onChangeText={onChangeText} />);

  fireEvent.change(screen.getByLabelText("Rechercher"), { target: { value: "bar" } });

  expect(onChangeText).toHaveBeenCalledWith("bar");
});
