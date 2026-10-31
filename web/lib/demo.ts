// Mode démo : données fictives, entrées « Démo · entrer comme » et interrupteurs d'états.
// Actif par défaut pour le prototype ; NEXT_PUBLIC_DEMO=0 donne le comportement de production :
// téléphone vide au départ, et tout est effacé du téléphone à la déconnexion.
export const DEMO = process.env.NEXT_PUBLIC_DEMO !== "0";
