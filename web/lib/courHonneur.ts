// Cour d'honneur : elle reconnaît (ou ajourne) l'étape d'un jeune. Le carnet garde la
// décision, les observations et le nom du CT ; pour un vote secret, seulement les totaux.
// En production : tables cours_honneur et etapes_jeunes.

import type { Etape } from "./referentiels";

export type Decision = "reconnue" | "ajournee";

export interface Reconnaissance {
  id: string;
  jeuneId: string;
  etapeId: string;
  /** Date ISO de la cour d'honneur, qui vaut date de remise quand l'étape est reconnue. */
  date: string;
  decision: Decision;
  observations: string;
  /** Chef de troupe qui signe les observations. */
  ct: string;
  /** Vote secret : nombre de présents et de voix pour, jamais qui a voté quoi. */
  presents?: number;
  voixPour?: number;
  /** Saisie faite hors connexion, pas encore envoyée au serveur. */
  pending: boolean;
}

export interface DecisionInput {
  decision: Decision;
  presents?: number;
  voixPour?: number;
  tousPresents?: boolean;
  parentsConsultes?: boolean;
}

/** Les voix pour atteignent la majorité demandée (3/4 : 6 sur 8, 6 sur 7). */
export function majoriteAtteinte(presents: number, voixPour: number, majorite: number): boolean {
  if (!Number.isInteger(presents) || !Number.isInteger(voixPour) || presents <= 0 || voixPour < 0 || voixPour > presents) return false;
  return voixPour >= Math.ceil(presents * majorite - 1e-9);
}

export function etapeSuivante<T extends { id: string }>(steps: T[], etapeId: string): T | undefined {
  const i = steps.findIndex((s) => s.id === etapeId);
  return i >= 0 ? steps[i + 1] : undefined;
}

/** La décision peut-elle être enregistrée ? Sinon, pourquoi. */
export function decisionPossible(step: Etape, input: DecisionInput): { ok: true } | { ok: false; raison: string } {
  if (input.decision === "ajournee" || !step.vote) return { ok: true };
  if (!input.tousPresents) return { ok: false, raison: "Tous les membres de la cour d'honneur doivent être présents." };
  if (!input.parentsConsultes) return { ok: false, raison: "L'avis des parents (et des professeurs ou du patron) doit être recueilli." };
  if (!majoriteAtteinte(input.presents ?? 0, input.voixPour ?? 0, step.vote.majorite)) {
    return { ok: false, raison: `Il faut au moins ${Math.round(step.vote.majorite * 4)}/4 des voix des présents.` };
  }
  return { ok: true };
}

export function historique(list: Reconnaissance[], jeuneId: string): Reconnaissance[] {
  return list.filter((r) => r.jeuneId === jeuneId).sort((a, b) => a.date.localeCompare(b.date));
}

/** Date de remise d'une étape reconnue pour ce jeune, s'il y en a une. */
export function dateReconnue(list: Reconnaissance[], jeuneId: string, etapeId: string): string | null {
  const r = list.filter((x) => x.jeuneId === jeuneId && x.etapeId === etapeId && x.decision === "reconnue").at(-1);
  return r ? r.date : null;
}
