// Ce qui fait de Bondiz une PWA : manifeste, icônes, service worker,
// fonctionnement hors connexion.

import { expect, test } from "./support/fixtures";

test.describe("installation", () => {
  test("la page déclare le manifeste, la couleur du thème et l'icône iOS", async ({ page }) => {
    await page.goto("/welcome");

    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.json");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#8432fe");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/apple-touch-icon.png");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test("le manifeste et ses icônes sont servis", async ({ request }) => {
    const response = await request.get("/manifest.json");
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    expect(manifest).toMatchObject({ name: "Bondiz", display: "standalone", start_url: "/" });

    for (const icon of manifest.icons) {
      const iconResponse = await request.get(icon.src);
      expect(iconResponse.ok(), icon.src).toBe(true);
      expect(iconResponse.headers()["content-type"]).toContain("image/png");
    }
  });
});

test.describe("service worker", () => {
  test("s'enregistre et prend le contrôle de la page", async ({ page }) => {
    await page.goto("/welcome");

    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(scope).toBe(new URL("/", page.url()).href);

    await page.reload();
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  });

  test("met en cache la coquille de l'app et les fichiers du build", async ({ page }) => {
    await page.goto("/welcome");
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.reload();
    await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();

    const cached = await page.evaluate(async () => {
      const cache = await caches.open("bondiz-v1");
      return (await cache.keys()).map((request) => new URL(request.url).pathname);
    });
    expect(cached).toEqual(expect.arrayContaining(["/", "/manifest.json", "/icons/icon-192.png"]));
    expect(cached.some((url) => url.startsWith("/_expo/static/js/"))).toBe(true);
  });

  test("l'app s'ouvre hors connexion", async ({ page, context }) => {
    await page.goto("/welcome");
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.reload();
    await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByText("Rencontrez des personnes qui partagent vos")).toBeVisible();
    await expect(page.getByRole("button", { name: "S’inscrire" })).toBeVisible();
    await context.setOffline(false);
  });

  test("n'intercepte pas les appels à l'API", async ({ page }) => {
    await page.goto("/welcome");
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.reload();

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/interest-categories")),
      page.evaluate(() => fetch("http://127.0.0.1:1338/api/interest-categories")),
    ]);
    expect(response.fromServiceWorker()).toBe(false);
  });
});
