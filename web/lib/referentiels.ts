// Référentiels de progression par branche. Ce sont des données, pas du code :
// en production, ces lignes viennent des tables referentiels, etapes et criteres.
// Étape → domaines → preuves ; une validation pointe vers une preuve par son identifiant.

import { TROUPE_STEPS } from "./carnetTroupe";

export type BranchCode = "meute" | "troupe" | "route";

export interface Preuve {
  id: string;
  label: string;
  /** Archivée par l'admin : n'est plus proposée, reste lisible dans l'historique. */
  archive?: boolean;
}

export interface Domaine {
  id: string;
  name: string;
  /** false : domaine au choix, que le cadre active pour un jeune ou que l'unité retire. */
  obligatoire: boolean;
  /** « Satisfaire à N des épreuves suivantes » : nombre de preuves à réussir ; absent = toutes. */
  min?: number;
  /** Archivé par l'admin : n'est plus proposé, reste lisible dans l'historique. */
  archive?: boolean;
  preuves: Preuve[];
}

/** Étape validée par un nombre de brevets répartis sur plusieurs séries (Technicien). */
export interface RegleBrevets {
  kind: "brevets";
  min: number;
  series: number;
}

export interface Etape {
  id: string;
  name: string;
  /** Qui reconnaît l'étape (cour d'honneur, Akéla…). */
  val: string;
  /** Règle affichée telle quelle. */
  rule?: string;
  /** Règle calculée, quand l'étape ne se valide pas domaine par domaine. */
  regle?: RegleBrevets;
  domaines: Domaine[];
}

export interface Branche {
  code: BranchCode;
  name: string;
  unit: string;
  steps: Etape[];
}

/** Axe de la meute : un domaine d'une seule preuve (le guide laisse chaque meute les détailler). */
const axe = (id: string, label: string, obligatoire = true): Domaine => ({ id, name: label, obligatoire, preuves: [{ id: `${id}.1`, label }] });

export const BRANCHES: Record<BranchCode, Branche> = {
  troupe: { code: "troupe", name: "Troupe", unit: "Troupe Saint-Paul", steps: TROUPE_STEPS },
  meute: {
    code: "meute",
    name: "Meute",
    unit: "Meute Saint-Paul",
    steps: [
      {
        id: "me.pt",
        name: "Patte tendre",
        val: "Promesse dite à Akéla devant la meute",
        domaines: [axe("me.pt.accueil", "Accueil (environ 6 mois)"), axe("me.pt.promesse", "Promesse dite à Akéla")],
      },
      {
        id: "me.e1",
        name: "1re étoile",
        val: "remise de l'insigne d'étoile",
        domaines: [
          axe("me.e1.civisme", "Civisme"),
          axe("me.e1.matelotage", "Matelotage"),
          axe("me.e1.hygiene", "Hygiène"),
          axe("me.e1.debrouillardise", "Débrouillardise"),
          axe("me.e1.autonomie", "Autonomie"),
          axe("me.e1.religion", "Religion", false),
        ],
      },
      {
        id: "me.e2",
        name: "2e étoile",
        val: "remise de l'insigne d'étoile",
        domaines: [
          axe("me.e2.civisme", "Civisme"),
          axe("me.e2.matelotage", "Matelotage"),
          axe("me.e2.hygiene", "Hygiène"),
          axe("me.e2.debrouillardise", "Débrouillardise"),
          axe("me.e2.autonomie", "Autonomie"),
          axe("me.e2.mouvement", "Vie du mouvement"),
        ],
      },
      {
        id: "me.br",
        name: "Brevets",
        val: "insigne de brevet",
        rule: "ouverts à partir de deux étoiles",
        domaines: [axe("me.br.1", "Premier brevet"), axe("me.br.2", "Deuxième brevet"), axe("me.br.3", "Troisième brevet")],
      },
    ],
  },
  route: { code: "route", name: "Route", unit: "Route Saint-Paul", steps: [] },
};

/** Couleurs de branche (accent, texte sur fond clair, encre sur accent, fond doux). */
export const BRANCH_COLORS: Record<BranchCode, { acc: string; accText: string; accInk: string; soft: string }> = {
  troupe: { acc: "#0B6E3C", accText: "#0B6E3C", accInk: "#FFFFFF", soft: "#E1EFE6" },
  meute: { acc: "#E0A800", accText: "#6E5200", accInk: "#1F1D19", soft: "#FBF0D2" },
  route: { acc: "#B3261E", accText: "#B3261E", accInk: "#FFFFFF", soft: "#F7E3E1" },
};

export const REF_TITLES: Record<BranchCode, string> = {
  troupe: "Carnet de preuves",
  meute: "Guide du louvetier",
  route: "Référentiel de la route",
};
