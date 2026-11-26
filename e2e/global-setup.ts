// Prépare le Strapi de test : un administrateur, puis trois activités
// publiées avec leur partenaire (l'API publique ne permet pas d'en créer).
// Deux partenaires ont une position (carte), Bloom Fit n'en a pas.

import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { STATE_FILE } from "./support/api";

const ADMIN = "http://127.0.0.1:1338";
export const UPLOADS_DIR = path.join(__dirname, "../../strapi-mydsu/public/uploads");
export const UPLOADS_SNAPSHOT = path.join(__dirname, ".uploads-before.json");

const call = async (endpoint: string, init: RequestInit = {}, token?: string) => {
  const response = await fetch(`${ADMIN}${endpoint}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${endpoint} → ${response.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
};

const ACTIVITIES = [
  {
    partner: { name: "Buddy’s bar", category: "bar", city: "Angers", address: "12 rue Saint-Laud", postalCode: 49100, latitude: 47.4709, longitude: -0.5527 },
    activity: {
      title: "Buddy’s bar",
      description: "Bar ambiance en plein centre d’Angers, cocktails pour tous les goûts.",
      location: "Angers centre",
      price: 8,
      maxParticipants: 6,
    },
  },
  {
    partner: { name: "L’atelier des Artistes", category: "other", city: "Angers", address: "3 place du Ralliement", postalCode: 49100, latitude: 47.4722, longitude: -0.5513 },
    activity: {
      title: "L’atelier des Artistes",
      description: "Atelier de peinture en petit groupe, matériel fourni.",
      location: "Rue Saint-Laud, Angers",
      price: 20,
      maxParticipants: 3,
    },
  },
  {
    partner: { name: "Bloom Fit", category: "sport", city: "Angers" },
    activity: {
      title: "Bloom Fit",
      description: "Cours de pilates pour tous les niveaux.",
      location: "Angers",
      price: 12,
      maxParticipants: 2,
    },
  },
];

export default async function globalSetup() {
  // Fichiers déjà présents, pour ne supprimer à la fin que ceux des tests.
  const before = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR) : [];
  fs.writeFileSync(UPLOADS_SNAPSHOT, JSON.stringify(before));

  // La base est neuve : le premier administrateur peut s'inscrire seul.
  const admin = { email: "admin@test.bondiz.local", password: `Adm-${randomBytes(8).toString("hex")}A1` };
  const registered = await call("/admin/register-admin", {
    method: "POST",
    body: JSON.stringify({ firstname: "E2E", lastname: "Admin", ...admin }),
  });
  const token = registered.data.token;
  const cm = (uid: string) => `/content-manager/collection-types/${uid}`;

  const activities = [];
  for (const [index, { partner, activity }] of ACTIVITIES.entries()) {
    const createdPartner = await call(cm("api::partner.partner"), {
      method: "POST",
      body: JSON.stringify({ ...partner, partner_id: `e2e-${index}` }),
    }, token);
    const partnerId = createdPartner.data.documentId;
    await call(`${cm("api::partner.partner")}/${partnerId}/actions/publish`, { method: "POST", body: "{}" }, token);

    const created = await call(cm("api::activity.activity"), {
      method: "POST",
      body: JSON.stringify({ ...activity, partner: { connect: [{ documentId: partnerId }] } }),
    }, token);
    await call(`${cm("api::activity.activity")}/${created.data.documentId}/actions/publish`, { method: "POST", body: "{}" }, token);
    activities.push({ id: created.data.id, documentId: created.data.documentId, title: activity.title });
  }

  fs.writeFileSync(STATE_FILE, JSON.stringify({ admin, activities }, null, 2));
}
