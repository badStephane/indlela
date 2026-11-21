"use client";

import { useEffect, useState } from "react";
import { usePhotos } from "@/lib/photosStore";
import { photosDuJeune, type PhotoVue } from "@/lib/photosServeur";
import { supabase } from "@/lib/supabase";
import { VignetteLocale, VignetteServeur } from "./Vignette";

/** Les liens signés durent deux minutes : on relit un peu avant. */
const DUREE_CACHE_MS = 90 * 1000;

// Une seule lecture par jeune pour toutes les preuves de sa fiche.
const cache = new Map<string, { at: number; lecture: Promise<Record<string, PhotoVue[]> | null> }>();

function lirePhotos(jeuneId: string, version: number): Promise<Record<string, PhotoVue[]> | null> {
  const cle = `${jeuneId}:${version}`;
  const deja = cache.get(cle);
  if (deja && Date.now() - deja.at < DUREE_CACHE_MS) return deja.lecture;
  const lecture = photosDuJeune(jeuneId);
  cache.set(cle, { at: Date.now(), lecture });
  return lecture;
}

function usePhotosServeur(jeuneId: string): Record<string, PhotoVue[]> | null {
  const { version } = usePhotos();
  const [photos, setPhotos] = useState<Record<string, PhotoVue[]> | null>(null);
  useEffect(() => {
    if (!supabase) return;
    let vivant = true;
    lirePhotos(jeuneId, version).then((p) => vivant && setPhotos(p));
    return () => {
      vivant = false;
    };
  }, [jeuneId, version]);
  return photos;
}

/** Photos de preuve d'une validation : celles du serveur, et celles qui attendent sur le téléphone. */
export function PhotosValidation({ jeuneId, validationId, preuve }: { jeuneId: string; validationId: string; preuve: string }) {
  const locales = usePhotos().locales(validationId);
  const serveur = usePhotosServeur(jeuneId)?.[validationId] ?? [];
  if (!locales.length && !serveur.length) return null;
  return (
    <div className="flex flex-wrap gap-2 px-3.5 pb-3 pl-[50px]">
      {serveur.map((p, k) => (
        <VignetteServeur key={p.id} lien={p.url} alt={`Photo ${k + 1} de « ${preuve} »`} />
      ))}
      {locales.map((p, k) => (
        <VignetteLocale key={p.id} id={p.id} alt={`Photo ${serveur.length + k + 1} de « ${preuve} »`} enAttente={!!supabase} />
      ))}
    </div>
  );
}
