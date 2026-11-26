// Carte des activités : repères aux adresses des partenaires, fiche du lieu,
// accès à l'activité. Les tuiles OpenStreetMap sont remplacées par une image
// vide : les tests ne dépendent pas d'Internet.

import { createUser, readState } from "./support/api";
import { expect, loginAs, test } from "./support/fixtures";

const EMPTY_TILE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

test.beforeEach(async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({ body: EMPTY_TILE, contentType: "image/png" })
  );
});

test("les activités avec une adresse apparaissent sur la carte", async ({ page }) => {
  const user = await createUser();
  await loginAs(page, user, "/map");

  await expect(page.getByText("CARTE", { exact: true })).toBeVisible();
  await expect(page.getByTestId("activity-map")).toBeVisible();
  await expect(page.getByRole("button", { name: "Buddy’s bar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "L’atelier des Artistes" })).toBeVisible();
  // Bloom Fit n'a pas de position : signalé sous la carte.
  await expect(page.getByRole("button", { name: "Bloom Fit" })).toHaveCount(0);
  await expect(page.getByText("1 activité sans adresse précise : voir la liste")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Carte" })).toHaveAttribute("aria-selected", "true");
});

test("un repère ouvre la fiche du lieu, puis l'activité", async ({ page }) => {
  const user = await createUser();
  await loginAs(page, user, "/map");

  await page.getByRole("button", { name: "Buddy’s bar" }).click();
  await expect(page.getByText("12 rue Saint-Laud, 49100 Angers")).toBeVisible();
  await expect(page.getByText("8€")).toBeVisible();

  // Fermer la fiche…
  await page.getByRole("button", { name: "Fermer" }).click();
  await expect(page.getByText("12 rue Saint-Laud, 49100 Angers")).toBeHidden();

  // …ou passer d'un repère à l'autre au clavier.
  await page.getByRole("button", { name: "L’atelier des Artistes" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("3 place du Ralliement, 49100 Angers")).toBeVisible();

  await page.getByRole("button", { name: "Découvrir L’atelier des Artistes" }).click();
  const { documentId } = readState().activities.find((activity) => activity.title === "L’atelier des Artistes")!;
  await expect(page).toHaveURL(new RegExp(`/activity/${documentId}$`));
});

test("« Autour de moi » centre la carte sur la position de l'utilisateur", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 47.47, longitude: -0.55 });
  const user = await createUser();
  await loginAs(page, user, "/map");

  await page.getByRole("button", { name: "Autour de moi" }).click();
  await expect(page.locator(".bondiz-me")).toBeVisible();
});

test("le lien sous la carte mène à la liste des activités", async ({ page }) => {
  const user = await createUser();
  await loginAs(page, user, "/map");

  await page.getByRole("link", { name: /sans adresse précise/ }).click();
  await expect(page).toHaveURL(/\/activity$/);
});
