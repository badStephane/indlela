// Domaines et preuves réellement utilisés par une unité : le référentiel publié par l'admin,
// puis les adaptations du chef d'unité.
// En production : etapes, domaines, preuves (référentiel actif) + une table d'adaptations par unité.

import { BRANCHES, type BranchCode, type Domaine, type Etape, type Preuve } from "./referentiels";

/** Référentiel publié de chaque branche (le carnet transcrit, puis les versions de l'admin). */
export type RefSteps = Record<BranchCode, Etape[]>;

export const BASE_STEPS: RefSteps = { troupe: BRANCHES.troupe.steps, meute: BRANCHES.meute.steps, route: BRANCHES.route.steps };

/** Adaptations d'une unité par son chef. */
export interface UnitAdapt {
  /** Domaines au choix retirés pour l'unité (les obligatoires restent). */
  retirees: string[];
  /** Preuves propres à l'unité, par identifiant de domaine. */
  ajoutees: Record<string, Preuve[]>;
}

export interface PreuveUnite extends Preuve {
  /** Ajoutée par le chef d'unité, absente du carnet. */
  unite: boolean;
}

export interface DomaineUnite extends Omit<Domaine, "preuves"> {
  preuves: PreuveUnite[];
  /** Retiré pour l'unité : gardé pour l'historique, plus proposé. */
  retire: boolean;
}

export interface EtapeUnite extends Omit<Etape, "domaines"> {
  domaines: DomaineUnite[];
}

export type StepsByBranch = Record<BranchCode, EtapeUnite[]>;

export const EMPTY_ADAPT: UnitAdapt = { retirees: [], ajoutees: {} };

function effectiveStep(step: Etape, adapt: UnitAdapt): EtapeUnite {
  const domaines = step.domaines.map((d) => ({
    ...d,
    retire: !d.obligatoire && adapt.retirees.includes(d.id),
    preuves: [...d.preuves.map((p) => ({ ...p, unite: false })), ...(adapt.ajoutees[d.id] ?? []).map((p) => ({ ...p, unite: true }))],
  }));
  return { ...step, domaines };
}

export function effectiveSteps(ref: RefSteps, adapts: Partial<Record<BranchCode, UnitAdapt>>): StepsByBranch {
  const of = (b: BranchCode) => ref[b].map((s) => effectiveStep(s, adapts[b] ?? EMPTY_ADAPT));
  return { troupe: of("troupe"), meute: of("meute"), route: of("route") };
}

/** Domaine d'une étape qui contient cette preuve. */
export function domaineOfPreuve(step: EtapeUnite | undefined, preuveId: string): DomaineUnite | undefined {
  return step?.domaines.find((d) => d.preuves.some((p) => p.id === preuveId));
}

/** Libellé d'une preuve, retrouvé même si son domaine a été retiré depuis. */
export function preuveLabel(steps: EtapeUnite[], etapeId: string, preuveId: string): string {
  const step = steps.find((s) => s.id === etapeId);
  return domaineOfPreuve(step, preuveId)?.preuves.find((p) => p.id === preuveId)?.label ?? "Preuve supprimée";
}
