// Supprime les photos envoyées pendant les tests dans le dossier d'envoi du
// Strapi local (la base de test, elle, est recréée au prochain lancement).

import fs from "fs";
import path from "path";
import { UPLOADS_DIR, UPLOADS_SNAPSHOT } from "./global-setup";

export default async function globalTeardown() {
  if (!fs.existsSync(UPLOADS_SNAPSHOT) || !fs.existsSync(UPLOADS_DIR)) return;
  const before = new Set<string>(JSON.parse(fs.readFileSync(UPLOADS_SNAPSHOT, "utf8")));
  for (const file of fs.readdirSync(UPLOADS_DIR)) {
    if (!before.has(file)) fs.rmSync(path.join(UPLOADS_DIR, file), { force: true });
  }
  fs.rmSync(UPLOADS_SNAPSHOT, { force: true });
}
