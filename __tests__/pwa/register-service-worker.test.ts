// Enregistrement du service worker, et navigation demandée par une
// notification quand l'app est déjà ouverte.

import { registerServiceWorker } from "@/utils/registerServiceWorker";
import { router } from "expo-router";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

let messageListener: ((event: any) => void) | undefined;
const register = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  messageListener = undefined;
  register.mockResolvedValue({});
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      register,
      addEventListener: (type: string, listener: (event: any) => void) => {
        if (type === "message") messageListener = listener;
      },
    },
  });
  (global as any).__DEV__ = false;
});

afterAll(() => {
  (global as any).__DEV__ = true;
});

it("enregistre /sw.js sur le build de production", () => {
  registerServiceWorker();
  expect(register).toHaveBeenCalledWith("/sw.js");
});

it("ne fait rien en développement, pour ne pas gêner le rechargement à chaud", () => {
  (global as any).__DEV__ = true;
  registerServiceWorker();
  expect(register).not.toHaveBeenCalled();
});

it("ne fait rien si le navigateur ne connaît pas les service workers", () => {
  delete (navigator as any).serviceWorker;
  expect(() => registerServiceWorker()).not.toThrow();
});

it("signale un échec d'enregistrement sans planter", async () => {
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  register.mockRejectedValue(new Error("refusé"));

  registerServiceWorker();
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(error).toHaveBeenCalledWith("Service worker registration failed", expect.any(Error));
  error.mockRestore();
});

it("ouvre l'écran demandé par un clic sur une notification", () => {
  registerServiceWorker();
  messageListener!({ data: { type: "navigate", path: "/chat/abc" } });
  expect(router.push).toHaveBeenCalledWith("/chat/abc");
});

it.each([
  ["un autre type de message", { type: "autre", path: "/chat/abc" }],
  ["une adresse externe", { type: "navigate", path: "https://phishing.example" }],
  ["un chemin absent", { type: "navigate" }],
  ["un message vide", undefined],
])("ignore %s", (_label, data) => {
  registerServiceWorker();
  messageListener!({ data });
  expect(router.push).not.toHaveBeenCalled();
});
