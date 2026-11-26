// Vérifie que le build web exporté pour les tests parle au Strapi local et à
// aucune autre API : un build qui viserait la prod y créerait des comptes.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [buildDir, expected] = process.argv.slice(2);
const dir = join(buildDir, "_expo/static/js/web");
const code = readdirSync(dir)
  .filter((file) => file.endsWith(".js"))
  .map((file) => readFileSync(join(dir, file), "utf8"))
  .join("\n");

const others = [...new Set(code.match(/https?:\/\/[\w.:-]+\/api\b/g) ?? [])].filter((url) => url !== expected);

if (!code.includes(expected) || others.length > 0) {
  console.error(`Build E2E refusé : API attendue ${expected}, trouvée(s) ${others.join(", ") || "aucune"}.`);
  process.exit(1);
}
console.log(`Build E2E branché sur ${expected}.`);
