"use client";

// Échanges avec la base pour les référentiels de branche et les adaptations d'unité, sous la RLS :
// l'admin et le responsable progression tiennent brouillons et publications, l'unité ses adaptations.
// La base fixe elle-même l'heure et l'auteur d'une publication, et fige une version publiée.

import { supabase } from "../supabase";
import { COLONNES_ADAPTATION, COLONNES_REFERENTIEL, type LigneAdaptation, type LigneReferentiel, type RefAEnvoyer } from "./referentiels";

const REFUS_DROITS = "42501";
const DOUBLON = "23505";
const HORS_LIGNE = "Le serveur ne répond pas. Les changements du référentiel restent sur l'appareil.";

export type LectureRef = { ok: true; referentiels: LigneReferentiel[]; adaptations: LigneAdaptation[] } | { ok: false; erreur: string };

function messageDe(e: { code?: string }): string {
  if (e.code === REFUS_DROITS) return "Le serveur a refusé un changement du référentiel : ce compte n'a pas les droits.";
  if (e.code === DOUBLON) return "Une autre version du référentiel vient d'être publiée : la vôtre est rechargée, publiez de nouveau si besoin.";
  return "Le référentiel n'a pas pu être envoyé. Réessayez.";
}

export const nbRefAEnvoyer = (a: RefAEnvoyer): number => a.publications.length + a.brouillons.length + a.abandons.length + a.adapts.length;

/** Publications d'abord (la ligne du brouillon devient la version publiée), puis abandons, brouillons, adaptations. */
export async function envoyerRef(a: RefAEnvoyer, groupeId: string): Promise<{ ok: true } | { ok: false; erreur: string }> {
  if (!supabase) return { ok: false, erreur: "Le serveur n'est pas configuré." };
  const db = supabase;
  const ligne = (x: { id: string; branche: string; version: number; steps: unknown }, publieLe: string | null) => ({
    id: x.id,
    groupe_id: groupeId,
    branche: x.branche,
    version: x.version,
    etapes: x.steps,
    publie_le: publieLe,
  });
  const idsAbandonnes = a.abandons.map((x) => x.id);
  const adaptations = a.adapts.map((x) => ({ unite_id: x.uniteId, retirees: x.adapt.retirees, ajoutees: x.adapt.ajoutees }));
  const etapes = [
    () => (a.publications.length ? db.from("referentiels").upsert(a.publications.map((p) => ligne(p, new Date().toISOString()))) : null),
    () => (idsAbandonnes.length ? db.from("referentiels").delete().in("id", idsAbandonnes) : null),
    () => (a.brouillons.length ? db.from("referentiels").upsert(a.brouillons.map((d) => ligne(d, null))) : null),
    () => (adaptations.length ? db.from("adaptations_unite").upsert(adaptations, { onConflict: "unite_id" }) : null),
  ];
  try {
    for (const etape of etapes) {
      const requete = etape();
      if (!requete) continue;
      const { error } = await requete;
      if (error) return { ok: false, erreur: messageDe(error) };
    }
    return { ok: true };
  } catch {
    return { ok: false, erreur: HORS_LIGNE };
  }
}

/** Versions publiées (et brouillons, pour l'admin et le responsable progression), adaptations des unités lisibles. */
export async function lireRef(): Promise<LectureRef> {
  if (!supabase) return { ok: false, erreur: "Le serveur n'est pas configuré." };
  try {
    const [r, a] = await Promise.all([supabase.from("referentiels").select(COLONNES_REFERENTIEL), supabase.from("adaptations_unite").select(COLONNES_ADAPTATION)]);
    if (r.error || a.error) return { ok: false, erreur: "Le référentiel n'a pas pu être lu sur le serveur." };
    return { ok: true, referentiels: (r.data ?? []) as LigneReferentiel[], adaptations: (a.data ?? []) as LigneAdaptation[] };
  } catch {
    return { ok: false, erreur: HORS_LIGNE };
  }
}
