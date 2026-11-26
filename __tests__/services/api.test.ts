// apiFetch : en-têtes, jeton et messages d'erreur en français.

import { apiFetch } from "@/services/api";

const respond = (status: number, body: any) =>
  ((global as any).fetch = jest.fn(async () => ({ ok: status < 400, status, json: async () => body }))) as jest.Mock;

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

it("envoie du JSON avec le jeton de l'utilisateur", async () => {
  const fetch = respond(200, { data: [] });

  const result = await apiFetch("/activities", { method: "POST", body: "{}" }, "jwt");

  expect(result).toEqual({ data: [] });
  const [url, options] = fetch.mock.calls[0];
  expect(url).toMatch(/\/activities$/);
  expect(options.headers).toMatchObject({ "Content-Type": "application/json", Authorization: "Bearer jwt" });
});

it("laisse le navigateur choisir l'en-tête d'un envoi de fichier", async () => {
  const fetch = respond(200, {});

  await apiFetch("/upload", { method: "POST", body: new FormData() }, "jwt");

  expect(fetch.mock.calls[0][1].headers["Content-Type"]).toBeUndefined();
});

it("garde les en-têtes passés par l'appelant", async () => {
  const fetch = respond(200, {});

  await apiFetch("/x", { headers: { "X-Test": "1" } }, "jwt");

  expect(fetch.mock.calls[0][1].headers["X-Test"]).toBe("1");
});

it.each([
  ["Invalid identifier or password", "Adresse email ou mot de passe incorrect."],
  ["Email or Username are already taken", "Cette adresse email est déjà utilisée."],
  ["Username is already taken", "Ce nom d'utilisateur est déjà utilisé."],
  ["Incorrect code provided", "Ce lien n’est plus valable. Fais une nouvelle demande."],
  ["Something unexpected", "Une erreur est survenue. Veuillez réessayer."],
  ["Forbidden", "Une erreur est survenue. Veuillez réessayer."],
  // Les messages de l'API Bondiz, déjà en français, passent tels quels.
  ["Mot de passe incorrect.", "Mot de passe incorrect."],
  ["Cette activité est limitée à 2 personnes.", "Cette activité est limitée à 2 personnes."],
])("traduit l'erreur « %s »", async (message, expected) => {
  respond(400, { error: { message } });
  await expect(apiFetch("/auth/local")).rejects.toThrow(`400: ${expected}`);
});

it("explique une coupure réseau", async () => {
  (global as any).fetch = jest.fn(async () => {
    throw new TypeError("Failed to fetch");
  });
  await expect(apiFetch("/activities")).rejects.toThrow("Impossible de se connecter au serveur");
});

it("explique une réponse illisible", async () => {
  (global as any).fetch = jest.fn(async () => ({
    ok: false,
    status: 502,
    json: async () => {
      throw new SyntaxError("Unexpected token <");
    },
  }));
  await expect(apiFetch("/activities")).rejects.toThrow("Le serveur rencontre un problème");
});
