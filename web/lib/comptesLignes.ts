// Lignes des tables utilisateurs, affectations_cadres, liens_parent et unites,
// converties dans les types de l'application.

import type { Compte, Unite } from "./admin";
import { exigeDeuxFARoles, lireRoles } from "./roles";
import type { BranchCode } from "./referentiels";
import type { Role } from "./store";

export interface LigneUtilisateur {
  id: string;
  nom: string;
  identifiant: string;
  roles: unknown;
  actif: boolean;
  derniere_connexion: string | null;
}

export interface LigneAffectation {
  utilisateur_id: string;
  unite_id: string;
}

export interface LigneLien {
  utilisateur_id: string;
  jeune_id: string;
}

export interface LigneUnite {
  id: string;
  nom: string;
  branche: string;
  annee: string;
  responsable_id: string | null;
}

const BRANCHES: readonly string[] = ["meute", "troupe", "route"];

export function versComptes(utilisateurs: LigneUtilisateur[], affectations: LigneAffectation[], liens: LigneLien[]): Compte[] {
  return utilisateurs.flatMap((u): Compte[] => {
    // Des rôles illisibles écartent le compte plutôt que de l'afficher avec des droits devinés.
    const roles = lireRoles(u.roles);
    if (!roles) return [];
    return [
      {
        id: u.id,
        nom: u.nom,
        identifiant: u.identifiant,
        roles,
        actif: u.actif,
        unites: affectations.filter((a) => a.utilisateur_id === u.id).map((a) => a.unite_id),
        enfants: liens.filter((l) => l.utilisateur_id === u.id).map((l) => l.jeune_id),
        deuxFA: exigeDeuxFARoles(roles),
        derniereConnexion: u.derniere_connexion,
      },
    ];
  });
}

export function versUnites(lignes: LigneUnite[]): Unite[] {
  return lignes
    .filter((u) => BRANCHES.includes(u.branche))
    .map((u) => ({ id: u.id, nom: u.nom, branche: u.branche as BranchCode, annee: u.annee, responsable: u.responsable_id }));
}
