// Suivi de la progression à l'échelle du groupe : ce que le responsable progression
// doit voir pour relancer les unités et préparer les cours d'honneur.

import type { Jeune, Validation } from "./mock";
import type { Compte } from "./admin";
import type { Reconnaissance } from "./courHonneur";
import type { StepsByBranch } from "./effective";
import type { BranchCode } from "./referentiels";
import { daysSince } from "./dates";
import { lastValidationDays, progressOf, type Progress } from "./progress";

/** Jours sans validation au-delà desquels un jeune est à relancer. */
export const SEUIL_JEUNE_JOURS = 30;
/** Jours sans connexion au-delà desquels un cadre est à relancer. */
export const SEUIL_CADRE_JOURS = 21;

const JAMAIS = 999;

/** Une fiche n'est active qu'avec le consentement des parents. */
export const estActif = (j: Jeune): boolean => j.statut === "actif" && !!j.consentementLe;

/** Fiches inscrites qui attendent le consentement des parents. */
export function sansConsentement(jeunes: Jeune[]): Jeune[] {
  return jeunes.filter((j) => j.statut === "actif" && !j.consentementLe);
}

export interface JeuneARelancer {
  j: Jeune;
  /** Jours depuis la dernière validation ; null si le jeune n'en a jamais eu. */
  jours: number | null;
}

/** Jeunes actifs sans validation depuis `seuil` jours, les plus anciens d'abord. */
export function jeunesARelancer(jeunes: Jeune[], vals: Validation[], seuil: number = SEUIL_JEUNE_JOURS, now: Date = new Date()): JeuneARelancer[] {
  return jeunes
    .filter(estActif)
    .map((j) => ({ j, days: lastValidationDays(vals, j, now) }))
    .filter((x) => x.days >= seuil)
    .sort((a, b) => b.days - a.days)
    .map(({ j, days }) => ({ j, jours: days === JAMAIS ? null : days }));
}

export interface CadreInactif {
  compte: Compte;
  /** Jours depuis la dernière connexion ; null si le cadre ne s'est jamais connecté. */
  jours: number | null;
}

/** Cadres actifs sans connexion depuis `seuil` jours, les jamais connectés d'abord. */
export function cadresInactifs(comptes: Compte[], seuil: number = SEUIL_CADRE_JOURS, now: Date = new Date()): CadreInactif[] {
  return comptes
    .filter((c) => c.roles.includes("cadre") && c.actif)
    .map((c) => ({ compte: c, jours: c.derniereConnexion ? daysSince(c.derniereConnexion, now) : null }))
    .filter((x) => x.jours === null || x.jours >= seuil)
    .sort((a, b) => (b.jours ?? JAMAIS) - (a.jours ?? JAMAIS));
}

/** Nombre de jeunes actifs de la branche à chaque étape, dans l'ordre du référentiel. */
export function parEtape(jeunes: Jeune[], steps: StepsByBranch, branche: BranchCode): number[] {
  const actifs = jeunes.filter((j) => j.branche === branche && estActif(j));
  return steps[branche].map((s) => actifs.filter((j) => j.etapeId === s.id).length);
}

/** Dernière décision de cour d'honneur sur l'étape en cours du jeune. */
function derniereDecision(recons: Reconnaissance[], j: Jeune): Reconnaissance | undefined {
  return recons.filter((r) => r.jeuneId === j.id && r.etapeId === j.etapeId).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
}

export interface JeunePret {
  j: Jeune;
  p: Progress;
}

/** Jeunes dont l'étape en cours est complète et pas déjà ajournée : à présenter à la cour d'honneur. */
export function pretsAPresenter(jeunes: Jeune[], steps: StepsByBranch, vals: Validation[], recons: Reconnaissance[] = []): JeunePret[] {
  return jeunes
    .filter(estActif)
    .map((j) => ({ j, p: progressOf(j, steps, vals) }))
    .filter(({ j, p }) => p.complete && derniereDecision(recons, j)?.decision !== "ajournee");
}

export interface JeuneAjourne {
  j: Jeune;
  /** Date ISO de la cour d'honneur qui a ajourné l'étape. */
  le: string;
}

/** Jeunes dont l'étape en cours a été ajournée et pas encore reconnue depuis. */
export function ajournes(jeunes: Jeune[], recons: Reconnaissance[]): JeuneAjourne[] {
  return jeunes.filter(estActif).flatMap((j) => {
    const r = derniereDecision(recons, j);
    return r?.decision === "ajournee" ? [{ j, le: r.date }] : [];
  });
}

/** Les `n` dernières décisions de cour d'honneur, les plus récentes d'abord. */
export function decisionsRecentes(recons: Reconnaissance[], n: number): Reconnaissance[] {
  return [...recons].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
}
