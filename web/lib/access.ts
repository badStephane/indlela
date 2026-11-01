"use client";

// Règles d'accès côté interface. En production, la base les applique elle-même (RLS) ;
// l'interface se contente de ne pas proposer ce qui serait refusé.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { peutVoirJeune } from "./accesJeune";
import { ROLE_HOME, useStore, type Role } from "./store";

/** Règle pure dans accesJeune.ts ; `unites` traduit les unités du serveur (UUID) en branches. */
export const canSeeJeune = peutVoirJeune;

export const canValidate = (role: Role | null) => role === "cadre" || role === "groupe" || role === "progression";

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
