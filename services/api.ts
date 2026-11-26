
export const STRAPI_URL = process.env.EXPO_PUBLIC_STRAPI_URL || "http://localhost:1337";
export const STRAPI_BASE_URL = STRAPI_URL.replace(/\/api$/, "");
// Pas de jeton d'API ici : toute variable EXPO_PUBLIC_* est écrite en clair
// dans l'app distribuée et peut être extraite d'un APK. Les appels
// authentifiés utilisent le JWT de l'utilisateur, gardé dans SecureStore.

export type StrapiError = {
  status: number;
  name: string;
  message: string;
  details: any;
};

// Messages anglais renvoyés par Strapi lui-même.
const KNOWN_ERRORS: [RegExp, string][] = [
  [/invalid identifier or password/i, "Adresse email ou mot de passe incorrect."],
  [/email or username are already taken|email is already taken/i, "Cette adresse email est déjà utilisée."],
  [/username is already taken/i, "Ce nom d'utilisateur est déjà utilisé."],
  [/incorrect code provided/i, "Ce lien n’est plus valable. Fais une nouvelle demande."],
  [/passwords do not match/i, "Les mots de passe ne correspondent pas."],
  [/too many requests/i, "Trop de tentatives. Réessaie dans quelques minutes."],
  [/password must be at least/i, "Le mot de passe doit contenir au moins 8 caractères."],
];

// Les messages de l'API Bondiz sont rédigés en français pour l'utilisateur :
// on les affiche tels quels. Un message anglais inconnu reste masqué.
const looksEnglish = (message: string) =>
  /^[\x20-\x7E]*$/.test(message) &&
  /\b(the|is|are|was|must|not|invalid|provided|required|please|cannot|forbidden|found|error|unexpected|something)\b/i.test(message);

const translateError = (message: string | undefined): string => {
  if (!message) return "Une erreur inattendue est survenue.";

  const known = KNOWN_ERRORS.find(([pattern]) => pattern.test(message));
  if (known) return known[1];
  if (!looksEnglish(message)) return message;

  return "Une erreur est survenue. Veuillez réessayer.";
};

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const url = `${STRAPI_URL}${endpoint}`;

  const isFormData = options.body instanceof FormData;
  
  const headers: Record<string, string> = {
    ...(!isFormData && { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error: any) {
    console.error(`Network Error (${endpoint}):`, error);
    throw new Error("Impossible de se connecter au serveur. Vérifiez votre connexion internet.");
  }

  let data;
  try {
    data = await response.json();
  } catch (error: any) {
    console.error(`Parse Error (${endpoint}):`, error);
    throw new Error("Le serveur rencontre un problème. Veuillez réessayer plus tard.");
  }

  if (!response.ok) {
    console.error(`API Error (${endpoint}):`, JSON.stringify(data, null, 2));
    const error = data.error as StrapiError | undefined;
    const translatedMsg = translateError(error?.message);
    throw new Error(`${response.status}: ${translatedMsg}`);
  }

  return data as T;
}
