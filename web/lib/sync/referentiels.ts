// Référentiels de branche (brouillon et versions publiées) et adaptations des épreuves par unité :
// ce qui reste à envoyer, et la fusion avec le serveur. Même principe que plan.ts : l'empreinte
// de la dernière version connue du serveur dit ce qui a changé sur le téléphone.

import type { Unite } from "../admin";
import type { UnitAdapt } from "../effective";
import { VERSION_CARNET, type BranchCode, type Etape, type Preuve } from "../referentiels";
import type { BranchRef, RefState } from "../store";
import { uniteDeBranche } from "./lignes";

const BRANCHES: readonly BranchCode[] = ["meute", "troupe", "route"];

export interface RefServeur {
  /** Dernière version publiée connue du serveur, par branche. */
  publies: Partial<Record<BranchCode, number>>;
  /** Brouillon connu du serveur : sa ligne et son empreinte. */
  brouillons: Partial<Record<BranchCode, { id: string; sig: string }>>;
  /** Empreinte de l'adaptation connue du serveur, par branche. */
  adapts: Partial<Record<BranchCode, string>>;
}

export const REF_SERVEUR_VIDE: RefServeur = { publies: {}, brouillons: {}, adapts: {} };

export interface EtatRef {
  ref: RefState;
  adapts: Partial<Record<BranchCode, UnitAdapt>>;
  refServeur: RefServeur;
}

export interface LigneReferentiel {
  id: string;
  branche: BranchCode;
  version: number;
  etapes: unknown;
  publie_le: string | null;
}

export interface LigneAdaptation {
  unite_id: string;
  retirees: unknown;
  ajoutees: unknown;
}

export interface RefAEnvoyer {
  /** Version publiée sur le téléphone : la ligne du brouillon (id) devient la version publiée. */
  publications: { branche: BranchCode; id: string; version: number; steps: Etape[] }[];
  brouillons: { branche: BranchCode; id: string; version: number; steps: Etape[] }[];
  abandons: { branche: BranchCode; id: string }[];
  adapts: { branche: BranchCode; uniteId: string; adapt: UnitAdapt }[];
}

export const COLONNES_REFERENTIEL = "id, branche, version, etapes, publie_le";
export const COLONNES_ADAPTATION = "unite_id, retirees, ajoutees";

const sigEtapes = (steps: Etape[]): string => JSON.stringify(steps);
const sigAdapt = (a: UnitAdapt): string => JSON.stringify([a.retirees, a.ajoutees]);

const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const estPreuve = (v: unknown): v is Preuve => estObjet(v) && typeof v.id === "string" && typeof v.label === "string";

/** Étapes lues du serveur ; null si le contenu n'a pas la forme attendue. */
export function lireEtapes(v: unknown): Etape[] | null {
  if (!Array.isArray(v)) return null;
  const valide = v.every(
    (e) =>
      estObjet(e) &&
      typeof e.id === "string" &&
      typeof e.name === "string" &&
      Array.isArray(e.domaines) &&
      e.domaines.every((d) => estObjet(d) && typeof d.id === "string" && typeof d.name === "string" && Array.isArray(d.preuves) && d.preuves.every(estPreuve)),
  );
  return valide ? (v as Etape[]) : null;
}

function lireAdaptation(l: LigneAdaptation): UnitAdapt {
  const retirees = Array.isArray(l.retirees) ? l.retirees.filter((x): x is string => typeof x === "string") : [];
  const ajoutees = estObjet(l.ajoutees)
    ? Object.fromEntries(Object.entries(l.ajoutees).map(([domaine, preuves]) => [domaine, Array.isArray(preuves) ? preuves.filter(estPreuve) : []]))
    : {};
  return { retirees, ajoutees };
}

export function refAEnvoyer(e: EtatRef, unites: readonly Unite[], nouvelId: () => string): RefAEnvoyer {
  const vide: RefAEnvoyer = { publications: [], brouillons: [], abandons: [], adapts: [] };
  return BRANCHES.reduce((a, b): RefAEnvoyer => {
    const publiee = e.ref.published[b];
    const connu = e.refServeur.brouillons[b];
    const publication = publiee && publiee.version > (e.refServeur.publies[b] ?? 0) ? { branche: b, id: connu?.id ?? nouvelId(), version: publiee.version, steps: publiee.steps } : null;
    const brouillon = e.ref.draft[b];
    const brouillonModifie = brouillon && sigEtapes(brouillon) !== connu?.sig;
    // La ligne du brouillon est reprise par la publication : on ne la retire pas.
    const abandon = !brouillon && connu && !publication;
    const adapt = e.adapts[b];
    const uniteId = uniteDeBranche(unites, b);
    const adaptModifiee = adapt && uniteId && sigAdapt(adapt) !== e.refServeur.adapts[b];
    return {
      publications: publication ? [...a.publications, publication] : a.publications,
      brouillons: brouillonModifie
        ? [...a.brouillons, { branche: b, id: publication ? nouvelId() : (connu?.id ?? nouvelId()), version: (publiee?.version ?? VERSION_CARNET[b]) + 1, steps: brouillon }]
        : a.brouillons,
      abandons: abandon ? [...a.abandons, { branche: b, id: connu.id }] : a.abandons,
      adapts: adaptModifiee ? [...a.adapts, { branche: b, uniteId, adapt }] : a.adapts,
    };
  }, vide);
}

