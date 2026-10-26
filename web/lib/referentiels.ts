// Référentiels de progression par branche. Ce sont des données, pas du code :
// en production, ces lignes viennent des tables referentiels, etapes et criteres.

export type BranchCode = "meute" | "troupe" | "route";

export interface Etape {
  name: string;
  /** Qui reconnaît l'étape (cour d'honneur, Akéla…). */
  val: string;
  /** Règle chiffrée éventuelle, stockée comme donnée. */
  rule?: string;
  crit: string[];
  /** Index des critères optionnels. */
  opt?: number[];
}

export interface Branche {
  code: BranchCode;
  name: string;
  unit: string;
  steps: Etape[];
}

export const BRANCHES: Record<BranchCode, Branche> = {
  troupe: {
    code: "troupe",
    name: "Troupe",
    unit: "Troupe Saint-Paul",
    steps: [
      {
        name: "Volontaire",
        val: "observations du chef de troupe, avis de la cour d'honneur",
        crit: ["Esprit scout", "Sport", "Nature", "Intervention service", "Civisme", "Hygiène", "Demande de Promesse"],
      },
      {
        name: "Engagé",
        val: "cour d'honneur",
        crit: ["Esprit scout", "Vie chrétienne", "Sport", "Nature", "Intervention service", "Civisme", "Équipement", "Informatique", "Observation", "Hygiène"],
        opt: [1],
      },
      {
        name: "Technicien",
        val: "cour d'honneur",
        rule: "3 degrés de compétence dans 2 services",
        crit: ["Degré 1 · série sport", "Degré 1 · série contact", "Degré 1 · série pionnier", "Degré 2 · série pionnier", "Mise en pratique"],
      },
      {
        name: "Animateur",
        val: "vote secret de la cour d'honneur, 3/4 des voix",
        crit: ["Enseigner une technique", "Former un successeur", "Organiser une activité communautaire"],
      },
    ],
  },
  meute: {
    code: "meute",
    name: "Meute",
    unit: "Meute Saint-Paul",
    steps: [
      { name: "Patte tendre", val: "Promesse dite à Akéla devant la meute", crit: ["Accueil (environ 6 mois)", "Promesse dite à Akéla"] },
      { name: "1re étoile", val: "remise de l'insigne d'étoile", crit: ["Civisme", "Matelotage", "Hygiène", "Débrouillardise", "Autonomie", "Religion"], opt: [5] },
      { name: "2e étoile", val: "remise de l'insigne d'étoile", crit: ["Civisme", "Matelotage", "Hygiène", "Débrouillardise", "Autonomie", "Vie du mouvement"] },
      { name: "Brevets", val: "insigne de brevet", rule: "ouverts à partir de deux étoiles", crit: ["Premier brevet", "Deuxième brevet", "Troisième brevet"] },
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
