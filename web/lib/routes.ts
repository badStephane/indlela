// Adresses des écrans d'un jeune. L'identifiant passe en paramètre (/jeune?id=…) :
// chaque écran est une page fixe, mise en cache une fois pour toutes par le service
// worker, et s'ouvre donc hors connexion pour n'importe quel jeune, même ajouté sur le téléphone.

export type JeuneScreen = "valider" | "carnet" | "cour";

export function jeuneHref(id: string, screen?: JeuneScreen): string {
  return `/jeune${screen ? `/${screen}` : ""}?id=${encodeURIComponent(id)}`;
}
