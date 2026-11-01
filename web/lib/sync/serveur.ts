"use client";

// Échanges avec la base pour les jeunes, les validations et les cours d'honneur.
// Tout passe sous la RLS : le serveur ne renvoie que ce que le compte connecté a le droit de voir,
// et refuse ce qu'il n'a pas le droit d'écrire.

import { supabase } from "../supabase";
import type { Unite } from "../admin";
import {
  COLONNES_COUR,
  COLONNES_JEUNE,
  COLONNES_VALIDATION,
  depuisLigneCour,
  depuisLigneJeune,
  depuisLigneValidation,
  uniteDeBranche,
  versLigneCour,
  versLigneJeune,
  versLigneValidation,
  type LigneJeune,
} from "./lignes";
import type { AEnvoyer, Etat } from "./plan";

/** Le serveur renvoie au plus 1 000 lignes par requête : on lit par pages. */
const TAILLE_PAGE = 1000;
const DOUBLON = "23505";
const REFUS_DROITS = "42501";
const MAX_SIGNATAIRE = 80;
const HORS_LIGNE = "Le serveur ne répond pas. Les saisies restent sur le téléphone.";

export interface BilanEnvoi {
  /** Ce que le serveur a reçu (ou avait déjà) : à marquer comme envoyé. */
  envoye: AEnvoyer;
  /** Validations refusées parce que la preuve est déjà validée sur le serveur (deux cadres, deux téléphones). */
  refusees: string[];
  erreur?: string;
}

export type Lecture = { ok: true; etat: Etat } | { ok: false; erreur: string };

const RIEN: AEnvoyer = { jeunes: [], nouvelles: [], annulations: [], cours: [] };

function messageDe(e: { code?: string } | null): string {
  if (!e) return HORS_LIGNE;
  if (e.code === REFUS_DROITS) return "Le serveur a refusé une saisie : ce compte n'a pas les droits sur cette unité.";
  return "La synchronisation a échoué. Les saisies restent sur le téléphone ; réessayez.";
}

function lignesJeunes(a: AEnvoyer, groupeId: string, unites: readonly Unite[]): { lignes: LigneJeune[] } | { erreur: string } {
  const manquante = a.jeunes.find((j) => !uniteDeBranche(unites, j.branche));
  if (manquante) return { erreur: `Aucune unité ${manquante.branche} sur le serveur : l'admin doit la créer avant que ses jeunes soient envoyés.` };
  return { lignes: a.jeunes.map((j) => versLigneJeune(j, groupeId, uniteDeBranche(unites, j.branche)!)) };
}

async function envoyerJeunes(a: AEnvoyer, groupeId: string, unites: readonly Unite[]): Promise<string | undefined> {
  if (!supabase || a.jeunes.length === 0) return undefined;
  const r = lignesJeunes(a, groupeId, unites);
  if ("erreur" in r) return r.erreur;
  const { error } = await supabase.from("jeunes").upsert(r.lignes);
  return error ? messageDe(error) : undefined;
}

/** Une à une si le lot échoue sur un doublon, pour ne refuser que la preuve déjà validée ailleurs. */
async function envoyerValidations(a: AEnvoyer): Promise<{ recues: string[]; refusees: string[]; erreur?: string }> {
  if (!supabase || a.nouvelles.length === 0) return { recues: [], refusees: [] };
  const db = supabase;
  const lignes = a.nouvelles.map(versLigneValidation);
  const lot = await db.from("validations").upsert(lignes, { onConflict: "id", ignoreDuplicates: true });
  if (!lot.error) return { recues: lignes.map((l) => l.id), refusees: [] };
  if (lot.error.code !== DOUBLON) return { recues: [], refusees: [], erreur: messageDe(lot.error) };
  const resultats = [];
  for (const ligne of lignes) {
    const { error } = await db.from("validations").upsert(ligne, { onConflict: "id", ignoreDuplicates: true });
    resultats.push({ id: ligne.id, code: error ? (error.code ?? "?") : null });
    if (error && error.code !== DOUBLON) break;
  }
  const echec = resultats.find((x) => x.code && x.code !== DOUBLON);
  return {
    recues: resultats.filter((x) => !x.code).map((x) => x.id),
    refusees: resultats.filter((x) => x.code === DOUBLON).map((x) => x.id),
    ...(echec ? { erreur: messageDe({ code: echec.code ?? undefined }) } : {}),
  };
}

