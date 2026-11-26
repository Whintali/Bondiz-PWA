import { displayName, getAvatarUrl, getMediaUrl, getUserImages } from "@/utils/media";

jest.mock("@/services/api", () => ({ STRAPI_BASE_URL: "https://api.test" }));

describe("getUserImages", () => {
  it("rend absolues les URL relatives et garde les URL complètes", () => {
    const user = { self_image: [{ url: "/uploads/a.png" }, { url: "https://cdn/b.png" }] };
    expect(getUserImages(user)).toEqual(["https://api.test/uploads/a.png", "https://cdn/b.png"]);
  });

  it("utilise un format réduit quand l'URL principale manque", () => {
    expect(getUserImages({ self_image: [{ formats: { small: { url: "/uploads/small.png" } } }] })).toEqual([
      "https://api.test/uploads/small.png",
    ]);
  });

  it("accepte une image seule et l'ancien format « data »", () => {
    expect(getUserImages({ self_image: { url: "/u/1.png" } })).toEqual(["https://api.test/u/1.png"]);
    expect(getUserImages({ self_image: { data: [{ attributes: { url: "/u/2.png" } }] } })).toEqual(["https://api.test/u/2.png"]);
  });

  it("se rabat sur le champ image, sinon renvoie une liste vide", () => {
    expect(getUserImages({ image: "https://cdn/c.png" })).toEqual(["https://cdn/c.png"]);
    expect(getUserImages({})).toEqual([]);
    expect(getUserImages(null)).toEqual([]);
  });
});

it("getAvatarUrl renvoie la première photo ou null", () => {
  expect(getAvatarUrl({ self_image: [{ url: "/a.png" }, { url: "/b.png" }] })).toBe("https://api.test/a.png");
  expect(getAvatarUrl({})).toBeNull();
});

it("getMediaUrl lit un média Strapi", () => {
  expect(getMediaUrl({ url: "/m.png" })).toBe("https://api.test/m.png");
  expect(getMediaUrl({ data: { attributes: { url: "/n.png" } } })).toBe("https://api.test/n.png");
  expect(getMediaUrl(null)).toBeNull();
});

it("displayName préfère le prénom au pseudo", () => {
  expect(displayName({ firstName: "Anna", username: "anna_49" })).toBe("Anna");
  expect(displayName({ username: "anna_49" })).toBe("anna_49");
  expect(displayName(undefined)).toBe("Utilisateur");
});
