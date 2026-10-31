// Rapport d'évolution de la progression sur l'année scoute (1er septembre → 31 août),
// par semaine, par trimestre ou pour l'année. Calculs purs : l'export Excel et la page PDF
// lisent les mêmes chiffres.

import type { Jeune, Validation } from "./mock";
import type { Reconnaissance } from "./courHonneur";
import type { StepsByBranch } from "./effective";
import type { BranchCode } from "./referentiels";
import { estActif } from "./suivi";

export type Granularite = "semaine" | "trimestre" | "annee";

export const GRANULARITES: { value: Granularite; label: string }[] = [
  { value: "semaine", label: "Par semaine" },
  { value: "trimestre", label: "Par trimestre" },
  { value: "annee", label: "Année" },
];

/** Mois de la rentrée scoute (septembre, base 0). */
const RENTREE = 8;
const SEMAINE = 7;

export interface AnneeScoute {
  label: string;
  debut: string;
  fin: string;
}

export interface Periode {
  label: string;
  /** Dates ISO incluses. */
  debut: string;
  fin: string;
}

export interface DonneesProgression {
  jeunes: Jeune[];
  vals: Validation[];
  recons: Reconnaissance[];
  steps: StepsByBranch;
}

const iso = (y: number, m: number, d: number) => {
  const x = new Date(Date.UTC(y, m, d));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
};

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return iso(y, m - 1, d + n);
}

const minIso = (a: string, b: string) => (a < b ? a : b);
const within = (date: string, p: { debut: string; fin: string }) => date >= p.debut && date <= p.fin;

/** Année scoute qui contient cette date. */
export function anneeScoute(d: Date): AnneeScoute {
  const y = d.getMonth() >= RENTREE ? d.getFullYear() : d.getFullYear() - 1;
  return { label: `${y}-${y + 1}`, debut: iso(y, RENTREE, 1), fin: iso(y + 1, RENTREE, 0) };
}

/** Année scoute qui commence en septembre de `debut`. */
export function anneeDepuis(debut: number): AnneeScoute {
  return anneeScoute(new Date(debut, RENTREE, 1));
}

const TRIMESTRES = ["1er trimestre (sept.–nov.)", "2e trimestre (déc.–févr.)", "3e trimestre (mars–mai)", "4e trimestre (juin–août)"];

function toutesPeriodes(a: AnneeScoute, g: Granularite): Periode[] {
  if (g === "annee") return [{ label: `Année ${a.label}`, debut: a.debut, fin: a.fin }];
  const y = Number(a.debut.slice(0, 4));
  if (g === "trimestre") {
    const starts = [iso(y, RENTREE, 1), iso(y, RENTREE + 3, 1), iso(y, RENTREE + 6, 1), iso(y, RENTREE + 9, 1)];
    return starts.map((debut, k) => ({ label: TRIMESTRES[k], debut, fin: k < 3 ? addDays(starts[k + 1], -1) : a.fin }));
  }
  const out: Periode[] = [];
  for (let debut = a.debut, k = 1; debut <= a.fin; debut = addDays(debut, SEMAINE), k++) {
    out.push({ label: `Semaine ${k}`, debut, fin: minIso(addDays(debut, SEMAINE - 1), a.fin) });
  }
  return out;
}

/** Périodes de l'année déjà commencées à la date `today`. */
export function periodes(a: AnneeScoute, g: Granularite, today: string): Periode[] {
  return toutesPeriodes(a, g).filter((p) => p.debut <= today);
}

/** Étape du jeune à la fin de cette date : la première étape reconnue ensuite est celle où il était. */
export function etapeALaDate(j: Jeune, date: string, recons: Reconnaissance[]): string {
  const ensuite = recons.filter((r) => r.jeuneId === j.id && r.decision === "reconnue" && r.date > date).sort((a, b) => a.date.localeCompare(b.date));
  return ensuite[0]?.etapeId ?? j.etapeId;
}

export interface LigneEvolution {
  periode: Periode;
  branche: BranchCode;
  /** Jeunes actifs inscrits à la fin de la période. */
  effectif: number;
  /** Preuves validées dans la période (hors annulations). */
  validations: number;
  /** Jeunes ayant au moins une preuve validée dans la période. */
  jeunesProgressant: number;
  reconnues: number;
  ajournees: number;
  /** Jeunes à chaque étape du référentiel à la fin de la période. */
  parEtape: number[];
}

function chiffres(data: DonneesProgression, p: { debut: string; fin: string }, branche: BranchCode) {
  const membres = data.jeunes.filter((j) => j.branche === branche && estActif(j) && j.dateEntree <= p.fin);
  const ids = new Set(membres.map((j) => j.id));
  const vals = data.vals.filter((v) => ids.has(v.jeuneId) && !v.annuleeLe && within(v.date, p));
  const recons = data.recons.filter((r) => ids.has(r.jeuneId) && within(r.date, p));
  return {
    membres,
    effectif: membres.length,
    validations: vals.length,
    jeunesProgressant: new Set(vals.map((v) => v.jeuneId)).size,
    reconnues: recons.filter((r) => r.decision === "reconnue").length,
    ajournees: recons.filter((r) => r.decision === "ajournee").length,
  };
}

export function evolution(data: DonneesProgression, ps: Periode[], branches: BranchCode[]): LigneEvolution[] {
  return ps.flatMap((periode) =>
    branches.map((branche) => {
      const { membres, ...c } = chiffres(data, periode, branche);
      const etapes = membres.map((j) => etapeALaDate(j, periode.fin, data.recons));
      return { periode, branche, ...c, parEtape: data.steps[branche].map((s) => etapes.filter((id) => id === s.id).length) };
    }),
  );
}

export interface LigneSynthese {
  branche: BranchCode;
  effectifDebut: number;
  effectifFin: number;
  validations: number;
  jeunesProgressant: number;
  reconnues: number;
  ajournees: number;
}

/** Bilan de l'année pour chaque unité, de la rentrée à aujourd'hui (ou à la fin de l'année). */
export function synthese(data: DonneesProgression, a: AnneeScoute, branches: BranchCode[], today: string): LigneSynthese[] {
  const p = { debut: a.debut, fin: minIso(a.fin, today) };
  return branches.map((branche) => {
    const { membres: _m, effectif, ...c } = chiffres(data, p, branche);
    const effectifDebut = data.jeunes.filter((j) => j.branche === branche && estActif(j) && j.dateEntree < a.debut).length;
    return { branche, effectifDebut, effectifFin: effectif, ...c };
  });
}

export interface LigneJeune {
  j: Jeune;
  etapeDebut: string;
  etapeFin: string;
  validations: number;
  reconnues: number;
}

/** Parcours de chaque jeune actif sur l'année : étape à la rentrée, étape actuelle, preuves et étapes. */
export function bilanJeunes(data: DonneesProgression, a: AnneeScoute, today: string): LigneJeune[] {
  const p = { debut: a.debut, fin: minIso(a.fin, today) };
  return data.jeunes.filter(estActif).map((j) => ({
    j,
    etapeDebut: etapeALaDate(j, addDays(a.debut, -1), data.recons),
    etapeFin: etapeALaDate(j, p.fin, data.recons),
    validations: data.vals.filter((v) => v.jeuneId === j.id && !v.annuleeLe && within(v.date, p)).length,
    reconnues: data.recons.filter((r) => r.jeuneId === j.id && r.decision === "reconnue" && within(r.date, p)).length,
  }));
}
