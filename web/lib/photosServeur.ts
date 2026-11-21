"use client";

// Photos de preuve côté serveur : la ligne dans photos_preuves d'abord (la base y vérifie les droits,
// la validation active et les trois photos au plus), puis le fichier dans le bucket privé « preuves »,
// que la base n'accepte que pour une ligne existante. Lecture par liens signés de deux minutes,
// téléchargés sans cache du navigateur : rien ne reste sur un téléphone partagé.

import { supabase } from "./supabase";
import { cheminPhoto, type PhotoPreuve } from "./photos";

/** Le lien ne sert qu'au téléchargement immédiat de la vignette. */
export const DUREE_LIEN_S = 120;

export type Envoi = { ok: true } | { ok: false; definitif: boolean; erreur: string };

const dejaLa = (e: { message?: string; statusCode?: string | number } | null): boolean =>
  !!e && (String(e.statusCode) === "409" || /already exists|duplicate/i.test(e.message ?? ""));

/** Envoie une photo. Renvoyer une photo déjà reçue ne la double pas. */
export async function envoyerPhoto(p: PhotoPreuve, fichier: Blob): Promise<Envoi> {
  if (!supabase) return { ok: false, definitif: false, erreur: "Le serveur n'est pas configuré." };
  try {
    const ligne = await supabase
      .from("photos_preuves")
      .upsert({ id: p.id, validation_id: p.validationId, jeune_id: p.jeuneId, taille: p.taille }, { onConflict: "id", ignoreDuplicates: true });
    if (ligne.error) {
      // P0001 : validation annulée, déjà trois photos… ; 42501 : plus le droit. Inutile de réessayer.
      const definitif = ligne.error.code === "P0001" || ligne.error.code === "42501" || ligne.error.code === "23503";
      return { ok: false, definitif, erreur: definitif ? ligne.error.message : "La photo n'a pas pu être enregistrée." };
    }
    // Un nouvel essai après une coupure trouve la ligne (ignorée) et parfois le fichier (déjà là).
    const depot = await supabase.storage.from("preuves").upload(cheminPhoto(p.jeuneId, p.id), fichier, { contentType: "image/jpeg", upsert: false });
    if (depot.error && !dejaLa(depot.error as { message?: string; statusCode?: string })) {
      const refuse = /row-level security|unauthorized|403/i.test(depot.error.message);
      return { ok: false, definitif: refuse, erreur: refuse ? "photo refusée par le serveur." : "La photo n'a pas pu être envoyée." };
    }
    return { ok: true };
  } catch {
    return { ok: false, definitif: false, erreur: "Le serveur ne répond pas." };
  }
}

export interface PhotoVue {
  id: string;
  url: string;
}

/** Photos d'un jeune déjà sur le serveur, par validation. Null sans réseau ou sans droit. */
export async function photosDuJeune(jeuneId: string): Promise<Record<string, PhotoVue[]> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("photos_preuves").select("id, validation_id, chemin").eq("jeune_id", jeuneId).order("created_at");
    if (error || !data) return null;
    if (!data.length) return {};
    const liens = await supabase.storage.from("preuves").createSignedUrls(data.map((r) => r.chemin as string), DUREE_LIEN_S);
    if (liens.error || !liens.data) return null;
    const url = new Map(liens.data.map((l) => [l.path, l.signedUrl]));
    return data.reduce<Record<string, PhotoVue[]>>((acc, r) => {
      const u = url.get(r.chemin as string);
      if (!u) return acc;
      const liste = acc[r.validation_id as string] ?? [];
      return { ...acc, [r.validation_id as string]: [...liste, { id: r.id as string, url: u }] };
    }, {});
  } catch {
    return null;
  }
}
