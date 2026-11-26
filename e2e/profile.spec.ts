// Mon profil (statistiques, modification, photos), paramètres du compte et
// barre de navigation.

import path from "path";
import { api, createUser, match, me, readState } from "./support/api";
import { expect, loginAs, test } from "./support/fixtures";

test.describe("mon profil", () => {
  test("le profil montre l'identité, les centres d'intérêt et les statistiques", async ({ page }) => {
    const user = await createUser({ firstName: "Clara", interests: ["Yoga", "Lecture"] });
    const friend = await createUser({ firstName: "Basile" });
    await match(user, friend);
    await api("/bookings", {
      method: "POST",
      body: JSON.stringify({
        data: { activity: readState().activities[0].documentId, date: "2030-05-04", time: "17:00", participants: [], state: "pending" },
      }),
    }, user.jwt);

    await loginAs(page, user, "/profile");

    await expect(page.getByText("MON PROFIL", { exact: true })).toBeVisible();
    await expect(page.getByText("Clara", { exact: true })).toBeVisible();
    await expect(page.getByText(user.username)).toBeVisible();
    await expect(page.getByText("Yoga", { exact: true })).toBeVisible();
    await expect(page.getByText("Lecture", { exact: true })).toBeVisible();

    const stat = (label: string) => page.getByText(label, { exact: true }).locator("..");
    await expect(stat("Connexions")).toContainText("1");
    await expect(stat("Activités")).toContainText("1");
    await expect(page.getByRole("img", { name: "Photo 1" })).toBeVisible();
  });

  test("le prénom et la présentation se modifient", async ({ page }) => {
    const user = await createUser({ firstName: "Ancien" });
    await loginAs(page, user, "/profile");

    await page.getByRole("button", { name: "Modifier mon profil" }).click();
    await page.getByPlaceholder("Ton prénom").fill("Nouveau");
    await page.getByPlaceholder("Décrivez-vous...").fill("J'aime le théâtre et les balades en forêt.");
    await page.getByText("Enregistrer", { exact: true }).click();

    await expect(page.getByPlaceholder("Ton prénom")).toBeHidden();
    await expect(page.getByText("Nouveau", { exact: true })).toBeVisible();

    const profile = await me(user);
    expect(profile).toMatchObject({ firstName: "Nouveau", bio: "J'aime le théâtre et les balades en forêt." });
  });

  test("une photo s'ajoute depuis l'appareil", async ({ page }) => {
    const user = await createUser();
    await loginAs(page, user, "/profile");
    await expect(page.getByRole("img", { name: "Photo 1" })).toBeVisible();

    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Ajouter une photo" }).click();
    await (await chooser).setFiles(path.join(__dirname, "fixtures/avatar.png"));

    await expect(page.getByRole("img", { name: "Photo 2" })).toBeVisible({ timeout: 20_000 });
    expect((await me(user)).self_image).toHaveLength(2);
  });

  test("l'agenda mène aux réservations", async ({ page }) => {
    const user = await createUser();
    await loginAs(page, user, "/profile");

    await page.getByRole("button", { name: "Voir mes réservations" }).click();
    await expect(page).toHaveURL(/\/activity$/);
  });
});

test.describe("paramètres", () => {
  test("le mot de passe se change après vérification de l'actuel", async ({ page, dialogs }) => {
    const user = await createUser();
    await loginAs(page, user, "/profile");

    await page.getByRole("button", { name: "Paramètres" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByText("PARAMÈTRES")).toBeVisible();

    await page.getByText("Modifier le mot de passe").click();
    const current = page.getByPlaceholder("********").first();
    const next = page.getByPlaceholder("Min. 8 caractères");
    const confirm = page.getByPlaceholder("********").last();
    const submit = page.getByText("MODIFIER", { exact: true });

    // Champs vides.
    await submit.click();
    await expect.poll(() => dialogs.at(-1)).toContain("Veuillez remplir tous les champs.");

    // Confirmation différente.
    await current.fill(user.password);
    await next.fill("Nouveau-mdp-123");
    await confirm.fill("Autre-mdp-123");
    await submit.click();
    await expect.poll(() => dialogs.at(-1)).toContain("ne correspondent pas");

    // Mot de passe actuel faux.
    await current.fill("pas-le-bon-mdp");
    await confirm.fill("Nouveau-mdp-123");
    await submit.click();
    await expect.poll(() => dialogs.length).toBe(3);
    expect(dialogs.at(-1)).not.toContain("Succès");

    // Tout est bon.
    await current.fill(user.password);
    await submit.click();
    await expect.poll(() => dialogs.at(-1)).toContain("modifié avec succès");

    const login = await api<any>("/auth/local", {
      method: "POST",
      body: JSON.stringify({ identifier: user.email, password: "Nouveau-mdp-123" }),
    });
    expect(login.jwt).toBeTruthy();
  });
});

test.describe("navigation", () => {
  test("la barre du bas mène à chaque section", async ({ page }) => {
    const user = await createUser();
    await loginAs(page, user, "/home");

    const tab = (name: string) => page.getByRole("tab", { name }).filter({ visible: true });
    const sections: [string, RegExp, string][] = [
      ["Activités", /\/activity$/, "ACTIVITÉS"],
      ["Carte", /\/map$/, "CARTE"],
      ["Messages", /\/messages$/, "MESSAGES"],
      ["Profil", /\/profile$/, "MON PROFIL"],
      ["Accueil", /\/home$/, ""],
    ];

    for (const [name, url, text] of sections) {
      await tab(name).click();
      await expect(page).toHaveURL(url);
      await expect(tab(name)).toHaveAttribute("aria-selected", "true");
      if (text) await expect(page.getByText(text, { exact: true }).filter({ visible: true })).toBeVisible();
    }
  });
});
