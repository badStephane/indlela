// Adresses des écrans d'un jeune. L'identifiant passe en paramètre (/jeune?id=…) :
// chaque écran est une page fixe, mise en cache une fois pour toutes par le service
// worker, et s'ouvre donc hors connexion pour n'importe quel jeune, même ajouté sur le téléphone.

export type JeuneScreen = "valider" | "carnet" | "cour";

export function jeuneHref(id: string, screen?: JeuneScreen): string {
  return `/jeune${screen ? `/${screen}` : ""}?id=${encodeURIComponent(id)}`;
}

const ANCIENNE_ADRESSE = /^\/jeunes\/([^/]+)(?:\/(valider|carnet|cour))?\/?$/;

/** Ancienne adresse d'un jeune (/jeunes/:id, /jeunes/:id/carnet…) traduite vers l'actuelle ; null sinon. */
export function depuisAncienneAdresse(chemin: string): string | null {
  const m = ANCIENNE_ADRESSE.exec(chemin);
  if (!m) return null;
  return jeuneHref(decodeURIComponent(m[1]), m[2] as JeuneScreen | undefined);
}
