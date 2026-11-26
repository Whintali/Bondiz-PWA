// Accès direct à l'API Strapi de test : créer des comptes, des likes, des
// messages… pour mettre chaque scénario dans l'état voulu.

import { randomBytes } from "crypto";
import fs from "fs";
import { createRequire } from "module";
import path from "path";

export const API_URL = "http://127.0.0.1:1338/api";
export const STATE_FILE = path.join(__dirname, "../.state.json");

export type TestUser = {
  id: number;
  jwt: string;
  email: string;
  password: string;
  username: string;
  firstName: string;
};

export type TestState = {
  admin: { email: string; password: string };
  activities: { id: number; documentId: string; title: string }[];
};

export const readState = (): TestState => JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));

const unique = (prefix: string) => `${prefix}${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;

export async function api<T = any>(endpoint: string, init: RequestInit = {}, jwt?: string): Promise<T> {
  const isForm = init.body instanceof FormData;
  const response = await fetch(endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`, {
    ...init,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${endpoint} → ${response.status} ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : null) as T;
}

let catalogue: { id: number; name: string }[] | null = null;

/** Identifiants des centres d'intérêt du catalogue, à partir de leurs noms. */
export async function interestIds(names: string[]) {
  if (!catalogue) {
    const res = await api<any>("/interest-categories?populate=interests&pagination[pageSize]=100");
    catalogue = res.data.flatMap((category: any) => category.interests);
  }
  return names.map((name) => {
    const found = catalogue!.find((interest) => interest.name === name);
    if (!found) throw new Error(`Centre d'intérêt inconnu : ${name}`);
    return found.id;
  });
}

/** Crée un compte complet : profil, centres d'intérêt et photo. */
export async function createUser(
  profile: { firstName?: string; city?: string; bio?: string; interests?: string[]; age?: string; photo?: boolean } = {}
): Promise<TestUser> {
  const username = unique("e2e_");
  const email = `${username}@test.bondiz.local`;
  const password = `Pw-${randomBytes(6).toString("hex")}`;
  const firstName = profile.firstName ?? "Test";

  const registered = await api<any>("/auth/local/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
  const { jwt, user } = registered;

  if (profile.photo !== false) {
    // SQLite n'accepte qu'une écriture à la fois : avec plusieurs tests en
    // parallèle, un envoi peut échouer ponctuellement. On réessaie.
    for (let attempt = 1; ; attempt++) {
      const form = new FormData();
      form.append("files", new Blob([fs.readFileSync(path.join(__dirname, "../fixtures/avatar.png"))], { type: "image/png" }), "avatar.png");
      form.append("ref", "plugin::users-permissions.user");
      form.append("refId", String(user.id));
      form.append("field", "self_image");
      try {
        await api("/upload", { method: "POST", body: form }, jwt);
        break;
      } catch (error) {
        if (attempt === 4) throw error;
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
  }

  await api(
    `/users/${user.id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        firstName,
        city: profile.city ?? "Angers",
        bio: profile.bio ?? `Bonjour, je suis ${firstName}.`,
        age: profile.age ?? "1998-06-15",
        interestTags: await interestIds(profile.interests ?? ["Yoga", "Cuisine", "Lecture"]),
      }),
    },
    jwt
  );

  return { id: user.id, jwt, email, password, username, firstName };
}

export const like = (from: TestUser, to: TestUser) =>
  api<any>("/likes", { method: "POST", body: JSON.stringify({ data: { toUser: to.id } }) }, from.jwt);

/** Like réciproque : renvoie le documentId du match (= id de la conversation). */
export async function match(a: TestUser, b: TestUser): Promise<string> {
  await like(a, b);
  const res = await like(b, a);
  return res.meta.match.documentId;
}

export const sendMessage = (from: TestUser, matchId: string, content: string) =>
  api(`/conversations/${matchId}/messages`, { method: "POST", body: JSON.stringify({ data: { content } }) }, from.jwt);

/**
 * La découverte liste les profils par ancienneté : pour qu'un scénario ne
 * voie que ses propres profils, l'utilisateur like d'abord tous les autres.
 */
export async function onlyDiscover(viewer: TestUser, keep: TestUser[]) {
  const keepIds = new Set(keep.map((user) => user.id));
  for (;;) {
    const res = await api<any>("/discover?pageSize=100", {}, viewer.jwt);
    const others = (res.data ?? []).filter((candidate: any) => !keepIds.has(candidate.id));
    if (others.length === 0) return;
    for (const other of others) {
      await api("/likes", { method: "POST", body: JSON.stringify({ data: { toUser: other.id } }) }, viewer.jwt);
    }
  }
}

export const me = (user: TestUser) =>
  api<any>("/users/me?populate[0]=self_image&populate[1]=interestTags", {}, user.jwt);

let adminToken: Promise<string> | null = null;

/**
 * Fiche complète d'un utilisateur vue par l'administration : les champs
 * privés (nom de famille, téléphone…) n'apparaissent jamais dans l'API publique.
 */
export async function adminUser(documentId: string) {
  adminToken ??= api<any>("http://127.0.0.1:1338/admin/login", {
    method: "POST",
    body: JSON.stringify(readState().admin),
  }).then((res) => res.data.token);
  const res = await api<any>(
    `http://127.0.0.1:1338/content-manager/collection-types/plugin::users-permissions.user/${documentId}`,
    {},
    await adminToken
  );
  return res.data;
}

/**
 * Code de réinitialisation envoyé par e-mail. En test, aucun e-mail ne part :
 * on le lit dans la base SQLite de Strapi (l'API ne l'expose jamais).
 */
export function resetCodeFor(email: string): string | null {
  const strapiDir = path.join(__dirname, "../../../strapi-mydsu");
  const Database = createRequire(path.join(strapiDir, "package.json"))("better-sqlite3");
  const db = new Database(path.join(strapiDir, ".tmp/e2e.db"), { readonly: true, fileMustExist: true });
  try {
    const row = db.prepare("SELECT reset_password_token AS code FROM up_users WHERE email = ?").get(email.toLowerCase());
    return row?.code ?? null;
  } finally {
    db.close();
  }
}
