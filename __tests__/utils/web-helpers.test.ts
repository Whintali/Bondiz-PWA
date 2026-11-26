// Petits utilitaires propres au web : envoi d'image, alertes, âge.

import { showAlert } from "@/utils/alert";
import { calculateAge } from "@/utils/date";
import { appendImage } from "@/utils/upload";

describe("appendImage (web)", () => {
  it("convertit l'image choisie en fichier, avec la bonne extension", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    (global as any).fetch = jest.fn(async () => ({ blob: async () => blob }));
    const form = { append: jest.fn() } as unknown as FormData;

    await appendImage(form, "files", "blob:https://app.bondiz.fr/123", "profile");

    expect(fetch).toHaveBeenCalledWith("blob:https://app.bondiz.fr/123");
    expect(form.append).toHaveBeenCalledWith("files", blob, "profile.png");
  });

  it("utilise .jpg quand le type est inconnu", async () => {
    const blob = new Blob(["x"]);
    (global as any).fetch = jest.fn(async () => ({ blob: async () => blob }));
    const form = { append: jest.fn() } as unknown as FormData;

    await appendImage(form, "files", "data:...", "photo");

    expect(form.append).toHaveBeenCalledWith("files", blob, "photo.jpg");
  });
});

it("showAlert utilise la boîte du navigateur (Alert ne fait rien sur le web)", () => {
  const alert = jest.spyOn(window, "alert").mockImplementation(() => {});
  showAlert("Erreur", "Impossible");
  expect(alert).toHaveBeenCalledWith("Erreur\n\nImpossible");
  alert.mockRestore();
});

describe("calculateAge", () => {
  beforeAll(() => jest.useFakeTimers().setSystemTime(new Date("2026-11-18T12:00:00Z")));
  afterAll(() => jest.useRealTimers());

  it.each([
    ["2000-11-18", 26],
    ["2000-11-19", 25],
    ["2008-11-18", 18],
    [undefined, 0],
  ])("%p → %p ans", (birthdate, age) => {
    expect(calculateAge(birthdate as any)).toBe(age);
  });
});
