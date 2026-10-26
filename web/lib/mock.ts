// Données simulées du groupe Grand-Dakar. Remplacées par Supabase plus tard :
// chaque objet suit les champs des tables jeunes, validations, reconnaissances_jeunes.

import type { BranchCode } from "./referentiels";
import { daysAgo, toISODate } from "./dates";

export interface Jeune {
  id: string;
  prenom: string;
  nom: string;
  age: number;
  branche: BranchCode;
  /** Index de l'étape en cours dans le référentiel de la branche. */
  etape: number;
  /** Nombre de critères validés au départ (données de démo). */
  seedDone: number;
  /** Jours depuis la dernière validation (données de démo). */
  seedLast: number;
  specs: { name: string; meta: string }[];
}

export interface Validation {
  id: string;
  jeuneId: string;
  etape: number;
  critere: number;
  /** Date ISO de la validation. */
  date: string;
  validePar: string;
  commentaire?: string;
  /** Saisie faite hors connexion, pas encore envoyée au serveur. */
  pending: boolean;
  /** Une validation ne s'efface jamais : on renseigne annuleeLe. */
  annuleeLe: string | null;
  annuleePar?: string;
  /** Lot de saisie, pour « Annuler » juste après la confirmation. */
  batch?: string;
  updatedAt: string;
}

export const GROUPE = "Groupe Grand-Dakar";

export const CURRENT_CADRE = { full: "Cdt. Ibrahima Seck", short: "Cdt. I. Seck" };
const CADRES = [CURRENT_CADRE.short, "Adj. F. Mbaye"];

const s = (name: string, meta: string) => ({ name, meta });

export const TROUPE: Jeune[] = [
  { id: "moussa", prenom: "Moussa", nom: "Diop", age: 14, branche: "troupe", etape: 1, seedDone: 6, seedLast: 5, specs: [s("Secouriste", "Niveau 1 · 2 mai 2026")] },
  { id: "awa", prenom: "Awa", nom: "Ndiaye", age: 13, branche: "troupe", etape: 1, seedDone: 7, seedLast: 12, specs: [s("Cuisinier", "Niveau 1 · 14 juin 2026"), s("Badge Environnement", "3 oct. 2026")] },
  { id: "cheikh", prenom: "Cheikh", nom: "Fall", age: 15, branche: "troupe", etape: 2, seedDone: 3, seedLast: 19, specs: [s("Pionnier", "Niveau 2 · 9 août 2026"), s("Topographe", "Niveau 1 · 21 févr. 2026")] },
  { id: "fatou", prenom: "Fatou", nom: "Sarr", age: 12, branche: "troupe", etape: 0, seedDone: 4, seedLast: 41, specs: [] },
  { id: "ibrahima", prenom: "Ibrahima", nom: "Ba", age: 16, branche: "troupe", etape: 2, seedDone: 5, seedLast: 9, specs: [s("Secouriste", "Niveau 2 · 30 mai 2026"), s("Pionnier", "Niveau 1 · 12 avr. 2026")] },
  { id: "aminata", prenom: "Aminata", nom: "Sow", age: 13, branche: "troupe", etape: 1, seedDone: 10, seedLast: 14, specs: [s("Musicien", "Niveau 1 · 18 juil. 2026")] },
  { id: "mamadou", prenom: "Mamadou", nom: "Faye", age: 12, branche: "troupe", etape: 0, seedDone: 2, seedLast: 52, specs: [] },
  { id: "khady", prenom: "Khady", nom: "Gueye", age: 14, branche: "troupe", etape: 1, seedDone: 3, seedLast: 33, specs: [s("Informatique", "Niveau 1 · 7 mars 2026")] },
  { id: "ousmane", prenom: "Ousmane", nom: "Diallo", age: 17, branche: "troupe", etape: 3, seedDone: 1, seedLast: 26, specs: [s("Pionnier", "Niveau 3 · 2 août 2026"), s("Secouriste", "Niveau 2 · 15 nov. 2025"), s("Badge Service", "28 sept. 2026")] },
  { id: "mariama", prenom: "Mariama", nom: "Cissé", age: 15, branche: "troupe", etape: 2, seedDone: 2, seedLast: 7, specs: [s("Photographe", "Niveau 1 · 5 sept. 2026")] },
  { id: "pape", prenom: "Pape", nom: "Seck", age: 12, branche: "troupe", etape: 0, seedDone: 6, seedLast: 3, specs: [] },
  { id: "ndeye", prenom: "Ndèye", nom: "Thiam", age: 13, branche: "troupe", etape: 1, seedDone: 5, seedLast: 21, specs: [] },
];

