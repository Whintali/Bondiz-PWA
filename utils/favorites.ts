import { apiFetch } from "@/services/api";
import { fetchActivities } from "@/services/activities";
import * as storage from "@/utils/storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

// Activités favorites, gardées sur le compte (API /favorites) : elles
// suivent l'utilisateur d'un appareil à l'autre. Une activité y est désignée
// par son documentId, stable d'une publication à l'autre.

/** Clé d'une activité dans les favoris. */
export const favoriteKey = (activity: { id: number; documentId?: string }) => activity.documentId ?? String(activity.id);

// Ancien stockage sur l'appareil (ids numériques), repris une fois puis effacé.
const legacyKey = (userId?: number) => `favorite_activities_${userId ?? "anonymous"}`;

async function migrateLegacyFavorites(userId: number, token: string) {
  const raw = await storage.getItem(legacyKey(userId));
  if (!raw) return false;

  let ids: unknown = [];
  try {
    ids = JSON.parse(raw);
  } catch {
    // Valeur illisible : rien à reprendre.
  }

  if (Array.isArray(ids) && ids.length > 0) {
    const activities = await fetchActivities();
    for (const activity of activities.filter((item) => ids.includes(item.id))) {
      await apiFetch(`/favorites/${encodeURIComponent(favoriteKey(activity))}`, { method: "PUT" }, token).catch(() => {});
    }
  }
  await storage.deleteItem(legacyKey(userId));
  return true;
}

export function useFavorites(userId?: number, token?: string | null) {
  const [ids, setIds] = useState<string[]>([]);
  const idsRef = useRef<string[]>([]);
  // Nombre de changements faits par l'utilisateur : une réponse partie avant
  // un clic ne doit pas écraser ce clic en arrivant.
  const changes = useRef(0);

  const apply = (next: string[]) => {
    idsRef.current = next;
    setIds(next);
  };

  // Relu à chaque affichage de l'écran : un favori ajouté depuis la fiche
  // d'une activité doit apparaître au retour sur la liste.
  useFocusEffect(
    useCallback(() => {
      if (!userId || !token) {
        apply([]);
        return;
      }
      const startedAt = changes.current;
      const load = async () => {
        await migrateLegacyFavorites(userId, token).catch(() => false);
        const res = await apiFetch<{ data: string[] }>("/favorites", {}, token);
        if (changes.current === startedAt) apply(res.data ?? []);
      };
      load().catch((error) => console.error("Chargement des favoris impossible", error));
    }, [userId, token])
  );

  const toggle = useCallback(
    (key: string) => {
      if (!token) return;
      changes.current += 1;
      const startedAt = changes.current;
      const current = idsRef.current;
      const removing = current.includes(key);
      const previous = current;
      apply(removing ? current.filter((value) => value !== key) : [key, ...current]);

      apiFetch<{ data: string[] }>(
        `/favorites/${encodeURIComponent(key)}`,
        { method: removing ? "DELETE" : "PUT" },
        token
      )
        .then((res) => {
          // La liste du serveur fait foi, sauf si un autre clic a suivi.
          if (changes.current === startedAt) apply(res.data ?? []);
        })
        .catch((error) => {
          console.error("Mise à jour des favoris impossible", error);
          if (changes.current === startedAt) apply(previous);
        });
    },
    [token]
  );

  return { favoriteIds: ids, isFavorite: (key: string) => ids.includes(key), toggleFavorite: toggle };
}
