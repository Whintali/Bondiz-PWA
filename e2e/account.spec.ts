// Mot de passe oublié, et droits RGPD : export des données et suppression
// du compte.

import fs from "fs";
import { api, createUser, match, resetCodeFor, sendMessage } from "./support/api";
import { expect, loginAs, test } from "./support/fixtures";

test.describe("mot de passe oublié", () => {
  test("le lien de la connexion envoie un e-mail de réinitialisation", async ({ page }) => {
    const user = await createUser();

    await page.goto("/login");
    await page.getByLabel("Adresse mail").fill(user.email);
    await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();

    await expect(page).toHaveURL(/\/forgot-password/);
    // L'adresse déjà saisie est reprise.
    await expect(page.getByLabel("Adresse mail").filter({ visible: true })).toHaveValue(user.email);
    await page.getByRole("button", { name: "Envoyer le lien" }).click();

    await expect(page.getByText(`Si un compte existe pour ${user.email}`, { exact: false })).toBeVisible();
    // Un code a été généré pour ce compte.
    expect(resetCodeFor(user.email)).toBeTruthy();
  });

  test("une adresse invalide est signalée, une adresse inconnue ne l'est pas", async ({ page }) => {
    await page.goto("/forgot-password");

    await page.getByLabel("Adresse mail").fill("pas-une-adresse");
    await page.getByRole("button", { name: "Envoyer le lien" }).click();
    await expect(page.getByText("Indique une adresse mail valide.")).toBeVisible();

    // On ne révèle pas si une adresse a un compte.
    await page.getByLabel("Adresse mail").fill("personne@test.bondiz.local");
    await page.getByRole("button", { name: "Envoyer le lien" }).click();
    await expect(page.getByText("Si un compte existe pour personne@test.bondiz.local", { exact: false })).toBeVisible();
  });

  test("le lien de l'e-mail permet de choisir un nouveau mot de passe", async ({ page }) => {
    const user = await createUser();
    await api("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: user.email }) });
    const code = resetCodeFor(user.email);
    expect(code).toBeTruthy();

    await page.goto(`/reset-password?code=${code}`);
    await page.getByLabel("Nouveau mot de passe").fill("court");
    await page.getByLabel("Confirmer le mot de passe").fill("court");
    await page.getByRole("button", { name: "Valider" }).click();
    await expect(page.getByText("Le mot de passe doit contenir au moins 8 caractères.")).toBeVisible();

    await page.getByLabel("Nouveau mot de passe").fill("Nouveau-mdp-42");
    await page.getByLabel("Confirmer le mot de passe").fill("Nouveau-mdp-43");
    await page.getByRole("button", { name: "Valider" }).click();
    await expect(page.getByText("Les mots de passe ne correspondent pas.")).toBeVisible();

    await page.getByLabel("Confirmer le mot de passe").fill("Nouveau-mdp-42");
    await page.getByRole("button", { name: "Valider" }).click();
    await expect(page.getByText("C’est fait !", { exact: false })).toBeVisible();

    // Connexion avec le nouveau mot de passe, depuis l'app.
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.getByLabel("Adresse mail").fill(user.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill("Nouveau-mdp-42");
    await page.getByRole("button", { name: "Connexion" }).click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test("un lien déjà utilisé ou faux est refusé", async ({ page }) => {
    await page.goto("/reset-password?code=faux-code");
    await page.getByLabel("Nouveau mot de passe").fill("Nouveau-mdp-42");
    await page.getByLabel("Confirmer le mot de passe").fill("Nouveau-mdp-42");
    await page.getByRole("button", { name: "Valider" }).click();
    await expect(page.getByText("Ce lien n’est plus valable. Fais une nouvelle demande.")).toBeVisible();

    await page.goto("/reset-password");
    await expect(page.getByText("Ce lien est incomplet.", { exact: false })).toBeVisible();
  });
});

test.describe("données personnelles", () => {
  test("l'utilisateur télécharge toutes ses données", async ({ page }) => {
    const user = await createUser({ firstName: "Héloïse", city: "Angers" });
    const friend = await createUser({ firstName: "Marius" });
    const matchId = await match(user, friend);
    await sendMessage(user, matchId, "Partante pour un bowling ?");

    await loginAs(page, user, "/settings");

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Télécharger mes données/ }).click();
    const file = await download;

    expect(file.suggestedFilename()).toBe("bondiz-mes-donnees.json");
    const data = JSON.parse(fs.readFileSync(await file.path(), "utf8"));
    expect(data.compte).toMatchObject({ email: user.email, prenom: "Héloïse", ville: "Angers" });
    expect(data.connexions).toHaveLength(1);
    expect(data.messages).toEqual([expect.objectContaining({ sens: "envoyé", contenu: "Partante pour un bowling ?" })]);
  });

  test("la suppression du compte demande le mot de passe puis efface tout", async ({ page, dialogs }) => {
    const user = await createUser();
    const friend = await createUser();
    const matchId = await match(user, friend);
    await sendMessage(friend, matchId, "Salut !");

    await loginAs(page, user, "/settings");
    await page.getByRole("button", { name: "Supprimer mon compte" }).click();
    await expect(page.getByText("Cette action est irréversible.", { exact: false })).toBeVisible();

    const password = page.getByLabel("Mot de passe pour confirmer la suppression");
    const confirm = page.getByRole("button", { name: "SUPPRIMER DÉFINITIVEMENT" });

    await confirm.click();
    await expect(page.getByText("Indique ton mot de passe pour confirmer.")).toBeVisible();

    await password.fill("pas-le-bon");
    await confirm.click();
    await expect(page.getByText("Mot de passe incorrect.")).toBeVisible();

    await password.fill(user.password);
    await confirm.click();

    await expect(page).toHaveURL(/\/welcome$/);
    await expect.poll(() => dialogs.at(-1)).toContain("Ton compte et toutes tes données ont été effacés.");

    // Plus de connexion possible, et l'autre membre ne voit plus la conversation.
    await expect(
      api("/auth/local", { method: "POST", body: JSON.stringify({ identifier: user.email, password: user.password }) })
    ).rejects.toThrow(/400/);
    expect((await api<any>("/conversations", {}, friend.jwt)).data).toEqual([]);
  });
});
