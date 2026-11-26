/**
 * @jest-environment node
 */

// Le service worker (public/sw.js) est exécuté dans un faux contexte de
// service worker : on capture ses écouteurs, puis on leur envoie des
// événements comme le ferait le navigateur.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ORIGIN = "https://app.bondiz.fr";
const SOURCE = fs.readFileSync(path.join(__dirname, "../../public/sw.js"), "utf8");

function loadServiceWorker({ fetchImpl = jest.fn(async () => new Response("réseau")), cacheNames = ["bondiz-v1"], windows = [] } = {}) {
  const listeners = {};
  const store = new Map();
  const keyOf = (request) => new URL(typeof request === "string" ? request : request.url, ORIGIN).href;

  const cache = {
    addAll: jest.fn(async (urls) => urls.forEach((url) => store.set(keyOf(url), new Response(`shell ${url}`)))),
    match: jest.fn(async (request) => store.get(keyOf(request))),
    put: jest.fn(async (request, response) => store.set(keyOf(request), response)),
  };
  const caches = {
    open: jest.fn(async () => cache),
    keys: jest.fn(async () => cacheNames),
    delete: jest.fn(async () => true),
  };
  const self = {
    location: new URL(ORIGIN),
    addEventListener: (type, listener) => {
      listeners[type] = listener;
    },
    skipWaiting: jest.fn(),
    clients: {
      claim: jest.fn(async () => {}),
      matchAll: jest.fn(async () => windows),
      openWindow: jest.fn(async () => {}),
    },
    registration: { showNotification: jest.fn(async () => {}) },
  };

  vm.runInNewContext(SOURCE, { self, caches, fetch: fetchImpl, URL, Response, console });

  // Événement avec waitUntil : on récupère la promesse à attendre.
  const dispatch = async (type, event = {}) => {
    let pending = Promise.resolve();
    listeners[type]({ ...event, waitUntil: (promise) => (pending = promise) });
    await pending;
  };

  // Événement fetch : renvoie la réponse fournie par le service worker, ou
  // undefined s'il laisse passer la requête jusqu'au réseau.
  const request = (url, { method = "GET", mode = "cors" } = {}) => {
    let responded;
    listeners.fetch({ request: { url: new URL(url, ORIGIN).href, method, mode }, respondWith: (p) => (responded = p) });
    return responded;
  };

  return { listeners, store, cache, caches, self, dispatch, request, fetchImpl };
}

const ok = (body) => new Response(body, { status: 200 });

describe("installation et activation", () => {
  it("met en cache la coquille de l'app et s'active sans attendre", async () => {
    const sw = loadServiceWorker();

    await sw.dispatch("install");

    expect(sw.cache.addAll).toHaveBeenCalledWith(["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"]);
    expect(sw.self.skipWaiting).toHaveBeenCalled();
  });

  it("supprime les anciens caches et garde le cache courant", async () => {
    const sw = loadServiceWorker({ cacheNames: ["bondiz-v0", "bondiz-v1", "autre"] });

    await sw.dispatch("activate");

    expect(sw.caches.delete).toHaveBeenCalledWith("bondiz-v0");
    expect(sw.caches.delete).toHaveBeenCalledWith("autre");
    expect(sw.caches.delete).not.toHaveBeenCalledWith("bondiz-v1");
    expect(sw.self.clients.claim).toHaveBeenCalled();
  });
});

describe("requêtes ignorées", () => {
  it("laisse passer les appels à l'API d'un autre domaine", () => {
    const sw = loadServiceWorker();
    expect(sw.request("https://bondiz-api.example.com/api/activities")).toBeUndefined();
  });

  it("ne met jamais en cache un fichier servi par un autre domaine", () => {
    const sw = loadServiceWorker();
    expect(sw.request("https://cdn.example.com/assets/photo.png")).toBeUndefined();
    expect(sw.request("https://autre-site.example/home", { mode: "navigate" })).toBeUndefined();
  });

  it("laisse passer les requêtes autres que GET", () => {
    const sw = loadServiceWorker();
    expect(sw.request("/api/likes", { method: "POST" })).toBeUndefined();
  });

  it("laisse passer les appels /api du même domaine", () => {
    const sw = loadServiceWorker();
    expect(sw.request("/api/conversations")).toBeUndefined();
  });
});

