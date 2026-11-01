// Lignes des tables jeunes, validations et cours_honneur, converties dans les types de l'application
// et inversement. Ce qui vient du serveur est relu champ par champ : rien n'est pris de confiance.

import type { Unite } from "../admin";
import type { Decision, Reconnaissance } from "../courHonneur";
import type { Jeune, Spec, Validation } from "../mock";
import type { BranchCode } from "../referentiels";

export interface LigneJeune {
  id: string;
  groupe_id: string;
  unite_id: string;
  prenom: string;
  nom: string;
  date_naissance: string | null;
  date_entree: string;
  etape_id: string;
  choix: string[];
  specs: Spec[];
  statut: "actif" | "sorti";
  consentement_le: string | null;
  importe: boolean;
}

/** Ce que le téléphone envoie : le signataire (valide_par) est celui de la session, fixé par la base. */
export interface LigneValidationEnvoi {
  id: string;
  jeune_id: string;
  etape_id: string;
  domaine_id: string;
  preuve_id: string;
  date: string;
  valide_par_nom: string;
  commentaire: string | null;
  ref_version: number | null;
}

export interface LigneValidation extends LigneValidationEnvoi {
  annulee_le: string | null;
  annulee_par: string | null;
  updated_at: string;
}

/** Ce que le téléphone envoie : saisi_par est fixé par la base. */
export interface LigneCour {
  id: string;
  jeune_id: string;
  etape_id: string;
  date: string;
  decision: Decision;
  observations: string;
  ct: string;
  presents: number | null;
  voix_pour: number | null;
}

/** Colonnes lues, dans le même ordre que les interfaces ci-dessus. */
export const COLONNES_JEUNE = "id, groupe_id, unite_id, prenom, nom, date_naissance, date_entree, etape_id, choix, specs, statut, consentement_le, importe";
export const COLONNES_VALIDATION = "id, jeune_id, etape_id, domaine_id, preuve_id, date, valide_par_nom, commentaire, ref_version, annulee_le, annulee_par, updated_at";
export const COLONNES_COUR = "id, jeune_id, etape_id, date, decision, observations, ct, presents, voix_pour";

const MAX_NOM = 60;
const MAX_SIGNATAIRE = 80;
const MAX_COMMENTAIRE = 500;

const texte = (v: unknown): string => (typeof v === "string" ? v : "");
const texteOuNull = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const date = (v: unknown): string | null => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const entierOuNull = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) ? v : null);
const textes = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const specs = (v: unknown): Spec[] =>
  Array.isArray(v) ? v.flatMap((x) => (x && typeof x.name === "string" && typeof x.meta === "string" ? [{ name: x.name, meta: x.meta }] : [])) : [];

/** Unité de la branche pour l'année la plus récente : c'est là qu'un jeune de la branche est rangé. */
export function uniteDeBranche(unites: readonly Unite[], branche: BranchCode): string | undefined {
  return unites
    .filter((u) => u.branche === branche)
    .sort((a, b) => b.annee.localeCompare(a.annee))[0]?.id;
}

export function versLigneJeune(j: Jeune, groupeId: string, uniteId: string): LigneJeune {
  return {
    id: j.id,
    groupe_id: groupeId,
    unite_id: uniteId,
    prenom: j.prenom.trim().slice(0, MAX_NOM),
    nom: j.nom.trim().slice(0, MAX_NOM),
    date_naissance: j.dateNaissance,
    date_entree: j.dateEntree,
    etape_id: j.etapeId,
    choix: j.choix,
    specs: j.specs,
    statut: j.statut,
    consentement_le: j.consentementLe,
    importe: !!j.importe,
  };
}

/** Fiche du serveur ; null si elle ne peut pas s'afficher (unité inconnue, champ obligatoire absent). */
export function depuisLigneJeune(l: Partial<Record<keyof LigneJeune, unknown>>, unites: readonly Unite[]): Jeune | null {
  const unite = unites.find((u) => u.id === l.unite_id);
  const id = texte(l.id);
  const dateEntree = date(l.date_entree);
  if (!unite || !id || !dateEntree || !texte(l.etape_id)) return null;
  return {
    id,
    prenom: texte(l.prenom),
    nom: texte(l.nom),
    dateNaissance: date(l.date_naissance),
    dateEntree,
    branche: unite.branche,
    etapeId: texte(l.etape_id),
    choix: textes(l.choix),
    specs: specs(l.specs),
    consentementLe: date(l.consentement_le),
    statut: l.statut === "sorti" ? "sorti" : "actif",
    importe: l.importe === true,
  };
}

export function versLigneValidation(v: Validation): LigneValidationEnvoi {
  return {
    id: v.id,
    jeune_id: v.jeuneId,
    etape_id: v.etapeId,
    domaine_id: v.domaineId,
    preuve_id: v.preuveId,
    date: v.date,
    // La base remplace ce nom par celui du compte connecté ; il doit seulement être valide.
    valide_par_nom: (v.validePar.trim() || "Cadre").slice(0, MAX_SIGNATAIRE),
    commentaire: v.commentaire ? v.commentaire.slice(0, MAX_COMMENTAIRE) : null,
    ref_version: v.refVersion ?? null,
  };
}

export function depuisLigneValidation(l: Partial<Record<keyof LigneValidation, unknown>>): Validation {
  const commentaire = texteOuNull(l.commentaire);
  const annuleePar = texteOuNull(l.annulee_par);
  const refVersion = entierOuNull(l.ref_version);
  return {
    id: texte(l.id),
    jeuneId: texte(l.jeune_id),
    etapeId: texte(l.etape_id),
    domaineId: texte(l.domaine_id),
    preuveId: texte(l.preuve_id),
    date: date(l.date) ?? "",
    validePar: texte(l.valide_par_nom),
    ...(commentaire ? { commentaire } : {}),
    pending: false,
    annuleeLe: date(l.annulee_le),
    ...(annuleePar ? { annuleePar } : {}),
    ...(refVersion !== null ? { refVersion } : {}),
    updatedAt: texte(l.updated_at),
  };
}

export function versLigneCour(r: Reconnaissance): LigneCour {
  return {
    id: r.id,
    jeune_id: r.jeuneId,
    etape_id: r.etapeId,
    date: r.date,
    decision: r.decision,
    observations: r.observations,
    ct: r.ct,
    presents: r.presents ?? null,
    voix_pour: r.voixPour ?? null,
  };
}

export function depuisLigneCour(l: Partial<Record<keyof LigneCour, unknown>>): Reconnaissance {
  const presents = entierOuNull(l.presents);
  const voixPour = entierOuNull(l.voix_pour);
  return {
    id: texte(l.id),
    jeuneId: texte(l.jeune_id),
    etapeId: texte(l.etape_id),
    date: date(l.date) ?? "",
    decision: l.decision === "ajournee" ? "ajournee" : "reconnue",
    observations: texte(l.observations),
    ct: texte(l.ct),
    ...(presents !== null ? { presents, voixPour: voixPour ?? 0 } : {}),
    pending: false,
  };
}
