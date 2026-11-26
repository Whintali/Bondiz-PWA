import { STRAPI_BASE_URL } from "@/services/api";

// URL d'une image Strapi, quel que soit le format renvoyé (v4 ou v5).
const imageUrl = (img: any): string | null => {
  if (!img) return null;
  return (
    img.url ||
    img.attributes?.url ||
    img.data?.attributes?.url ||
    img.formats?.large?.url ||
    img.formats?.medium?.url ||
    img.formats?.small?.url ||
    img.formats?.thumbnail?.url ||
    null
  );
};

const absolute = (url: string) => (url.startsWith("http") ? url : `${STRAPI_BASE_URL}${url}`);

/** Toutes les photos d'un profil, en URL absolues. */
export const getUserImages = (user: any): string[] => {
  if (!user) return [];

  let raw = user.self_image;
  if (raw?.data) raw = raw.data;

  const urls = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(imageUrl).filter(Boolean) as string[];
  if (urls.length === 0 && user.image) urls.push(user.image);

  return urls.map(absolute);
};

/** Première photo d'un profil, ou null. */
export const getAvatarUrl = (user: any): string | null => getUserImages(user)[0] ?? null;

/** Image d'une activité ou d'un partenaire Strapi, en URL absolue. */
export const getMediaUrl = (media: any): string | null => {
  const url = imageUrl(media?.data ?? media);
  return url ? absolute(url) : null;
};

/** Nom affiché d'un profil : le prénom s'il existe, sinon le pseudo. */
export const displayName = (user: any): string => user?.firstName || user?.username || "Utilisateur";
