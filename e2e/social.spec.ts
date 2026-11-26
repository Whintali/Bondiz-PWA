// Découverte des profils, likes, match, fiche « À propos », messagerie.
//
// La découverte trie les profils par ancienneté : chaque scénario like
// d'abord tous les autres comptes (onlyDiscover) pour que ses propres profils
// arrivent en tête, même si d'autres tests en créent en parallèle.

import { api, createUser, like, match, onlyDiscover, sendMessage } from "./support/api";
import { expect, loginAs, test } from "./support/fixtures";

test.describe("découverte", () => {
  test("les profils à découvrir s'affichent en plein écran", async ({ page }) => {
    const viewer = await createUser({ firstName: "Viewer" });
    const sarah = await createUser({ firstName: "Sarah", city: "Nantes" });
    await onlyDiscover(viewer, [sarah]);

    await loginAs(page, viewer);

    const card = page.getByRole("button", { name: "Voir le profil de Sarah" });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Nantes");
    await expect(page.getByRole("tab", { name: "Accueil" })).toHaveAttribute("aria-selected", "true");
  });

  test("un message s'affiche quand il n'y a plus personne à découvrir", async ({ page }) => {
    const viewer = await createUser({ firstName: "Solo" });
    // Les autres tests créent des comptes en parallèle : la liste vide est
    // simulée plutôt qu'attendue du serveur.
    await page.route("**/api/discover*", (route) => route.fulfill({ json: { data: [] } }));

    await loginAs(page, viewer);

    await expect(page.getByText("Aucun profil à découvrir autour de toi pour le moment.")).toBeVisible();
  });

  test("un like sans réciprocité est enregistré sans créer de match", async ({ page }) => {
    const viewer = await createUser({ firstName: "Hugo" });
    const ines = await createUser({ firstName: "Ines" });
    await onlyDiscover(viewer, [ines]);

    await loginAs(page, viewer);
    await expect(page.getByRole("button", { name: "Voir le profil de Ines" })).toBeVisible();

    await page.getByRole("button", { name: "J’aime" }).first().click();

    await expect(page.getByRole("button", { name: "Déjà aimé" }).first()).toBeVisible();
    await expect(page.getByText("Vous êtes")).toBeHidden();

    // Le profil liké ne revient plus dans la découverte.
    const discover = await api<any>("/discover?pageSize=100", {}, viewer.jwt);
    expect(discover.data.map((user: any) => user.id)).not.toContain(ines.id);
  });

  test("un like réciproque ouvre l'écran de match puis la conversation", async ({ page }) => {
    const viewer = await createUser({ firstName: "Lucas", interests: ["Yoga", "Cuisine", "Lecture"] });
    const emma = await createUser({ firstName: "Emma", interests: ["Yoga", "Cuisine", "Danse"] });
    await like(emma, viewer);
    await onlyDiscover(viewer, [emma]);

    await loginAs(page, viewer);
    await expect(page.getByRole("button", { name: "Voir le profil de Emma" })).toBeVisible();
    await page.getByRole("button", { name: "J’aime" }).first().click();

    await expect(page.getByText("Toi et Emma avez des choses en commun !")).toBeVisible();
    await expect(page.getByText("2 centres d’intérêt")).toBeVisible();

    await page.getByRole("button", { name: "Écrire à Emma" }).click();
    await expect(page).toHaveURL(/\/chat\/\w+$/);
    await expect(page.getByText("Dis bonjour à Emma !")).toBeVisible();
  });

  test("le match propose aussi d'organiser une activité", async ({ page }) => {
    const viewer = await createUser({ firstName: "Paul" });
    const lea = await createUser({ firstName: "Léa" });
    await like(lea, viewer);
    await onlyDiscover(viewer, [lea]);

    await loginAs(page, viewer);
    await page.getByRole("button", { name: "J’aime" }).first().click();
    await page.getByRole("button", { name: "Organiser une activité" }).click();

    await expect(page).toHaveURL(/\/activity$/);
  });
});

