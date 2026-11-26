// Favoris gardés sur le compte (API /favorites), avec reprise de l'ancien
// stockage local.

import { favoriteKey, useFavorites } from "@/utils/favorites";
import { act, renderHook, waitFor } from "@testing-library/react";

// useFocusEffect exige un navigateur : ici on l'exécute comme un effet.
jest.mock("expo-router", () => {
  const React = require("react");
  return { useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]) };
});

jest.mock("@/services/activities", () => ({
  fetchActivities: jest.fn(async () => [
    { id: 3, documentId: "doc-3" },
    { id: 7, documentId: "doc-7" },
  ]),
}));

type Call = { url: string; method: string };

const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });

// Faux serveur : garde les favoris en mémoire et renvoie la liste à jour.
function fakeServer(initial: string[] = [], { delay = 0, fail = false } = {}) {
  let favorites = [...initial];
  const calls: Call[] = [];
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method });
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    if (fail && method !== "GET") return reply(500, { error: { message: "Boom" } });
    const key = decodeURIComponent(url.split("/favorites/")[1] ?? "");
    if (method === "PUT" && !favorites.includes(key)) favorites = [key, ...favorites];
    if (method === "DELETE") favorites = favorites.filter((value) => value !== key);
    return reply(200, { data: favorites });
  }) as jest.Mock;
  return { calls, current: () => favorites };
}

beforeEach(() => {
  localStorage.clear();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

it("utilise le documentId de l'activité, ou son id à défaut", () => {
  expect(favoriteKey({ id: 1, documentId: "abc" })).toBe("abc");
  expect(favoriteKey({ id: 1 })).toBe("1");
});

it("charge les favoris du compte", async () => {
  fakeServer(["doc-1", "doc-2"]);
  const { result } = renderHook(() => useFavorites(1, "jwt"));
  await waitFor(() => expect(result.current.favoriteIds).toEqual(["doc-1", "doc-2"]));
  expect((global.fetch as jest.Mock).mock.calls[0][1].headers.Authorization).toBe("Bearer jwt");
});

it("reste vide sans session", async () => {
  const server = fakeServer(["doc-1"]);
  const { result } = renderHook(() => useFavorites(undefined, null));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(result.current.favoriteIds).toEqual([]);
  expect(server.calls).toEqual([]);
});

it("ajoute puis retire un favori sur le serveur", async () => {
  const server = fakeServer();
  const { result } = renderHook(() => useFavorites(1, "jwt"));
  await waitFor(() => expect(server.calls).toHaveLength(1));

  act(() => result.current.toggleFavorite("doc-9"));
  expect(result.current.isFavorite("doc-9")).toBe(true);
  await waitFor(() => expect(server.current()).toEqual(["doc-9"]));
  expect(server.calls.at(-1)).toMatchObject({ method: "PUT" });

  act(() => result.current.toggleFavorite("doc-9"));
  expect(result.current.isFavorite("doc-9")).toBe(false);
  await waitFor(() => expect(server.current()).toEqual([]));
  expect(server.calls.at(-1)).toMatchObject({ method: "DELETE" });
});

it("annule le changement si le serveur refuse", async () => {
  fakeServer([], { fail: true });
  const { result } = renderHook(() => useFavorites(1, "jwt"));
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());

  act(() => result.current.toggleFavorite("doc-9"));
  expect(result.current.isFavorite("doc-9")).toBe(true);
  await waitFor(() => expect(result.current.isFavorite("doc-9")).toBe(false));
});

it("garde un favori ajouté avant la fin du chargement", async () => {
  fakeServer(["doc-1"], { delay: 20 });
  const { result } = renderHook(() => useFavorites(1, "jwt"));

  // Clic immédiat, avant que la liste du serveur n'arrive.
  act(() => result.current.toggleFavorite("doc-9"));
  await waitFor(() => expect(result.current.favoriteIds).toEqual(["doc-9", "doc-1"]));
});

it("reprend les anciens favoris de l'appareil puis les efface", async () => {
  localStorage.setItem("favorite_activities_1", JSON.stringify([3, 7, 99]));
  const server = fakeServer();
  const { result } = renderHook(() => useFavorites(1, "jwt"));

  await waitFor(() => expect(result.current.favoriteIds.sort()).toEqual(["doc-3", "doc-7"]));
  expect(localStorage.getItem("favorite_activities_1")).toBeNull();
  expect(server.calls.filter((call) => call.method === "PUT")).toHaveLength(2);
});

it("efface un ancien stockage illisible sans rien reprendre", async () => {
  localStorage.setItem("favorite_activities_1", "{pas du json");
  fakeServer();
  const { result } = renderHook(() => useFavorites(1, "jwt"));
  await waitFor(() => expect(localStorage.getItem("favorite_activities_1")).toBeNull());
  expect(result.current.favoriteIds).toEqual([]);
});
