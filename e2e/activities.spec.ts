// Activités : liste, recherche, favoris, fiche détaillée, réservation et
// onglet « Mes réservations ». Les trois activités viennent du global setup.

import { api, createUser, match, readState } from "./support/api";
import { expect, loginAs, test } from "./support/fixtures";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Demain, à Paris (le fuseau du navigateur de test). */
function tomorrow() {
  const [year, month, day] = new Date(Date.now() + 86_400_000)
    .toLocaleDateString("en-CA", { timeZone: "Europe/Paris" })
    .split("-")
    .map(Number);
  const date = new Date(year, month - 1, day);
  return {
    iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    label: `${DAYS[date.getDay()]} ${day} ${MONTHS[month - 1]}`,
  };
}

test.describe("liste des activités", () => {
  test("les activités publiées s'affichent et se filtrent par recherche", async ({ page }) => {
    const user = await createUser();
    await loginAs(page, user, "/activity");

    await expect(page.getByText("ACTIVITÉS")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Parcourir" })).toHaveAttribute("aria-selected", "true");
    for (const { title } of readState().activities) {
      await expect(page.getByRole("button", { name: `Découvrir ${title}` })).toBeVisible();
    }

    const search = page.getByLabel("Rechercher");

    // La recherche porte aussi sur la description…
    await search.fill("pilates");
    await expect(page.getByRole("button", { name: "Découvrir Bloom Fit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Découvrir Buddy’s bar" })).toBeHidden();

    // …ignore accents et majuscules…
    await search.fill("ATELIER DES ARTISTES");
    await expect(page.getByRole("button", { name: "Découvrir L’atelier des Artistes" })).toBeVisible();
    await search.fill("cocktails angers");
    await expect(page.getByText("Aucune activité ne correspond à ta recherche.")).toBeVisible();

    // …et un champ vide remet toute la liste.
    await search.fill("");
    await expect(page.getByRole("button", { name: /^Découvrir / })).toHaveCount(3);
  });

  test("les favoris se gèrent depuis la liste et suivent le compte", async ({ page, browser }) => {
    const user = await createUser();
    await loginAs(page, user, "/activity");

    await page.getByRole("tab", { name: "Mes favoris" }).click();
    await expect(page.getByText("Touche le cœur d’une activité pour la retrouver ici.")).toBeVisible();

    await page.getByRole("tab", { name: "Parcourir" }).click();
    const bloom = page.getByRole("button", { name: "Découvrir Bloom Fit" });
    await expect(bloom).toBeVisible();
    // Le cœur de la carte Bloom Fit (cartes dans l'ordre de la liste).
    const cards = page.getByRole("button", { name: "Ajouter aux favoris" });
    const titles = await page.getByRole("button", { name: /^Découvrir / }).evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("aria-label"))
    );
    await cards.nth(titles.indexOf("Découvrir Bloom Fit")).click();
    await expect(page.getByRole("button", { name: "Retirer des favoris" })).toHaveCount(1);

    // Dans l'onglet, les tuiles s'ouvrent en touchant leur titre.
    await page.getByRole("tab", { name: "Mes favoris" }).click();
    await expect(page.getByRole("button", { name: "Bloom Fit", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Retirer des favoris" })).toHaveCount(1);

    // Les favoris sont gardés sur le compte : rechargement…
    await page.reload();
    await page.getByRole("tab", { name: "Mes favoris" }).click();
    await expect(page.getByRole("button", { name: "Bloom Fit", exact: true })).toBeVisible();

    // …et autre appareil.
    const { documentId } = readState().activities.find((activity) => activity.title === "Bloom Fit")!;
    expect((await api<any>("/favorites", {}, user.jwt)).data).toEqual([documentId]);
    const otherDevice = await browser.newContext();
    const otherPage = await otherDevice.newPage();
    await loginAs(otherPage, user, "/activity");
    await otherPage.getByRole("tab", { name: "Mes favoris" }).click();
    await expect(otherPage.getByRole("button", { name: "Bloom Fit", exact: true })).toBeVisible();
    await otherDevice.close();

    // Retirer le cœur depuis l'onglet le fait disparaître.
    await page.getByRole("button", { name: "Retirer des favoris" }).click();
    await expect(page.getByText("Touche le cœur d’une activité pour la retrouver ici.")).toBeVisible();
  });
});

test.describe("fiche d'une activité", () => {
  test("la fiche montre le lieu, le prix, la description et le format", async ({ page }) => {
    const user = await createUser();
    await loginAs(page, user, "/activity");

    await page.getByRole("button", { name: "Découvrir Buddy’s bar" }).click();

    const { documentId } = readState().activities.find((activity) => activity.title === "Buddy’s bar")!;
    await expect(page).toHaveURL(new RegExp(`/activity/${documentId}$`));
    // La liste reste montée dans la pile : on vise la fiche visible.
    const visible = (text: string) => page.getByText(text, { exact: false }).filter({ visible: true });
    await expect(visible("Angers centre")).toBeVisible();
    await expect(visible("8€")).toBeVisible();
    await expect(visible("Bar ambiance en plein centre d’Angers")).toBeVisible();
    await expect(page.getByText("Duo & groupe")).toBeVisible();

    // Le favori ajouté depuis la fiche se retrouve dans la liste.
    await page.getByRole("button", { name: "Ajouter aux favoris" }).click();
    await expect(page.getByRole("button", { name: "Retirer des favoris" })).toBeVisible();
    await page.getByRole("button", { name: "Retour" }).click();
    await page.getByRole("tab", { name: "Mes favoris" }).click();
    await expect(page.getByRole("button", { name: "Buddy’s bar", exact: true })).toBeVisible();
  });

  test("une activité inconnue affiche un message", async ({ page }) => {
    const user = await createUser();
    await loginAs(page, user, "/activity/inexistante");

    await expect(page.getByText("Cette activité n’existe plus.")).toBeVisible();
  });
});

test.describe("réservation", () => {
  test("réserver un créneau l'ajoute à « Mes réservations »", async ({ page, dialogs }) => {
    const user = await createUser({ firstName: "Chloé" });
    const { documentId } = readState().activities.find((activity) => activity.title === "L’atelier des Artistes")!;
    await loginAs(page, user, `/activity/${documentId}`);

    await page.getByRole("button", { name: "Réserver" }).click();
    await expect(page.getByText("Tu peux inviter tes contacts une fois connectés.")).toBeVisible();
    await expect(page.getByLabel("1 personnes")).toBeVisible();

    // Un horaire est obligatoire.
    await page.getByRole("button", { name: "Confirmer" }).click();
    await expect(page.getByText("Choisis un horaire.")).toBeVisible();

    // Demain (le 2e jour de la frise), 17h00.
    const day = page.getByRole("radio").nth(1);
    await day.click();
    await expect(day).toHaveAttribute("aria-checked", "true");
    await page.getByRole("radio", { name: "17h00" }).click();
    await page.getByRole("button", { name: "Confirmer" }).click();

    await expect.poll(() => dialogs).toContainEqual(expect.stringContaining("Réservation envoyée"));
    await expect(page.getByRole("button", { name: "Confirmer" })).toBeHidden();

    // Enregistrée côté serveur…
    const { iso, label } = tomorrow();
    const bookings = await api<any>("/bookings?populate=activity", {}, user.jwt);
    expect(bookings.data).toHaveLength(1);
    expect(bookings.data[0]).toMatchObject({ date: iso, state: "pending" });
    expect(bookings.data[0].time).toMatch(/^17:00/);
    expect(bookings.data[0].activity.documentId).toBe(documentId);

    // …et visible dans l'onglet « Mes réservations ».
    await page.goto("/activity");
    await page.getByRole("tab", { name: "Mes réservations" }).click();
    await expect(page.getByText("L’atelier des Artistes")).toBeVisible();
    await expect(page.getByText(label)).toBeVisible();
    await expect(page.getByText("17h00")).toBeVisible();
  });

  test("on invite ses contacts, dans la limite de l'activité", async ({ page, dialogs, browser }) => {
    const user = await createUser({ firstName: "Manon" });
    const [jules, lou] = await Promise.all([createUser({ firstName: "Jules" }), createUser({ firstName: "Lou" })]);
    await match(user, jules);
    await match(user, lou);

    // Bloom Fit : deux personnes au plus.
    const { documentId } = readState().activities.find((activity) => activity.title === "Bloom Fit")!;
    await loginAs(page, user, `/activity/${documentId}`);
    await page.getByRole("button", { name: "Réserver" }).click();

    const julesBox = page.getByRole("checkbox", { name: "Jules" });
    await julesBox.click();
    await expect(julesBox).toHaveAttribute("aria-checked", "true");
    await expect(page.getByLabel("2 personnes")).toBeVisible();

    await page.getByRole("checkbox", { name: "Lou" }).click();
    await expect(page.getByText("Cette activité est limitée à 2 personnes.")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Lou" })).toHaveAttribute("aria-checked", "false");

    await page.getByRole("radio", { name: "16h30" }).click();
    await page.getByRole("button", { name: "Confirmer" }).click();
    await expect.poll(() => dialogs).toContainEqual(expect.stringContaining("Réservation envoyée"));

    const bookings = await api<any>("/bookings?populate=participants", {}, user.jwt);
    expect(bookings.data[0].participants.map((person: any) => person.id)).toEqual([jules.id]);

    // L'invité voit la réservation, avec l'organisatrice.
    const julesContext = await browser.newContext();
    const julesPage = await julesContext.newPage();
    await loginAs(julesPage, jules, "/activity");
    await julesPage.getByRole("tab", { name: "Mes réservations" }).click();
    await expect(julesPage.getByText("Bloom Fit")).toBeVisible();
    await expect(julesPage.getByText("Avec Manon")).toBeVisible();
    await julesContext.close();
  });

  test("annuler ferme la feuille sans rien réserver", async ({ page }) => {
    const user = await createUser();
    const { documentId } = readState().activities[0];
    await loginAs(page, user, `/activity/${documentId}`);

    await page.getByRole("button", { name: "Réserver" }).click();
    await page.getByRole("radio", { name: "17h30" }).click();
    await page.getByRole("button", { name: "Annuler" }).click();

    await expect(page.getByRole("button", { name: "Confirmer" })).toBeHidden();
    const bookings = await api<any>("/bookings", {}, user.jwt);
    expect(bookings.data).toHaveLength(0);
  });
});