async function envoyerAnnulations(a: AEnvoyer, signataire: string): Promise<string | undefined> {
  if (!supabase || a.annulations.length === 0) return undefined;
  // La base fixe l'heure et le nom ; elle exige seulement que l'annulation soit renseignée.
  const ids = a.annulations.map((v) => v.id);
  const { error } = await supabase
    .from("validations")
    .update({ annulee_le: new Date().toISOString(), annulee_par: signataire.slice(0, MAX_SIGNATAIRE) })
    .in("id", ids);
  return error ? messageDe(error) : undefined;
}

async function envoyerCours(a: AEnvoyer): Promise<string | undefined> {
  if (!supabase || a.cours.length === 0) return undefined;
  const { error } = await supabase.from("cours_honneur").upsert(a.cours.map(versLigneCour), { onConflict: "id", ignoreDuplicates: true });
  return error ? messageDe(error) : undefined;
}

/** Envoie dans l'ordre des dépendances (fiches, puis validations et décisions) ; s'arrête à la première erreur. */
export async function envoyer(a: AEnvoyer, ctx: { groupeId: string; unites: readonly Unite[]; signataire: string }): Promise<BilanEnvoi> {
  try {
    const errJeunes = await envoyerJeunes(a, ctx.groupeId, ctx.unites);
    if (errJeunes) return { envoye: RIEN, refusees: [], erreur: errJeunes };
    const apresJeunes: AEnvoyer = { ...RIEN, jeunes: a.jeunes };

    const vals = await envoyerValidations(a);
    const apresVals: AEnvoyer = { ...apresJeunes, nouvelles: a.nouvelles.filter((v) => vals.recues.includes(v.id)) };
    if (vals.erreur) return { envoye: apresVals, refusees: vals.refusees, erreur: vals.erreur };

    const errAnnul = await envoyerAnnulations(a, ctx.signataire);
    if (errAnnul) return { envoye: apresVals, refusees: vals.refusees, erreur: errAnnul };
    const apresAnnul: AEnvoyer = { ...apresVals, annulations: a.annulations };

    const errCours = await envoyerCours(a);
    if (errCours) return { envoye: apresAnnul, refusees: vals.refusees, erreur: errCours };
    return { envoye: { ...apresAnnul, cours: a.cours }, refusees: vals.refusees };
  } catch {
    return { envoye: RIEN, refusees: [], erreur: HORS_LIGNE };
  }
}

async function toutLire(table: string, colonnes: string): Promise<Record<string, unknown>[] | null> {
  if (!supabase) return null;
  const pages: Record<string, unknown>[][] = [];
  for (let debut = 0; ; debut += TAILLE_PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(colonnes)
      .order("id")
      .range(debut, debut + TAILLE_PAGE - 1);
    if (error || !data) return null;
    const page = data as unknown as Record<string, unknown>[];
    pages.push(page);
    if (page.length < TAILLE_PAGE) return pages.flat();
  }
}

/** Tout ce que ce compte peut voir : les jeunes de ses unités (ou ses enfants), leurs validations et décisions. */
export async function lire(unites: readonly Unite[]): Promise<Lecture> {
  if (!supabase) return { ok: false, erreur: "Le serveur n'est pas configuré." };
  try {
    const [j, v, c] = await Promise.all([toutLire("jeunes", COLONNES_JEUNE), toutLire("validations", COLONNES_VALIDATION), toutLire("cours_honneur", COLONNES_COUR)]);
    if (!j || !v || !c) return { ok: false, erreur: "Les fiches n'ont pas pu être lues sur le serveur. Réessayez." };
    return {
      ok: true,
      etat: {
        jeunes: j.flatMap((l) => {
          const jeune = depuisLigneJeune(l, unites);
          return jeune ? [jeune] : [];
        }),
        vals: v.map(depuisLigneValidation),
        recons: c.map(depuisLigneCour),
      },
    };
  } catch {
    return { ok: false, erreur: HORS_LIGNE };
  }
}