describe("pages : réseau d'abord", () => {
  it("sert la page du réseau et en garde une copie", async () => {
    const sw = loadServiceWorker({ fetchImpl: jest.fn(async () => ok("page en ligne")) });

    const response = await sw.request("/home", { mode: "navigate" });

    expect(await response.text()).toBe("page en ligne");
    expect(sw.cache.put).toHaveBeenCalled();
    expect(sw.store.has(`${ORIGIN}/home`)).toBe(true);
  });

  it("ne garde pas une page en erreur", async () => {
    const sw = loadServiceWorker({ fetchImpl: jest.fn(async () => new Response("absent", { status: 404 })) });

    const response = await sw.request("/inconnue", { mode: "navigate" });

    expect(response.status).toBe(404);
    expect(sw.cache.put).not.toHaveBeenCalled();
  });

  it("hors connexion, sert la copie de la page", async () => {
    const sw = loadServiceWorker({ fetchImpl: jest.fn(async () => Promise.reject(new TypeError("offline"))) });
    sw.store.set(`${ORIGIN}/messages`, new Response("messages en cache"));

    const response = await sw.request("/messages", { mode: "navigate" });

    expect(await response.text()).toBe("messages en cache");
  });

  it("hors connexion, retombe sur la page d'accueil en cache", async () => {
    const sw = loadServiceWorker({ fetchImpl: jest.fn(async () => Promise.reject(new TypeError("offline"))) });
    await sw.dispatch("install");

    const response = await sw.request("/chat/abc", { mode: "navigate" });

    expect(await response.text()).toBe("shell /");
  });

  it("hors connexion et sans cache, renvoie l'erreur réseau", async () => {
    const sw = loadServiceWorker({ fetchImpl: jest.fn(async () => Promise.reject(new TypeError("offline"))) });

    await expect(sw.request("/home", { mode: "navigate" })).rejects.toThrow("offline");
  });
});

describe("fichiers statiques : cache d'abord", () => {
  it("sert le fichier en cache sans appeler le réseau", async () => {
    const fetchImpl = jest.fn();
    const sw = loadServiceWorker({ fetchImpl });
    sw.store.set(`${ORIGIN}/_expo/static/js/web/entry-abc.js`, new Response("bundle en cache"));

    const response = await sw.request("/_expo/static/js/web/entry-abc.js");

    expect(await response.text()).toBe("bundle en cache");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each(["/_expo/static/js/web/entry-new.js", "/assets/fonts/Poppins.ttf", "/icons/icon-192.png"])(
    "télécharge puis garde %s quand il manque",
    async (url) => {
      const sw = loadServiceWorker({ fetchImpl: jest.fn(async () => ok("contenu")) });

      const response = await sw.request(url);

      expect(await response.text()).toBe("contenu");
      expect(sw.store.has(`${ORIGIN}${url}`)).toBe(true);
    }
  );

  it("ne garde pas une réponse en erreur", async () => {
    const sw = loadServiceWorker({ fetchImpl: jest.fn(async () => new Response("", { status: 500 })) });

    await sw.request("/assets/image.png");

    expect(sw.cache.put).not.toHaveBeenCalled();
  });
});

describe("notifications push", () => {
  const pushEvent = (payload) => ({ data: { json: () => (typeof payload === "string" ? JSON.parse(payload) : payload) } });

  it("affiche le titre, le texte et l'adresse envoyés par le serveur", async () => {
    const sw = loadServiceWorker();

    await sw.dispatch("push", pushEvent({ title: "Clara", body: "Salut !", url: "/chat/abc", tag: "chat-abc" }));

    expect(sw.self.registration.showNotification).toHaveBeenCalledWith("Clara", {
      body: "Salut !",
      icon: "/icons/icon-192.png",
      tag: "chat-abc",
      renotify: true,
      data: { url: "/chat/abc" },
    });
  });

  it("utilise des valeurs par défaut sans contenu", async () => {
    const sw = loadServiceWorker();

    await sw.dispatch("push", { data: null });

    const [title, options] = sw.self.registration.showNotification.mock.calls[0];
    expect(title).toBe("Bondiz");
    expect(options).toMatchObject({ body: "", renotify: false, data: { url: "/" } });
  });

  it("ne plante pas sur un contenu illisible", async () => {
    const sw = loadServiceWorker();

    await sw.dispatch("push", pushEvent("pas du json"));

    expect(sw.self.registration.showNotification).toHaveBeenCalledWith("Bondiz", expect.any(Object));
  });
});

describe("clic sur une notification", () => {
  const clickEvent = (url) => ({ notification: { close: jest.fn(), data: { url } } });

  it("réutilise la fenêtre ouverte et lui demande d'afficher la page", async () => {
    const client = { focus: jest.fn(async () => {}), postMessage: jest.fn() };
    const sw = loadServiceWorker({ windows: [client] });
    const event = clickEvent("/chat/abc");

    await sw.dispatch("notificationclick", event);

    expect(event.notification.close).toHaveBeenCalled();
    expect(client.focus).toHaveBeenCalled();
    expect(client.postMessage).toHaveBeenCalledWith({ type: "navigate", path: "/chat/abc" });
    expect(sw.self.clients.openWindow).not.toHaveBeenCalled();
  });

  it("ouvre une fenêtre quand l'app est fermée", async () => {
    const sw = loadServiceWorker();

    await sw.dispatch("notificationclick", clickEvent("/chat/abc"));

    expect(sw.self.clients.openWindow).toHaveBeenCalledWith(`${ORIGIN}/chat/abc`);
  });

  it("n'ouvre jamais une adresse d'un autre site", async () => {
    const sw = loadServiceWorker();

    await sw.dispatch("notificationclick", clickEvent("https://phishing.example/login"));

    expect(sw.self.clients.openWindow).toHaveBeenCalledWith(`${ORIGIN}/`);
  });
});
