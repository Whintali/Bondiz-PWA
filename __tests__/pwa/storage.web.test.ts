// Sur le web, la session est gardée dans localStorage (expo-secure-store
// n'existe pas dans le navigateur).

import * as storage from "@/utils/storage";

beforeEach(() => localStorage.clear());

it("utilise la version web du module", () => {
  expect(require.resolve("@/utils/storage")).toMatch(/storage\.web\.ts$/);
});

it("écrit, relit et supprime une valeur", async () => {
  await storage.setItem("auth_token", "jwt");
  expect(localStorage.getItem("auth_token")).toBe("jwt");
  expect(await storage.getItem("auth_token")).toBe("jwt");

  await storage.deleteItem("auth_token");
  expect(await storage.getItem("auth_token")).toBeNull();
});

it("renvoie null pour une clé absente", async () => {
  expect(await storage.getItem("inconnue")).toBeNull();
});
