import ActivityCard from "@/components/activity/ActivityCard";
import { Activity } from "@/services/activities";
import { fireEvent, render, screen } from "@testing-library/react";

const activity: Activity = {
  id: 1,
  documentId: "doc1",
  title: "Buddy’s bar",
  description: "",
  location: "Angers centre",
  price: 8,
  image: "https://cdn/bar.png",
  category: "Bar",
  maxParticipants: 6,
};

it("affiche le titre, la catégorie, la taille du groupe, le lieu et le prix", () => {
  render(<ActivityCard activity={activity} favorite={false} onToggleFavorite={jest.fn()} onOpen={jest.fn()} />);

  for (const text of ["Buddy’s bar", "Bar", "6 pers", "Angers centre", "8€", "Découvrir"]) {
    expect(screen.getByText(text)).toBeInTheDocument();
  }
});

it("ouvre l'activité depuis la carte ou le bouton « Découvrir »", () => {
  const onOpen = jest.fn();
  render(<ActivityCard activity={activity} favorite={false} onToggleFavorite={jest.fn()} onOpen={onOpen} />);

  fireEvent.click(screen.getByRole("button", { name: "Buddy’s bar" }));
  fireEvent.click(screen.getByRole("button", { name: "Découvrir Buddy’s bar" }));

  expect(onOpen).toHaveBeenCalledTimes(2);
});

it("le cœur change le favori sans ouvrir l'activité", () => {
  const onOpen = jest.fn();
  const onToggleFavorite = jest.fn();
  render(<ActivityCard activity={activity} favorite={false} onToggleFavorite={onToggleFavorite} onOpen={onOpen} />);

  fireEvent.click(screen.getByRole("button", { name: "Ajouter aux favoris" }));

  expect(onToggleFavorite).toHaveBeenCalled();
  expect(onOpen).not.toHaveBeenCalled();
});

it("ne met jamais un bouton dans un autre (HTML invalide)", () => {
  const { container } = render(<ActivityCard activity={activity} favorite onToggleFavorite={jest.fn()} onOpen={jest.fn()} />);
  expect(container.querySelectorAll("button button")).toHaveLength(0);
  expect(screen.getByRole("button", { name: "Retirer des favoris" })).toBeInTheDocument();
});

it("la vignette des favoris ne garde que l'essentiel", () => {
  render(<ActivityCard variant="tile" activity={activity} favorite onToggleFavorite={jest.fn()} onOpen={jest.fn()} />);

  expect(screen.getByText("Bar")).toBeInTheDocument();
  expect(screen.queryByText("6 pers")).not.toBeInTheDocument();
  expect(screen.queryByText("8€")).not.toBeInTheDocument();
  expect(screen.queryByText("Découvrir")).not.toBeInTheDocument();
});
