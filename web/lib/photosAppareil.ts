"use client";

// Photos sur le téléphone : réduction avant tout enregistrement, puis garde dans une base IndexedDB
// à part (fichiers et liste), pour qu'une photo prise sans réseau parte plus tard et qu'une
// déconnexion efface tout d'un coup.

import { clear, createStore, del, get, keys, set } from "idb-keyval";
import { dimensionsReduites, MAX_OCTETS, QUALITE_JPEG, type PhotoPreuve } from "./photos";

const base = createStore("indlela-photos", "photos");
const CLE_LISTE = "liste";
const CLE_PROPRIETAIRE = "proprietaire";
const cleFichier = (id: string) => `f:${id}`;
/** Qualités essayées tant que la photo dépasse la limite. */
const QUALITES = [QUALITE_JPEG, 0.6, 0.45];

export type Reduction = { ok: true; fichier: Blob } | { ok: false; erreur: string };

function enJpeg(canvas: HTMLCanvasElement, qualite: number): Promise<Blob | null> {
  return new Promise((ok) => canvas.toBlob(ok, "image/jpeg", qualite));
}

/**
 * Réduit la photo à 1280 px et la réenregistre en JPEG : le fichier pèse quelques centaines de Ko
 * et perd ses métadonnées (EXIF, position GPS), qui n'ont rien à faire sur le serveur.
 */
export async function reduirePhoto(source: File): Promise<Reduction> {
  if (!source.type.startsWith("image/")) return { ok: false, erreur: "Ce fichier n'est pas une photo." };
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(source, { imageOrientation: "from-image" });
  } catch {
    return { ok: false, erreur: "Ce format d'image n'est pas lu par le navigateur : choisissez une photo JPEG ou PNG." };
  }
  const { largeur, hauteur } = dimensionsReduites(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = largeur;
  canvas.height = hauteur;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { ok: false, erreur: "La photo n'a pas pu être préparée sur cet appareil." };
  ctx.drawImage(image, 0, 0, largeur, hauteur);
  image.close();
  for (const q of QUALITES) {
    const fichier = await enJpeg(canvas, q);
    if (fichier && fichier.size <= MAX_OCTETS) return { ok: true, fichier };
  }
  return { ok: false, erreur: "La photo reste trop lourde, même réduite. Essayez-en une autre." };
}

export const lireListe = async (): Promise<PhotoPreuve[]> => (await get<PhotoPreuve[]>(CLE_LISTE, base)) ?? [];
export const ecrireListe = (liste: PhotoPreuve[]): Promise<void> => set(CLE_LISTE, liste, base);

/** Compte à qui appartiennent les photos en attente (« demo » hors serveur). */
export const lireProprietaire = (): Promise<string | undefined> => get<string>(CLE_PROPRIETAIRE, base);
export const ecrireProprietaire = (compte: string): Promise<void> => set(CLE_PROPRIETAIRE, compte, base);

export const garderFichier = (id: string, fichier: Blob): Promise<void> => set(cleFichier(id), fichier, base);
export const lireFichier = (id: string): Promise<Blob | undefined> => get<Blob>(cleFichier(id), base);
export const oublierFichier = (id: string): Promise<void> => del(cleFichier(id), base);

/** Fichiers gardés sans photo correspondante (photo prise puis abandonnée avant la validation). */
export async function fichiersOrphelins(connus: ReadonlySet<string>): Promise<string[]> {
  const toutes = await keys<string>(base);
  return toutes.filter((k) => k.startsWith("f:")).map((k) => k.slice(2)).filter((id) => !connus.has(id));
}

/** Efface toutes les photos du téléphone (déconnexion hors démo). */
export const toutEffacer = (): Promise<void> => clear(base);
