// Qui peut ouvrir la fiche d'un jeune. Règle pure, testée ; en production la base l'applique aussi (RLS).

import type { Compte, Unite } from "./admin";
import type { Jeune } from "./mock";
import type { BranchCode } from "./referentiels";
import type { Role } from "./store";

const BRANCHES: readonly string[] = ["meute", "troupe", "route"];

/**
 * Branches des unités confiées au compte. Le serveur désigne une unité par son UUID ;
 * en démo, l'identifiant de l'unité est déjà la branche.
 */
export function branchesDuCompte(compte: Compte, unites: readonly Unite[]): BranchCode[] {
  return compte.unites.flatMap((id): BranchCode[] => {
    const unite = unites.find((u) => u.id === id);
    if (unite) return [unite.branche];
    return BRANCHES.includes(id) ? [id as BranchCode] : [];
  });
}

export function peutVoirJeune(role: Role | null, j: Jeune | undefined, compte: Compte | undefined, unites: readonly Unite[]): boolean {
  if (!role || !j || !compte?.actif) return false;
  // Sans consentement des parents, la fiche reste inactive.
  if (!j.consentementLe || j.statut !== "actif") return false;
  if (role === "groupe" || role === "progression") return true;
  if (role === "cadre") return branchesDuCompte(compte, unites).includes(j.branche);
  if (role === "parent") return compte.enfants.includes(j.id);
  return false;
}
