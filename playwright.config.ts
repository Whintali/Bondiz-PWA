import { defineConfig } from "@playwright/test";
import path from "path";

// Tests de bout en bout de la PWA : le build web de production (avec son
// service worker) est servi en local et parle à un vrai Strapi, lancé sur
// une base SQLite jetable recréée à chaque exécution.

export const API_PORT = 1338;
export const APP_PORT = 8095;
const LOCAL_API = `http://127.0.0.1:${API_PORT}/api`;
// Build à part : dist/ reste celui de la prod.
const BUILD_DIR = "e2e/.dist";
const STRAPI_DIR = path.join(__dirname, "../strapi-mydsu");

// Strapi local : base de test, fichiers en local (jamais Supabase).
const strapiEnv = [
  "DATABASE_CLIENT=sqlite",
  "DATABASE_FILENAME=.tmp/e2e.db",
  "DATABASE_URL=",
  "SUPABASE_API_URL=",
  "DATABASE_API_URL=",
  "HOST=127.0.0.1",
  `PORT=${API_PORT}`,
].join(" ");

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  // Les scénarios créent leurs propres comptes : ils peuvent tourner en
  // parallèle sans se gêner.
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { outputFolder: "e2e/.report", open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    // Chrome déjà installé sur la machine, au format d'un iPhone récent.
    channel: "chrome",
    viewport: { width: 402, height: 874 },
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: `rm -f .tmp/e2e.db && ${strapiEnv} npx strapi develop --no-watch-admin`,
      cwd: STRAPI_DIR,
      url: `http://127.0.0.1:${API_PORT}/_health`,
      timeout: 180_000,
      reuseExistingServer: false,
      stdout: process.env.E2E_STRAPI_LOGS ? "pipe" : "ignore",
    },
    {
      // L'adresse de l'API est figée au moment du build. --clear est
      // indispensable : sans lui Metro réutilise les variables EXPO_PUBLIC_*
      // déjà inlinées (celles du .env, donc la prod). Le build est ensuite
      // contrôlé : s'il ne vise pas le Strapi local, rien n'est lancé.
      command: [
        `EXPO_PUBLIC_STRAPI_URL=${LOCAL_API} EXPO_PUBLIC_STRAPI_TOKEN= npx expo export -p web --clear --output-dir ${BUILD_DIR}`,
        `node e2e/support/check-build.mjs ${BUILD_DIR} ${LOCAL_API}`,
        `node e2e/support/serve.mjs ${BUILD_DIR} ${APP_PORT}`,
      ].join(" && "),
      url: `http://localhost:${APP_PORT}`,
      timeout: 240_000,
      reuseExistingServer: false,
      stdout: "ignore",
    },
  ],
});
