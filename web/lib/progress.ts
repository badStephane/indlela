import type { Jeune, Validation } from "./mock";
import type { DomaineUnite, EtapeUnite, PreuveUnite, StepsByBranch } from "./effective";
import { daysSince } from "./dates";

export type CritStatus =
  | { st: "todo" }
  | { st: "done" | "pending"; v: Validation }
  | { st: "cancelled"; v: Validation };

export function critStatus(vals: Validation[], jeuneId: string, preuveId: string): CritStatus {
  const list = vals.filter((v) => v.jeuneId === jeuneId && v.preuveId === preuveId);
  const live = list.filter((v) => !v.annuleeLe);
  if (live.length) {
    const v = live[live.length - 1];
    return { st: v.pending ? "pending" : "done", v };
  }
  if (list.length) return { st: "cancelled", v: list[list.length - 1] };
  return { st: "todo" };
}

export const isValidated = (s: CritStatus): s is Extract<CritStatus, { st: "done" | "pending" }> => s.st === "done" || s.st === "pending";

export interface DomaineProgress {
  domaine: DomaineUnite;
  /** Preuves affichées pour ce jeune (pour Technicien : ses brevets choisis ou obtenus). */
  preuves: PreuveUnite[];
  validated: number;
  required: number;
  complete: boolean;
}

/** Ce que le cadre peut ajouter au programme d'un jeune : un domaine au choix, ou un brevet. */
export interface ChoixPossible {
  id: string;
  label: string;
  /** Série du brevet, pour les regrouper à l'écran. */
  groupe?: string;
}

export interface Progress {
  steps: EtapeUnite[];
  /** Index de l'étape en cours dans le référentiel de la branche. */
  index: number;
  step: EtapeUnite | undefined;
  /** Domaines au programme du jeune : obligatoires, choisis, ou déjà entamés. */
  domaines: DomaineProgress[];
  choixPossibles: ChoixPossible[];
  done: number;
  total: number;
  complete: boolean;
  /** Étape à brevets (Technicien) : brevets obtenus et séries couvertes. */
  brevets: { obtenus: number; series: number } | null;
}

export function progressOf(j: Jeune, steps: StepsByBranch, vals: Validation[]): Progress {
  const branchSteps = steps[j.branche];
  const index = Math.max(branchSteps.findIndex((s) => s.id === j.etapeId), 0);
  const step = branchSteps[index];
  const base = { steps: branchSteps, index, step };
  if (!step) return { ...base, domaines: [], choixPossibles: [], done: 0, total: 0, complete: false, brevets: null };

  const ok = (p: PreuveUnite) => isValidated(critStatus(vals, j.id, p.id));
  return step.regle?.kind === "brevets" ? brevetProgress(base, step.regle, j, ok) : domaineProgress(base, j, ok);
}

type Base = Pick<Progress, "steps" | "index" | "step">;

function domaineProgress(base: Base, j: Jeune, ok: (p: PreuveUnite) => boolean): Progress {
  const domaines = base.step!.domaines
    .map((d) => {
      // Une preuve archivée ne reste affichée que si le jeune l'a déjà réussie.
      const actives = d.preuves.filter((p) => !p.archive);
      const preuves = d.preuves.filter((p) => !p.archive || ok(p));
      // « N parmi M » : toute preuve réussie compte ; sinon, chaque preuve active est exigée.
      const required = d.min ? Math.min(d.min, preuves.length) : actives.length;
      const validated = (d.min ? preuves : actives).filter(ok).length;
      return { domaine: d, preuves, validated, required, complete: validated >= required, entame: preuves.some(ok) };
    })
    .filter(({ domaine: d, entame }) => entame || (!d.retire && !d.archive && (d.obligatoire || j.choix.includes(d.id))))
    .map(({ entame: _entame, ...rest }) => rest);
  const done = domaines.reduce((n, d) => n + Math.min(d.validated, d.required), 0);
  const total = domaines.reduce((n, d) => n + d.required, 0);
  return {
    ...base,
    domaines,
    choixPossibles: base.step!.domaines.filter((d) => !d.obligatoire && !d.retire && !d.archive).map((d) => ({ id: d.id, label: d.name })),
    done,
    total,
    complete: total > 0 && domaines.every((d) => d.complete),
    brevets: null,
  };
}

function brevetProgress(base: Base, regle: { min: number; series: number }, j: Jeune, ok: (p: PreuveUnite) => boolean): Progress {
  const domaines = base.step!.domaines
    .map((d) => {
      const preuves = d.preuves.filter((p) => ok(p) || (!d.retire && !d.archive && !p.archive && j.choix.includes(p.id)));
      const validated = preuves.filter(ok).length;
      return { domaine: d, preuves, validated, required: preuves.length, complete: preuves.length > 0 && validated === preuves.length };
    })
    .filter((d) => d.preuves.length > 0);
  const obtenus = domaines.reduce((n, d) => n + d.validated, 0);
  const series = domaines.filter((d) => d.validated > 0).length;
  return {
    ...base,
    domaines,
    choixPossibles: base.step!.domaines
      .filter((d) => !d.retire && !d.archive)
      .flatMap((d) => d.preuves.filter((p) => !p.archive).map((p) => ({ id: p.id, label: p.label, groupe: d.name }))),
    done: Math.min(obtenus, regle.min),
    total: regle.min,
    complete: obtenus >= regle.min && series >= regle.series,
    brevets: { obtenus, series },
  };
}

/** Jours depuis la dernière validation active (999 si aucune). */
export function lastValidationDays(vals: Validation[], j: Jeune): number {
  const live = vals.filter((v) => v.jeuneId === j.id && !v.annuleeLe);
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
