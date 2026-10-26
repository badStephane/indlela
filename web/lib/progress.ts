import type { Jeune, Validation } from "./mock";
import { BRANCHES } from "./referentiels";
import { daysSince } from "./dates";

export type CritStatus =
  | { st: "todo" }
  | { st: "done" | "pending"; v: Validation }
  | { st: "cancelled"; v: Validation };

export function validationsOf(vals: Validation[], j: Jeune) {
  return vals.filter((v) => v.jeuneId === j.id);
}

export function critStatus(vals: Validation[], j: Jeune, critere: number): CritStatus {
  const list = vals.filter((v) => v.jeuneId === j.id && v.etape === j.etape && v.critere === critere);
  const live = list.filter((v) => !v.annuleeLe);
  if (live.length) {
    const v = live[live.length - 1];
    return { st: v.pending ? "pending" : "done", v };
  }
  if (list.length) return { st: "cancelled", v: list[list.length - 1] };
  return { st: "todo" };
}

export function currentStep(j: Jeune) {
  return BRANCHES[j.branche].steps[j.etape];
}

export function doneCount(vals: Validation[], j: Jeune): number {
  return currentStep(j).crit.reduce((n, _, i) => {
    const s = critStatus(vals, j, i).st;
    return s === "done" || s === "pending" ? n + 1 : n;
  }, 0);
}

export function isStepComplete(vals: Validation[], j: Jeune): boolean {
  return doneCount(vals, j) === currentStep(j).crit.length;
}

/** Jours depuis la dernière validation active (999 si aucune). */
export function lastValidationDays(vals: Validation[], j: Jeune): number {
  const live = validationsOf(vals, j).filter((v) => !v.annuleeLe);
  return live.length ? Math.min(...live.map((v) => daysSince(v.date))) : 999;
}

export function hasPending(vals: Validation[], j: Jeune): boolean {
  return vals.some((v) => v.jeuneId === j.id && v.pending && !v.annuleeLe);
}

export function pendingCount(vals: Validation[]): number {
  return vals.filter((v) => v.pending && !v.annuleeLe).length;
}

export const pct = (n: number, tot: number) => (tot ? Math.round((n / tot) * 100) : 0) + "%";

export const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);
