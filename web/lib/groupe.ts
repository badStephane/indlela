// Nom du groupe et de ses unités. Le groupe porte une désignation (« Troisième Dakar ») et
// dépend d'une paroisse (« Saint-Pierre ») ; chaque unité prend le nom du groupe :
// « Troupe Troisième Dakar », « Meute Troisième Dakar », « Route Troisième Dakar ».

import { BRANCHES, type BranchCode } from "./referentiels";

export interface Groupe {
  /** Désignation du groupe, sans le mot « Groupe ». */
  nom: string;
  /** Paroisse du groupe, sans le mot « Paroisse » ; facultative. */
  paroisse: string;
}

export const MAX_GROUPE_NOM = 60;

/** Groupe de la démo. Hors démo, le groupe saisit le sien. */
export const GROUPE_DEMO: Groupe = { nom: "Troisième Dakar", paroisse: "Saint-Pierre" };
export const GROUPE_VIDE: Groupe = { nom: "", paroisse: "" };

const propre = (s: string, mot: string) =>
  s
    .replace(/\s+/g, " ")
    .trim()
    .replace(new RegExp(`^${mot}\\s+`, "i"), "")
    .slice(0, MAX_GROUPE_NOM);

/** « groupe Troisième Dakar » → « Troisième Dakar » ; « Paroisse Saint-Pierre » → « Saint-Pierre ». */
export function nettoyerGroupe(input: Groupe): Groupe {
  return { nom: propre(input.nom, "groupe"), paroisse: propre(input.paroisse, "paroisse") };
}

export const nomGroupe = (g: Groupe): string => (g.nom ? `Groupe ${g.nom}` : "Groupe");

export const libelleGroupe = (g: Groupe): string => (g.paroisse ? `${nomGroupe(g)} · Paroisse ${g.paroisse}` : nomGroupe(g));

export const nomUnite = (b: BranchCode, g: Groupe): string => (g.nom ? `${BRANCHES[b].name} ${g.nom}` : BRANCHES[b].name);

export type NomsUnites = Record<BranchCode, string>;

export function nomsUnites(g: Groupe): NomsUnites {
  return { meute: nomUnite("meute", g), troupe: nomUnite("troupe", g), route: nomUnite("route", g) };
}

interface UniteNommee {
  nom: string;
  branche: BranchCode;
}

/** Renomme les unités qui portaient le nom de l'ancien groupe ; une unité nommée à part garde son nom. */
export function renommerUnites<U extends UniteNommee>(unites: U[], avant: Groupe, apres: Groupe): U[] {
  return unites.map((u) => (u.nom === nomUnite(u.branche, avant) ? { ...u, nom: nomUnite(u.branche, apres) } : u));
}
