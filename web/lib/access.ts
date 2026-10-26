"use client";

// Règles d'accès côté interface. En production, la base les applique elle-même (RLS) ;
// l'interface se contente de ne pas proposer ce qui serait refusé.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FAMILLE, type Jeune } from "./mock";
import { ROLE_HOME, useStore, type Role } from "./store";

export function canSeeJeune(role: Role | null, j: Jeune | undefined): boolean {
  if (!role || !j) return false;
  if (role === "groupe") return true;
  if (role === "cadre") return j.branche === "troupe";
  if (role === "parent") return FAMILLE.kids.includes(j.id);
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
