/**
 * @jest-environment node
 */

// Ce dont le navigateur a besoin pour proposer l'installation de la PWA.

import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "public/manifest.json"), "utf8"));
const html = fs.readFileSync(path.join(ROOT, "app/+html.tsx"), "utf8");

// Largeur et hauteur lues dans l'en-tête PNG (bloc IHDR).
const pngSize = (file: string) => {
  const buffer = fs.readFileSync(path.join(ROOT, "public", file));
  expect(buffer.subarray(1, 4).toString()).toBe("PNG");
  return `${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`;
};

describe("manifest.json", () => {
  it("décrit une app installable en plein écran", () => {
    expect(manifest).toMatchObject({
      name: "Bondiz",
      short_name: "Bondiz",
      start_url: "/",
      scope: "/",
      display: "standalone",
      lang: "fr",
    });
  });

  it("utilise le violet de la charte", () => {
    expect(manifest.theme_color).toBe("#8432fe");
    expect(manifest.background_color).toBe("#8432fe");
  });

  it("fournit les icônes 192 et 512 exigées par Chrome, dont une masquable", () => {
    const sizes = manifest.icons.map((icon: any) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(manifest.icons.some((icon: any) => icon.purpose === "maskable")).toBe(true);
  });

  it.each(JSON.parse(fs.readFileSync(path.join(ROOT, "public/manifest.json"), "utf8")).icons as any[])(
    "l'icône $src existe et a la taille annoncée",
    (icon) => {
      expect(pngSize(icon.src)).toBe(icon.sizes);
    }
  );
});

describe("gabarit HTML", () => {
  it("relie le manifeste et l'icône iOS", () => {
    expect(html).toContain('rel="manifest" href="/manifest.json"');
    expect(html).toContain('rel="apple-touch-icon" href="/icons/apple-touch-icon.png"');
    expect(pngSize("icons/apple-touch-icon.png")).toBe("180x180");
  });

  it("déclare l'app comme installable sur iPhone", () => {
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(html).toContain("viewport-fit=cover");
  });

  it("corrige la hauteur de l'app installée sur iPhone", () => {
    expect(html).toContain("@media (display-mode: standalone) { html, body, #root { height: 100vh; } }");
  });
});

describe("service worker", () => {
  it("est servi à la racine du site, pour couvrir toutes les pages", () => {
    expect(fs.existsSync(path.join(ROOT, "public/sw.js"))).toBe(true);
  });
});