test.describe("fiche d'un profil", () => {
  test("la fiche « À propos » montre la présentation et les centres d'intérêt", async ({ page }) => {
    const viewer = await createUser({ firstName: "Nora" });
    const tom = await createUser({ firstName: "Tom", city: "Tours", bio: "Fan de randonnée et de jeux de société.", interests: ["Lecture", "Musique"] });
    await onlyDiscover(viewer, [tom]);

    await loginAs(page, viewer);
    await page.getByRole("button", { name: "Voir le profil de Tom" }).click();

    await expect(page).toHaveURL(new RegExp(`/user/${tom.id}`));
    await expect(page.getByText("À PROPOS")).toBeVisible();
    await expect(page.getByText("Fan de randonnée et de jeux de société.")).toBeVisible();
    await expect(page.getByText("Lecture", { exact: true })).toBeVisible();
    await expect(page.getByText("Musique", { exact: true })).toBeVisible();

    // On peut liker depuis la fiche.
    await page.getByRole("button", { name: "J’aime" }).click();
    await expect(page.getByRole("button", { name: "Déjà aimé" })).toBeVisible();

    // Le retour ramène à la découverte.
    await page.getByRole("button", { name: "Retour" }).click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test("un profil supprimé ou inconnu affiche un message", async ({ page }) => {
    const viewer = await createUser({ firstName: "Iris" });

    await loginAs(page, viewer, "/user/999999");

    await expect(page.getByText("Ce profil n’est plus disponible.")).toBeVisible();
  });
});

test.describe("messages", () => {
  test("sans match, la messagerie explique comment démarrer", async ({ page }) => {
    const viewer = await createUser({ firstName: "Zoé" });

    await loginAs(page, viewer, "/messages");

    await expect(page.getByText("MESSAGES")).toBeVisible();
    await expect(page.getByText("Aucune conversation pour le moment")).toBeVisible();
  });

  test("les conversations affichent le dernier message et les non-lus", async ({ page }) => {
    const viewer = await createUser({ firstName: "Jade" });
    const malo = await createUser({ firstName: "Malo" });
    const matchId = await match(viewer, malo);
    await sendMessage(malo, matchId, "Salut, ça te dit un ciné ?");

    await loginAs(page, viewer, "/messages");

    await expect(page.getByText("Connexions récentes")).toBeVisible();
    await expect(page.getByRole("button", { name: "Discuter avec Malo" })).toBeVisible();
    const row = page.getByRole("button", { name: /Malo.*Salut, ça te dit un ciné \?/ });
    await expect(row).toBeVisible();
    await expect(row.getByRole("img", { name: "Non lu" })).toBeVisible();

    await row.click();
    await expect(page).toHaveURL(new RegExp(`/chat/${matchId}$`));
    // L'écran Messages reste monté dans la pile : on vise le fil visible.
    await expect(page.getByText("Salut, ça te dit un ciné ?").filter({ visible: true })).toBeVisible();

    // Ouvrir la conversation marque le message comme lu.
    await page.getByRole("button", { name: "Retour" }).click();
    await expect(page.getByRole("button", { name: /Malo/ }).last()).toBeVisible();
    await expect(page.getByRole("img", { name: "Non lu" })).toHaveCount(0);
  });

  test("un message envoyé apparaît dans le fil et chez le destinataire", async ({ page }) => {
    const viewer = await createUser({ firstName: "Adam" });
    const lina = await createUser({ firstName: "Lina" });
    const matchId = await match(viewer, lina);

    await loginAs(page, viewer, `/chat/${matchId}`);
    await expect(page.getByText("Dis bonjour à Lina !")).toBeVisible();

    // Envoi avec le bouton…
    const input = page.getByPlaceholder("Envoyer un chat");
    await input.fill("Bonjour Lina !");
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByText("Bonjour Lina !")).toBeVisible();
    await expect(input).toHaveValue("");

    // …ou avec Entrée.
    await input.fill("Tu es dispo samedi ?");
    await input.press("Enter");
    await expect(page.getByText("Tu es dispo samedi ?")).toBeVisible();

    const received = await api<any>(`/conversations/${matchId}/messages?pageSize=100`, {}, lina.jwt);
    expect(received.data.map((message: any) => message.content)).toEqual(["Bonjour Lina !", "Tu es dispo samedi ?"]);

    // Une réponse arrive sans recharger la page.
    await sendMessage(lina, matchId, "Oui, avec plaisir !");
    await expect(page.getByText("Oui, avec plaisir !")).toBeVisible({ timeout: 15_000 });
  });

  test("le « + » de la conversation propose une activité", async ({ page }) => {
    const viewer = await createUser({ firstName: "Eva" });
    const noe = await createUser({ firstName: "Noé" });
    const matchId = await match(viewer, noe);

    await loginAs(page, viewer, `/chat/${matchId}`);
    await page.getByRole("button", { name: "Proposer une activité" }).click();

    await expect(page).toHaveURL(/\/activity$/);
  });

  test("une conversation qui n'est pas la sienne renvoie à la messagerie", async ({ page }) => {
    const viewer = await createUser({ firstName: "Rose" });
    const [a, b] = await Promise.all([createUser({ firstName: "Alex" }), createUser({ firstName: "Sam" })]);
    const othersMatch = await match(a, b);

    await loginAs(page, viewer, `/chat/${othersMatch}`);

    await expect(page).toHaveURL(/\/messages$/);
  });
});
