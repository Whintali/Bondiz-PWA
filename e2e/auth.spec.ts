// Accueil, connexion, inscription avec le questionnaire, déconnexion.

import { adminUser, api, createUser } from "./support/api";
import { expect, loginAs, test } from "./support/fixtures";

test.describe("accueil", () => {
  test("un visiteur arrive sur l'accueil et peut se connecter ou s'inscrire", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/welcome$/);
    await expect(page.getByText("Rencontrez des personnes qui partagent vos")).toBeVisible();

    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/welcome");
    await page.getByRole("button", { name: "S’inscrire" }).click();
    await expect(page).toHaveURL(/\/register$/);
  });

  test("les écrans de l'app renvoient un visiteur non connecté à l'accueil", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/\/welcome$/);
  });
});

test.describe("connexion", () => {
  test("un compte existant se connecte et arrive sur la découverte", async ({ page }) => {
    const user = await createUser({ firstName: "Nina" });

    await page.goto("/login");
    await page.getByLabel("Adresse mail").fill(user.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Connexion" }).click();

    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("tab", { name: "Accueil" })).toHaveAttribute("aria-selected", "true");
  });

  test("un mauvais mot de passe affiche une erreur en français", async ({ page }) => {
    const user = await createUser();

    await page.goto("/login");
    await page.getByLabel("Adresse mail").fill(user.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill("mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Connexion" }).click();

    await expect(page.getByText("Adresse email ou mot de passe incorrect.", { exact: false })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("les champs vides sont signalés", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Connexion" }).click();
    await expect(page.getByText("Veuillez remplir tous les champs")).toBeVisible();
  });

  test("le mot de passe peut être affiché puis masqué", async ({ page }) => {
    await page.goto("/login");
    const field = page.getByLabel("Mot de passe", { exact: true });
    await field.fill("secret123");

    await expect(field).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Afficher le mot de passe" }).click();
    await expect(field).not.toHaveAttribute("type", "password");
  });
});

test.describe("inscription", () => {
  test("les erreurs du formulaire sont signalées avant le questionnaire", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Adresse mail").fill("nouveau@test.bondiz.local");
    await page.getByLabel("Mot de passe", { exact: true }).fill("motdepasse1");
    await page.getByLabel("Confirmer le mot de passe").fill("autre-chose");
    await page.getByRole("button", { name: "S’inscrire" }).click();
    await expect(page.getByText("Les mots de passe ne correspondent pas")).toBeVisible();

    await page.getByLabel("Mot de passe", { exact: true }).fill("court");
    await page.getByLabel("Confirmer le mot de passe").fill("court");
    await page.getByRole("button", { name: "S’inscrire" }).click();
    await expect(page.getByText("Le mot de passe doit contenir au minimum 8 caractères")).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test("un nouveau compte est créé au bout des cinq étapes du questionnaire", async ({ page }) => {
    const email = `inscription_${Date.now()}@test.bondiz.local`;
    const password = "Inscription-e2e-1";

    await page.goto("/register");
    await page.getByLabel("Adresse mail").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(password);
    await page.getByLabel("Confirmer le mot de passe").fill(password);
    await page.getByLabel("Numéro de téléphone").fill("06 12 34 56 78");
    await page.getByRole("button", { name: "S’inscrire" }).click();

    // 1. Prénom et nom
    await expect(page.getByText("Salut toi !")).toBeVisible();
    await page.getByRole("button", { name: "Suivant" }).click();
    await expect(page.getByText("Indique ton prénom pour continuer.")).toBeVisible();
    await page.getByLabel("Prénom").fill("Camille");
    await page.getByLabel("Nom", { exact: true }).fill("Durand");
    await page.getByRole("button", { name: "Suivant" }).click();

    // 2. Genre : un choix fait passer à l'étape suivante
    await page.getByRole("button", { name: "Je suis une femme" }).click();

    // 3. Ville
    await page.getByLabel("Rechercher une ville").fill("Angers");
    await page.getByRole("button", { name: "Suivant" }).click();

    // 4. Âge, saisi par la date de naissance
    await page.getByRole("button", { name: /Âge/ }).click();
    await page.getByLabel("Date").fill("1999-04-12");
    await page.getByRole("button", { name: "Confirmer", exact: true }).click();
    await expect(page.getByLabel("Âge", { exact: true })).toHaveValue(/^\d+ ans$/);
    await page.getByRole("button", { name: "Suivant" }).click();

    // 5. Centres d'intérêt : au moins cinq
    await expect(page.getByText("Sélectionne tes hobbies")).toBeVisible();
    for (const hobby of ["Yoga", "Cuisine", "Lecture"]) {
      await page.getByRole("checkbox", { name: hobby }).click();
    }
    await page.getByRole("button", { name: "Terminer" }).click();
    await expect(page.getByText("Choisis au moins 5 centres d’intérêt (3/5).")).toBeVisible();

    for (const hobby of ["Danse", "Cinéma"]) {
      await page.getByRole("checkbox", { name: hobby }).click();
    }
    await page.getByRole("button", { name: "Terminer" }).click();

    await expect(page).toHaveURL(/\/home$/);

    // Le profil enregistré correspond aux réponses.
    const login = await api<any>("/auth/local", { method: "POST", body: JSON.stringify({ identifier: email, password }) });
    const profile = await api<any>("/users/me?populate=interestTags", {}, login.jwt);
    expect(profile).toMatchObject({ firstName: "Camille", gender: "femme", city: "Angers", age: "1999-04-12" });
    // Nom et téléphone sont privés : seule l'administration les voit.
    const record = await adminUser(profile.documentId);
    expect(record.lastName).toBe("Durand");
    expect(record.phone).toBe("0612345678");
    expect(profile.interestTags.map((tag: any) => tag.name).sort()).toEqual(["Cinéma", "Cuisine", "Danse", "Lecture", "Yoga"]);
  });

  test("le nom de famille n'est pas enregistré si l'utilisateur le refuse", async ({ page }) => {
    const email = `sansnom_${Date.now()}@test.bondiz.local`;
    const password = "Inscription-e2e-2";

    await page.goto("/register");
    await page.getByLabel("Adresse mail").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(password);
    await page.getByLabel("Confirmer le mot de passe").fill(password);
    await page.getByRole("button", { name: "S’inscrire" }).click();

    await page.getByLabel("Prénom").fill("Léo");
    await page.getByLabel("Nom", { exact: true }).fill("Martin");
    await page.getByRole("checkbox", { name: /nom de famille/ }).click();
    await page.getByRole("button", { name: "Suivant" }).click();
    await page.getByRole("button", { name: "Je suis un homme" }).click();
    await page.getByLabel("Rechercher une ville").fill("Nantes");
    await page.getByRole("button", { name: "Suivant" }).click();
    await page.getByRole("button", { name: /Âge/ }).click();
    await page.getByLabel("Date").fill("1995-01-20");
    await page.getByRole("button", { name: "Confirmer", exact: true }).click();
    await page.getByRole("button", { name: "Suivant" }).click();
    for (const hobby of ["Sport", "Yoga", "Cuisine", "Lecture", "Musique"]) {
      await page.getByRole("checkbox", { name: hobby }).click();
    }
    await page.getByRole("button", { name: "Terminer" }).click();
    await expect(page).toHaveURL(/\/home$/);

    const login = await api<any>("/auth/local", { method: "POST", body: JSON.stringify({ identifier: email, password }) });
    const profile = await api<any>("/users/me", {}, login.jwt);
    expect(profile.firstName).toBe("Léo");
    expect((await adminUser(profile.documentId)).lastName ?? null).toBeNull();
  });

  test("un utilisateur doit avoir au moins 18 ans", async ({ page }) => {
    await page.goto("/questionnaire?email=mineur%40test.bondiz.local&password=x");
    await page.getByLabel("Prénom").fill("Jeune");
    await page.getByRole("button", { name: "Suivant" }).click();
    await page.getByRole("button", { name: "Je suis un homme" }).click();
    await page.getByLabel("Rechercher une ville").fill("Angers");
    await page.getByRole("button", { name: "Suivant" }).click();
    await page.getByRole("button", { name: /Âge/ }).click();

    await expect(page.getByLabel("Date")).toHaveAttribute("max", /^\d{4}-\d{2}-\d{2}$/);
    const max = await page.getByLabel("Date").getAttribute("max");
    expect(new Date().getFullYear() - Number(max!.slice(0, 4))).toBe(18);
  });
});

test("la déconnexion ferme la session", async ({ page }) => {
  const user = await createUser();
  await loginAs(page, user, "/settings");

  await page.getByText("Se déconnecter").click();

  await expect(page).toHaveURL(/\/welcome$/);
  expect(await page.evaluate(() => localStorage.getItem("auth_token"))).toBeNull();
  await page.goto("/home");
  await expect(page).toHaveURL(/\/welcome$/);
});
