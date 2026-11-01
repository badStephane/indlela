// Ce qui reste à envoyer, et la fusion avec ce que le serveur renvoie.
// La « synchro » garde l'empreinte de la dernière version connue du serveur, ligne par ligne :
// une fiche dont l'empreinte diffère a été changée sur le téléphone (par n'importe quel écran)
// et repart ; une saisie locale en attente n'est jamais écrasée par une lecture du serveur.

import type { Reconnaissance } from "../courHonneur";
import type { Jeune, Validation } from "../mock";

export interface Synchro {
  jeunes: Record<string, string>;
  vals: Record<string, string>;
  recons: Record<string, string>;
}

export interface Etat {
  jeunes: Jeune[];
  vals: Validation[];
  recons: Reconnaissance[];
}

export interface AEnvoyer {
  jeunes: Jeune[];
  nouvelles: Validation[];
  annulations: Validation[];
  cours: Reconnaissance[];
}

export const SYNCHRO_VIDE: Synchro = { jeunes: {}, vals: {}, recons: {} };

const ACTIVE = "active";
const ANNULEE = "annulee";
const ENVOYEE = "envoyee";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Les fiches de démo (« moussa ») n'ont pas d'identifiant serveur et ne partent jamais. */
const estUuid = (id: string): boolean => UUID_RE.test(id);

/** Empreinte des champs enregistrés sur le serveur. */
export const sigJeune = (j: Jeune): string =>
  JSON.stringify([j.prenom, j.nom, j.dateNaissance, j.dateEntree, j.branche, j.etapeId, j.choix, j.specs, j.statut, j.consentementLe, !!j.importe]);
/** Après l'envoi, une validation ne change plus que par son annulation. */
const sigVal = (v: Validation): string => (v.annuleeLe ? ANNULEE : ACTIVE);

export function aEnvoyer(local: Etat, s: Synchro): AEnvoyer {
  return {
    jeunes: local.jeunes.filter((j) => estUuid(j.id) && s.jeunes[j.id] !== sigJeune(j)),
    // Annulée avant d'avoir été envoyée : la saisie n'a jamais existé pour le serveur.
    nouvelles: local.vals.filter((v) => estUuid(v.id) && !(v.id in s.vals) && !v.annuleeLe),
    annulations: local.vals.filter((v) => s.vals[v.id] === ACTIVE && !!v.annuleeLe),
    cours: local.recons.filter((r) => estUuid(r.id) && !(r.id in s.recons)),
  };
}

export const nbAEnvoyer = (a: AEnvoyer): number => a.jeunes.length + a.nouvelles.length + a.annulations.length + a.cours.length;

/** Empreintes après un envoi réussi. */
export function apresEnvoi(s: Synchro, envoye: AEnvoyer): Synchro {
  return {
    jeunes: { ...s.jeunes, ...Object.fromEntries(envoye.jeunes.map((j) => [j.id, sigJeune(j)])) },
    vals: {
      ...s.vals,
      ...Object.fromEntries(envoye.nouvelles.map((v) => [v.id, ACTIVE])),
      ...Object.fromEntries(envoye.annulations.map((v) => [v.id, ANNULEE])),
    },
    recons: { ...s.recons, ...Object.fromEntries(envoye.cours.map((r) => [r.id, ENVOYEE])) },
  };
}

/**
 * Applique le bilan d'un envoi : empreintes à jour, saisies envoyées plus « en attente », validations
 * refusées (preuve déjà validée par un autre cadre) retirées. Une validation retirée par « Annuler »
 * pendant son envoi revient annulée, pour que l'annulation parte à son tour.
 */
export function marquerEnvoye<T extends Etat & { synchro: Synchro }>(etat: T, envoye: AEnvoyer, refusees: readonly string[], aujourdhui: string): T {
  const recues = new Set(envoye.nouvelles.map((v) => v.id));
  const coursRecues = new Set(envoye.cours.map((r) => r.id));
  const presentes = new Set(etat.vals.map((v) => v.id));
  const retireesPendantEnvoi = envoye.nouvelles.filter((v) => !presentes.has(v.id)).map((v) => ({ ...v, pending: false, annuleeLe: aujourdhui }));
  return {
    ...etat,
    synchro: apresEnvoi(etat.synchro, envoye),
    vals: [...etat.vals.filter((v) => !refusees.includes(v.id)).map((v) => (recues.has(v.id) ? { ...v, pending: false } : v)), ...retireesPendantEnvoi],
    recons: etat.recons.map((r) => (coursRecues.has(r.id) ? { ...r, pending: false } : r)),
  };
}

function fusionnerJeunes(local: Jeune[], serveur: Jeune[], s: Synchro): Jeune[] {
  const enAttente = new Map(local.filter((j) => estUuid(j.id) && s.jeunes[j.id] !== sigJeune(j)).map((j) => [j.id, j]));
  const duServeur = serveur.map((j) => enAttente.get(j.id) ?? j);
  const connus = new Set(serveur.map((j) => j.id));
  return [...duServeur, ...[...enAttente.values()].filter((j) => !connus.has(j.id))];
}

function fusionnerVals(local: Validation[], serveur: Validation[], s: Synchro): Validation[] {
  const locales = new Map(local.map((v) => [v.id, v]));
  const connus = new Set(serveur.map((v) => v.id));
  const duServeur = serveur.map((v) => {
    const loc = locales.get(v.id);
    const annulationEnAttente = loc && s.vals[v.id] === ACTIVE && loc.annuleeLe && !v.annuleeLe;
    if (annulationEnAttente) return loc;
    return loc?.batch ? { ...v, batch: loc.batch } : v;
  });
  const jamaisEnvoyees = local.filter((v) => estUuid(v.id) && !(v.id in s.vals) && !v.annuleeLe && !connus.has(v.id));
  return [...duServeur, ...jamaisEnvoyees.map((v) => ({ ...v, pending: true }))];
}

function fusionnerRecons(local: Reconnaissance[], serveur: Reconnaissance[], s: Synchro): Reconnaissance[] {
  const connus = new Set(serveur.map((r) => r.id));
  const jamaisEnvoyees = local.filter((r) => estUuid(r.id) && !(r.id in s.recons) && !connus.has(r.id));
  return [...serveur, ...jamaisEnvoyees.map((r) => ({ ...r, pending: true }))];
}

/** État du téléphone après une lecture du serveur : le serveur, plus ce qui attend encore d'être envoyé. */
export function fusionner(local: Etat, serveur: Etat, s: Synchro = SYNCHRO_VIDE): Etat & { synchro: Synchro } {
  return {
    jeunes: fusionnerJeunes(local.jeunes, serveur.jeunes, s),
    vals: fusionnerVals(local.vals, serveur.vals, s),
    recons: fusionnerRecons(local.recons, serveur.recons, s),
    synchro: {
      jeunes: Object.fromEntries(serveur.jeunes.map((j) => [j.id, sigJeune(j)])),
      vals: Object.fromEntries(serveur.vals.map((v) => [v.id, sigVal(v)])),
      recons: Object.fromEntries(serveur.recons.map((r) => [r.id, ENVOYEE])),
    },
  };
}
