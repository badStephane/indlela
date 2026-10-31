"use client";

// Règles d'accès côté interface. En production, la base les applique elle-même (RLS) ;
// l'interface se contente de ne pas proposer ce qui serait refusé.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Jeune } from "./mock";
import type { Compte } from "./admin";
import { ROLE_HOME, useStore, type Role } from "./store";

export function canSeeJeune(role: Role | null, j: Jeune | undefined, compte: Compte | undefined): boolean {
  if (!role || !j || !compte?.actif) return false;
  // Sans consentement des parents, la fiche reste inactive.
  if (!j.consentementLe || j.statut !== "actif") return false;
  if (role === "groupe") return true;
  if (role === "cadre") return compte.unites.includes(j.branche);
  if (role === "parent") return compte.enfants.includes(j.id);
  return false;
}

export const canValidate = (role: Role | null) => role === "cadre" || role === "groupe";

/** Renvoie true quand la page peut s'afficher ; sinon renvoie vers l'accueil du rôle, ou la connexion. */
export function useGuard(allowed: (role: Role) => boolean): boolean {
  const { hydrated, role } = useStore();
  const router = useRouter();
  const ok = hydrated && !!role && allowed(role);
  useEffect(() => {
    if (hydrated && !ok) router.replace(role ? ROLE_HOME[role] : "/connexion");
  }, [hydrated, ok, role, router]);
  return ok;
}
