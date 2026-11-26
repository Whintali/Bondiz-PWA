// Abonnement aux notifications web (utils/push.web.ts) : détection de ce
// que permet le navigateur, abonnement et désabonnement.

import { apiFetch } from "@/services/api";
import { disablePush, enablePush, getPushStatus } from "@/utils/push";

jest.mock("@/services/api", () => ({ apiFetch: jest.fn() }));
const api = apiFetch as jest.Mock;

const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  toJSON: () => ({ endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "k", auth: "a" } }),
  unsubscribe: jest.fn(async () => true),
};

const pushManager = {
  getSubscription: jest.fn(),
  subscribe: jest.fn(async () => subscription),
};

const setBrowser = ({
  userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Chrome/130",
  platform = "MacIntel",
  touchPoints = 0,
  standalone = false,
  serviceWorker = true,
  registration = { pushManager } as any,
  permission = "default",
}: Partial<{
  userAgent: string;
  platform: string;
  touchPoints: number;
  standalone: boolean;
  serviceWorker: boolean;
  registration: any;
  permission: string;
}> = {}) => {
  Object.defineProperty(navigator, "userAgent", { configurable: true, value: userAgent });
  Object.defineProperty(navigator, "platform", { configurable: true, value: platform });
  Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: touchPoints });
  window.matchMedia = jest.fn(() => ({ matches: standalone })) as any;

  if (serviceWorker) {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistration: jest.fn(async () => registration) },
    });
    (window as any).PushManager = function PushManager() {};
    (window as any).Notification = { permission, requestPermission: jest.fn(async () => permission) };
  } else {
    delete (navigator as any).serviceWorker;
    delete (window as any).PushManager;
    delete (window as any).Notification;
  }
};

beforeEach(() => {
  jest.clearAllMocks();
  pushManager.getSubscription.mockResolvedValue(null);
});

describe("getPushStatus", () => {
  it("demande l'installation sur iPhone quand l'app est ouverte dans Safari", async () => {
    setBrowser({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" });
    expect(await getPushStatus()).toBe("needs-install");
  });

  it("reconnaît un iPad qui se présente comme un Mac", async () => {
    setBrowser({ platform: "MacIntel", touchPoints: 5 });
    expect(await getPushStatus()).toBe("needs-install");
  });

  it("fonctionne sur iPhone une fois l'app ajoutée à l'écran d'accueil", async () => {
    setBrowser({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", standalone: true });
    expect(await getPushStatus()).toBe("disabled");
  });

  it("est indisponible sans service worker", async () => {
    setBrowser({ serviceWorker: false });
    expect(await getPushStatus()).toBe("unsupported");
  });

  it("est indisponible tant que le service worker n'est pas enregistré", async () => {
    setBrowser({ registration: null });
    expect(await getPushStatus()).toBe("unsupported");
  });

  it("signale des notifications bloquées par l'utilisateur", async () => {
    setBrowser({ permission: "denied" });
    expect(await getPushStatus()).toBe("denied");
  });

  it("est activé quand le navigateur a un abonnement", async () => {
    setBrowser({ permission: "granted" });
    pushManager.getSubscription.mockResolvedValue(subscription);
    expect(await getPushStatus()).toBe("enabled");
  });
});

describe("enablePush", () => {
  it("s'arrête si l'utilisateur refuse", async () => {
    setBrowser({ permission: "denied" });
    expect(await enablePush("jwt")).toBe("denied");
    expect(api).not.toHaveBeenCalled();
  });

  it("s'arrête si l'utilisateur ferme la demande", async () => {
    setBrowser({ permission: "default" });
    expect(await enablePush("jwt")).toBe("disabled");
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("demande l'autorisation avant tout appel réseau (exigence de Safari)", async () => {
    setBrowser({ permission: "granted" });
    const order: string[] = [];
    (window as any).Notification.requestPermission = jest.fn(async () => {
      order.push("permission");
      return "granted";
    });
    api.mockImplementation(async (url: string) => {
      order.push(url);
      return { data: { publicKey: "AQID" } };
    });

    await enablePush("jwt");

    expect(order[0]).toBe("permission");
  });

  it("refuse de s'abonner si le serveur n'a pas de clé", async () => {
    setBrowser({ permission: "granted" });
    api.mockResolvedValueOnce({ data: { publicKey: null } });

    await expect(enablePush("jwt")).rejects.toThrow("pas encore activées");
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("s'abonne avec la clé VAPID décodée et envoie l'abonnement au serveur", async () => {
    setBrowser({ permission: "granted" });
    // "-_8" en base64url correspond aux octets 251 et 255.
    api.mockResolvedValueOnce({ data: { publicKey: "AQID-_8" } }).mockResolvedValueOnce({});

    expect(await enablePush("jwt")).toBe("enabled");

    const options = (pushManager.subscribe.mock.calls[0] as any[])[0];
    expect(options.userVisibleOnly).toBe(true);
    expect(Array.from(options.applicationServerKey)).toEqual([1, 2, 3, 251, 255]);
    expect(api).toHaveBeenLastCalledWith(
      "/push/subscriptions",
      { method: "POST", body: JSON.stringify(subscription.toJSON()) },
      "jwt"
    );
  });

  it("annule l'abonnement du navigateur si le serveur le refuse", async () => {
    setBrowser({ permission: "granted" });
    api.mockResolvedValueOnce({ data: { publicKey: "AQID" } }).mockRejectedValueOnce(new Error("503"));

    await expect(enablePush("jwt")).rejects.toThrow("503");
    expect(subscription.unsubscribe).toHaveBeenCalled();
  });

  it("ne fait rien sans service worker", async () => {
    setBrowser({ serviceWorker: false });
    expect(await enablePush("jwt")).toBe("unsupported");
  });
});

describe("disablePush", () => {
  it("ne contacte pas le serveur s'il n'y a pas d'abonnement", async () => {
    setBrowser({ permission: "granted" });
    await disablePush("jwt");
    expect(api).not.toHaveBeenCalled();
  });

  it("se désabonne puis prévient le serveur", async () => {
    setBrowser({ permission: "granted" });
    pushManager.getSubscription.mockResolvedValue(subscription);

    await disablePush("jwt");

    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(api).toHaveBeenCalledWith(
      "/push/subscriptions/unsubscribe",
      { method: "POST", body: JSON.stringify({ endpoint: subscription.endpoint }) },
      "jwt"
    );
  });

  it("ne plante pas sans service worker", async () => {
    setBrowser({ serviceWorker: false });
    await expect(disablePush("jwt")).resolves.toBeUndefined();
  });
});
