import { apiFetch } from "./api";

/** Envoie l'e-mail de réinitialisation. Ne dit jamais si l'adresse a un compte. */
export const requestPasswordReset = (email: string) =>
  apiFetch<{ ok: boolean }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: email.trim() }),
  });

/** Change le mot de passe avec le code reçu par e-mail. */
export const resetPassword = (code: string, password: string, passwordConfirmation: string) =>
  apiFetch<{ jwt: string; user: unknown }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ code, password, passwordConfirmation }),
  });

/** RGPD, portabilité : toutes les données du compte. */
export const exportMyData = (token: string) => apiFetch<Record<string, unknown>>("/account/export", {}, token);

/** RGPD, effacement : supprime définitivement le compte (mot de passe redemandé). */
export const deleteMyAccount = (token: string, password: string) =>
  apiFetch<{ ok: boolean }>("/account/delete", { method: "POST", body: JSON.stringify({ password }) }, token);
