// Rôles d'un compte. Les rôles d'encadrement (admin, chef de groupe, responsable progression, cadre)
// se cumulent ; un compte parent n'a que ce rôle. Mêmes règles que app.roles_valides côté base.
// Le rôle de la session (store.role) est l'espace ouvert, choisi parmi les rôles du compte.

import { exigeDeuxFA, ROLE_LABELS } from "./admin";
import type { Role } from "./store";

/** Ordre d'affichage et d'enregistrement. */
const ORDRE: readonly Role[] = ["admin", "groupe", "progression", "cadre", "parent"];
/** Espace ouvert à la connexion : le terrain d'abord, l'administration ensuite. */
const PRIORITE_ESPACE: readonly Role[] = ["groupe", "progression", "cadre", "admin", "parent"];

const estRole = (v: unknown): v is Role => typeof v === "string" && (ORDRE as readonly string[]).includes(v);
const ranger = (roles: readonly Role[]): Role[] => ORDRE.filter((r) => roles.includes(r));

/** Liste de rôles valide, ou null : au moins un rôle connu, sans doublon ; parent seul. */
export function lireRoles(v: unknown): Role[] | null {
  if (!Array.isArray(v) || v.length === 0 || !v.every(estRole)) return null;
  if (new Set(v).size !== v.length) return null;
  if (v.includes("parent") && v.length > 1) return null;
  return v;
}

/** Rôles d'une fiche enregistrée avant le cumul des rôles (champ role unique), ou d'une fiche à jour. */
export function normaliserRoles(fiche: { role?: unknown; roles?: unknown }): Role[] {
  return lireRoles(fiche.roles) ?? (estRole(fiche.role) ? [fiche.role] : []);
}

/** Coche ou décoche un rôle dans le formulaire : parent exclut les autres ; le dernier rôle reste. */
export function basculerRole(roles: readonly Role[], r: Role): Role[] {
  if (roles.includes(r)) return roles.length > 1 ? ranger(roles.filter((x) => x !== r)) : [...roles];
  if (r === "parent") return ["parent"];
  return ranger([...roles.filter((x) => x !== "parent"), r]);
}

export function espaceInitial(roles: readonly Role[], precedent?: Role | null): Role {
  if (precedent && roles.includes(precedent)) return precedent;
  return PRIORITE_ESPACE.find((r) => roles.includes(r)) ?? roles[0];
}

export const exigeDeuxFARoles = (roles: readonly Role[]): boolean => roles.some(exigeDeuxFA);

export const libelleRoles = (roles: readonly Role[]): string =>
  ranger(roles)
    .map((r) => ROLE_LABELS[r])
    .join(" · ");