export const MEUTE: Jeune[] = [
  { id: "ibou", prenom: "Ibou", nom: "Ndiaye", age: 9, branche: "meute", etape: 1, seedDone: 4, seedLast: 16, specs: [] },
];

export const ALL_JEUNES = [...TROUPE, ...MEUTE];

export function findJeune(id: string | undefined | null): Jeune | undefined {
  return ALL_JEUNES.find((j) => j.id === id);
}

export const fullName = (j: Jeune) => `${j.prenom} ${j.nom}`;

/** Enfants liés au compte famille de démo (table liens_parent). */
export const FAMILLE = { name: "Famille Ndiaye", kids: ["awa", "ibou"] };

/** Prochaines cérémonies, relatives à aujourd'hui pour la démo. */
export function ceremonies(now: Date = new Date()) {
  const plus = (n: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);
    return toISODate(d);
  };
  return { courHonneur: plus(12), remiseMeute: plus(19) };
}

/** Données des unités que la démo ne détaille pas (meute et route du groupe). */
export const GROUP_OTHER_UNITS = {
  meute: { effectif: 18, cadres: 4, parEtape: [5, 7, 4, 2], valideesCeMois: 14, sansValidation: 4 },
  route: { effectif: 7, cadres: 2 },
  aRemettre: [
    { name: "Seynabou Diouf", step: "2e étoile" },
    { name: "Alioune Kane", step: "1re étoile" },
  ],
};

export function historiqueUnites(j: Jeune): { unit: string; period: string }[] {
  const y = new Date().getFullYear();
  if (j.branche === "meute") return [{ unit: "Meute Saint-Paul", period: `depuis sept. ${y - 2}` }];
  if (j.age >= 13) {
    const montee = y - (j.age - 12);
    return [
      { unit: "Troupe Saint-Paul", period: `depuis sept. ${montee}` },
      { unit: "Meute Saint-Paul", period: `2018 – ${montee}` },
    ];
  }
  return [
    { unit: "Troupe Saint-Paul", period: `depuis sept. ${y}` },
    { unit: "Meute Saint-Paul", period: `${y - 5} – ${y}` },
  ];
}

/** Date de remise (démo) d'une étape déjà franchie. */
export function dateRemise(j: Jeune, k: number): string {
  return toISODate(daysAgo(j.seedLast + 150 * (j.etape - k) + 40));
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function seedValidations(): Validation[] {
  const out: Validation[] = [];
  const now = new Date().toISOString();
  for (const j of ALL_JEUNES) {
    for (let i = 0; i < j.seedDone; i++) {
      out.push({
        id: uuid(),
        jeuneId: j.id,
        etape: j.etape,
        critere: i,
        date: toISODate(daysAgo(j.seedLast + (j.seedDone - 1 - i) * 11)),
        validePar: CADRES[i % 3 === 2 ? 1 : 0],
        pending: false,
        annuleeLe: null,
        updatedAt: now,
      });
    }
  }
  // Une validation annulée, pour montrer qu'elle reste au journal.
  out.push({
    id: uuid(),
    jeuneId: "moussa",
    etape: 1,
    critere: 6,
    date: toISODate(daysAgo(30)),
    validePar: CADRES[1],
    pending: false,
    annuleeLe: toISODate(daysAgo(6)),
    annuleePar: CADRES[0],
    updatedAt: now,
  });
  return out;
}
