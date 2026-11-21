// Photos de preuve : règles pures (taille, chemin, ce qui reste à envoyer).
// La photo montre le travail réussi, pas les visages ; elle est jointe à une validation
// et a les mêmes lecteurs qu'elle. Trois au plus par preuve.

export const MAX_PHOTOS = 3;
/** Plus grand côté après réduction : lisible sur un écran, léger sur un réseau lent. */
export const COTE_MAX = 1280;
export const QUALITE_JPEG = 0.75;
/** Même limite que le bucket « preuves » et la colonne photos_preuves.taille. */
export const MAX_OCTETS = 1_048_576;

/** Photo jointe à une validation. Le fichier attend sur le téléphone tant qu'il n'est pas envoyé. */
export interface PhotoPreuve {
  id: string;
  validationId: string;
  jeuneId: string;
  taille: number;
  envoyee: boolean;
}

export function dimensionsReduites(largeur: number, hauteur: number, max = COTE_MAX): { largeur: number; hauteur: number } {
  const echelle = Math.min(1, max / Math.max(largeur, hauteur));
  return { largeur: Math.max(1, Math.round(largeur * echelle)), hauteur: Math.max(1, Math.round(hauteur * echelle)) };
}

/** Chemin du fichier dans le bucket, le même que la colonne générée photos_preuves.chemin. */
export const cheminPhoto = (jeuneId: string, photoId: string): string => `${jeuneId}/${photoId}.jpg`;

/**
 * Ce qui part maintenant, et ce qui ne partira jamais.
 * Une photo attend que sa validation soit sur le serveur (la base exige la validation) ;
 * celle d'une validation retirée avant l'envoi, ou annulée, est abandonnée.
 *
 * @param valsServeur empreintes de la synchro : « active » ou « annulee », par identifiant de validation
 * @param valsLocales validations encore présentes sur le téléphone
 */
export function planPhotos(photos: PhotoPreuve[], valsServeur: Record<string, string>, valsLocales: ReadonlySet<string>): { aEnvoyer: PhotoPreuve[]; orphelines: PhotoPreuve[] } {
  const enAttente = photos.filter((p) => !p.envoyee);
  const etat = (p: PhotoPreuve) => valsServeur[p.validationId];
  return {
    aEnvoyer: enAttente.filter((p) => etat(p) === "active"),
    orphelines: enAttente.filter((p) => etat(p) === "annulee" || (!etat(p) && !valsLocales.has(p.validationId))),
  };
}
