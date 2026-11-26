// Sélecteur de date web : remplace le sélecteur natif dans la PWA.

import DatePickerModal from "@/components/DatePickerModal";
import { fireEvent, render, screen } from "@testing-library/react";

beforeAll(() => jest.useFakeTimers().setSystemTime(new Date(2026, 10, 18, 12)));
afterAll(() => jest.useRealTimers());

it("utilise la version web du composant", () => {
  expect(require.resolve("@/components/DatePickerModal")).toMatch(/DatePickerModal\.web\.tsx$/);
});

it("n'affiche rien quand il est fermé", () => {
  render(<DatePickerModal isVisible={false} onConfirm={jest.fn()} onCancel={jest.fn()} />);
  expect(screen.queryByLabelText("Date")).not.toBeInTheDocument();
});

it("part d'aujourd'hui et renvoie la date choisie à minuit", () => {
  const onConfirm = jest.fn();
  render(<DatePickerModal isVisible onConfirm={onConfirm} onCancel={jest.fn()} />);

  const input = screen.getByLabelText("Date") as HTMLInputElement;
  expect(input.value).toBe("2026-11-18");
  fireEvent.change(input, { target: { value: "2026-12-24" } });
  fireEvent.click(screen.getByText("Confirmer"));

  expect(onConfirm).toHaveBeenCalledWith(new Date(2026, 11, 24));
});

it("respecte la date maximale (âge minimum de 18 ans)", () => {
  const max = new Date(2008, 10, 18);
  render(<DatePickerModal isVisible maximumDate={max} onConfirm={jest.fn()} onCancel={jest.fn()} />);

  const input = screen.getByLabelText("Date") as HTMLInputElement;
  expect(input.value).toBe("2008-11-18");
  expect(input).toHaveAttribute("max", "2008-11-18");
});

it("renvoie une heure en mode horaire", () => {
  const onConfirm = jest.fn();
  render(<DatePickerModal isVisible mode="time" onConfirm={onConfirm} onCancel={jest.fn()} />);

  fireEvent.change(screen.getByLabelText("Heure"), { target: { value: "18:30" } });
  fireEvent.click(screen.getByText("Confirmer"));

  const date: Date = onConfirm.mock.calls[0][0];
  expect([date.getHours(), date.getMinutes()]).toEqual([18, 30]);
});

it("annule sans rien renvoyer", () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  render(<DatePickerModal isVisible onConfirm={onConfirm} onCancel={onCancel} />);

  fireEvent.click(screen.getByText("Annuler"));

  expect(onCancel).toHaveBeenCalled();
  expect(onConfirm).not.toHaveBeenCalled();
});
