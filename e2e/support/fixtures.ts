import { expect, Page, test as base } from "@playwright/test";
import { me, TestUser } from "./api";

/**
 * Ouvre l'app avec une session déjà enregistrée, comme après une connexion :
 * la PWA garde le jeton et le profil dans localStorage.
 */
export async function loginAs(page: Page, user: TestUser, route = "/home") {
  const profile = await me(user);
  await page.addInitScript(
    ([jwt, json]) => {
      // Une seule fois par onglet : une déconnexion doit pouvoir effacer la session.
      if (sessionStorage.getItem("e2e-session")) return;
      sessionStorage.setItem("e2e-session", "1");
      localStorage.setItem("auth_token", jwt);
      localStorage.setItem("auth_user", json);
    },
    [user.jwt, JSON.stringify(profile)] as const
  );
  await page.goto(route);
}

export const test = base.extend<{ dialogs: string[] }>({
  // Les alertes de la PWA passent par window.alert : on les accepte et on
  // garde leur texte pour les vérifier.
  dialogs: async ({ page }, use) => {
    const messages: string[] = [];
    page.on("dialog", async (dialog) => {
      messages.push(dialog.message());
      await dialog.accept();
    });
    await use(messages);
  },
});

export { expect };