/** Ce que le serveur connaît après un envoi réussi. */
export function apresEnvoiRef(rs: RefServeur, a: RefAEnvoyer): RefServeur {
  const publies = { ...rs.publies, ...Object.fromEntries(a.publications.map((p) => [p.branche, p.version])) };
  const sansPubliesNiAbandons = Object.fromEntries(
    Object.entries(rs.brouillons).filter(([b]) => !a.publications.some((p) => p.branche === b) && !a.abandons.some((x) => x.branche === b)),
  );
  const brouillons = { ...sansPubliesNiAbandons, ...Object.fromEntries(a.brouillons.map((d) => [d.branche, { id: d.id, sig: sigEtapes(d.steps) }])) };
  const adapts = { ...rs.adapts, ...Object.fromEntries(a.adapts.map((x) => [x.branche, sigAdapt(x.adapt)])) };
  return { publies, brouillons, adapts };
}

interface BrancheServeur {
  publiee?: BranchRef;
  brouillon?: { id: string; steps: Etape[] };
}

function lireBranche(lignes: readonly LigneReferentiel[], b: BranchCode): BrancheServeur {
  const lisibles = lignes.flatMap((l) => {
    const steps = l.branche === b ? lireEtapes(l.etapes) : null;
    return steps ? [{ ...l, steps }] : [];
  });
  const publiee = lisibles.filter((l) => l.publie_le).sort((x, y) => y.version - x.version)[0];
  const brouillon = lisibles.find((l) => !l.publie_le);
  return {
    ...(publiee ? { publiee: { version: publiee.version, steps: publiee.steps } } : {}),
    ...(brouillon ? { brouillon: { id: brouillon.id, steps: brouillon.steps } } : {}),
  };
}

/** État du téléphone après une lecture : le serveur, sauf ce qui attend encore d'être envoyé. */
export function fusionnerRef(local: EtatRef, serveur: { referentiels: LigneReferentiel[]; adaptations: LigneAdaptation[] }, unites: readonly Unite[]): EtatRef {
  const parBranche = BRANCHES.map((b) => {
    const srv = lireBranche(serveur.referentiels, b);
    const localePubliee = local.ref.published[b];
    const publicationEnAttente = localePubliee && localePubliee.version > (local.refServeur.publies[b] ?? 0) && localePubliee.version > (srv.publiee?.version ?? 0);
    const publiee = publicationEnAttente ? localePubliee : srv.publiee;

    const localBrouillon = local.ref.draft[b];
    const connu = local.refServeur.brouillons[b];
    const brouillonModifie = localBrouillon && sigEtapes(localBrouillon) !== connu?.sig;
    const brouillonRetire = !localBrouillon && connu && srv.brouillon?.id === connu.id;
    const brouillon = brouillonModifie ? localBrouillon : brouillonRetire ? undefined : srv.brouillon?.steps;

    const uniteId = uniteDeBranche(unites, b);
    const ligneAdapt = serveur.adaptations.find((l) => l.unite_id === uniteId);
    const adaptServeur = ligneAdapt ? lireAdaptation(ligneAdapt) : undefined;
    const localAdapt = local.adapts[b];
    const adaptModifiee = localAdapt && sigAdapt(localAdapt) !== local.refServeur.adapts[b];
    const adapt = adaptModifiee ? localAdapt : adaptServeur;
    return { b, srv, publiee, brouillon, adapt, adaptServeur };
  });

  const garder = <T,>(entrees: [BranchCode, T | undefined][]): Partial<Record<BranchCode, T>> =>
    Object.fromEntries(entrees.filter((x): x is [BranchCode, T] => x[1] !== undefined));

  return {
    ref: {
      ...local.ref,
      published: garder(parBranche.map((x) => [x.b, x.publiee])),
      draft: garder(parBranche.map((x) => [x.b, x.brouillon])),
    },
    adapts: garder(parBranche.map((x) => [x.b, x.adapt])),
    refServeur: {
      publies: garder(parBranche.map((x) => [x.b, x.srv.publiee?.version])),
      brouillons: garder(parBranche.map((x) => [x.b, x.srv.brouillon ? { id: x.srv.brouillon.id, sig: sigEtapes(x.srv.brouillon.steps) } : undefined])),
      adapts: garder(parBranche.map((x) => [x.b, x.adaptServeur ? sigAdapt(x.adaptServeur) : undefined])),
    },
  };
}
