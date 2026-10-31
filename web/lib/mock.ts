// Données simulées du groupe Grand-Dakar. Remplacées par Supabase plus tard :
// chaque objet suit les champs des tables jeunes, validations, reconnaissances_jeunes.

import { BRANCHES, type BranchCode } from "./referentiels";
import { daysAgo, fromISODate, toISODate } from "./dates";

export interface Spec {
  name: string;
  meta: string;
}

export interface Jeune {
  id: string;
  prenom: string;
  nom: string;
  /** Date ISO ; inconnue pour un jeune ajouté depuis une liste collée. */
  dateNaissance: string | null;
  /** Date ISO d'entrée dans l'unité. */
  dateEntree: string;
  branche: BranchCode;
  /** Étape en cours (identifiant d'étape du référentiel). */
  etapeId: string;
  /** Domaines au choix et brevets retenus pour ce jeune (identifiants). */
  choix: string[];
  specs: Spec[];
}

export interface Validation {
  id: string;
  jeuneId: string;
  etapeId: string;
  domaineId: string;
  preuveId: string;
  /** Date ISO de réussite de la preuve. */
  date: string;
  validePar: string;
  /** Comment le jeune a réussi la preuve (activité, lieu, témoin). */
  commentaire?: string;
  /** Saisie faite hors connexion, pas encore envoyée au serveur. */
  pending: boolean;
  /** Une validation ne s'efface jamais : on renseigne annuleeLe. */
  annuleeLe: string | null;
  annuleePar?: string;
  /** Lot de saisie, pour « Annuler » juste après la confirmation. */
  batch?: string;
  /** Version du référentiel de la branche au moment de la validation. */
  refVersion?: number;
  updatedAt: string;
}

export const GROUPE = "Groupe Grand-Dakar";

export const CURRENT_CADRE = { full: "Cdt. Ibrahima Seck", short: "Cdt. I. Seck" };
const CADRES = [CURRENT_CADRE.short, "Adj. F. Mbaye"];

/**
 * Données de démo d'un jeune : âge, étape, avancement (part des preuves obligatoires réussies,
 * ou brevets obtenus pour Technicien) et ancienneté de la dernière validation.
 */
interface Seed {
  id: string;
  prenom: string;
  nom: string;
  age: number;
  branche: BranchCode;
  etape: number;
  avance?: number;
  brevets?: string[];
  last: number;
  specs?: Spec[];
  choix?: string[];
}

const s = (name: string, meta: string): Spec => ({ name, meta });

const SEEDS: Seed[] = [
  { id: "moussa", prenom: "Moussa", nom: "Diop", age: 14, branche: "troupe", etape: 1, avance: 0.55, last: 5, specs: [s("Secouriste", "Niveau 1 · 2 mai 2026")] },
  { id: "awa", prenom: "Awa", nom: "Ndiaye", age: 13, branche: "troupe", etape: 1, avance: 0.7, last: 12, specs: [s("Cuisinier", "Niveau 1 · 14 juin 2026"), s("Badge Environnement", "3 oct. 2026")] },
  { id: "cheikh", prenom: "Cheikh", nom: "Fall", age: 15, branche: "troupe", etape: 2, brevets: ["br.campeur", "br.cuisinier"], choix: ["br.topographe"], last: 19, specs: [s("Pionnier", "Niveau 2 · 9 août 2026"), s("Topographe", "Niveau 1 · 21 févr. 2026")] },
  { id: "fatou", prenom: "Fatou", nom: "Sarr", age: 12, branche: "troupe", etape: 0, avance: 0.45, last: 41 },
  { id: "ibrahima", prenom: "Ibrahima", nom: "Ba", age: 16, branche: "troupe", etape: 2, brevets: ["br.secourisme", "br.campeur", "br.nageur"], last: 9, specs: [s("Secouriste", "Niveau 2 · 30 mai 2026"), s("Pionnier", "Niveau 1 · 12 avr. 2026")] },
  { id: "aminata", prenom: "Aminata", nom: "Sow", age: 13, branche: "troupe", etape: 1, avance: 1, last: 14, specs: [s("Musicien", "Niveau 1 · 18 juil. 2026")] },
  { id: "mamadou", prenom: "Mamadou", nom: "Faye", age: 12, branche: "troupe", etape: 0, avance: 0.2, last: 52 },
  { id: "khady", prenom: "Khady", nom: "Gueye", age: 14, branche: "troupe", etape: 1, avance: 0.35, last: 33, specs: [s("Informatique", "Niveau 1 · 7 mars 2026")] },
  { id: "ousmane", prenom: "Ousmane", nom: "Diallo", age: 17, branche: "troupe", etape: 3, avance: 0.1, last: 26, specs: [s("Pionnier", "Niveau 3 · 2 août 2026"), s("Secouriste", "Niveau 2 · 15 nov. 2025"), s("Badge Service", "28 sept. 2026")] },
  { id: "mariama", prenom: "Mariama", nom: "Cissé", age: 15, branche: "troupe", etape: 2, brevets: ["br.musicien"], choix: ["br.secourisme"], last: 7, specs: [s("Photographe", "Niveau 1 · 5 sept. 2026")] },
  { id: "pape", prenom: "Pape", nom: "Seck", age: 12, branche: "troupe", etape: 0, avance: 0.8, last: 3 },
  { id: "ndeye", prenom: "Ndèye", nom: "Thiam", age: 13, branche: "troupe", etape: 1, avance: 0.5, last: 21 },
  { id: "ibou", prenom: "Ibou", nom: "Ndiaye", age: 9, branche: "meute", etape: 1, avance: 0.6, last: 16 },
];

const SEED_BY_ID = new Map(SEEDS.map((x) => [x.id, x]));

function birthDate(age: number, now: Date): string {
  return toISODate(new Date(now.getFullYear() - age, now.getMonth() - 4, 10));
}

function jeuneFromSeed(x: Seed, now: Date): Jeune {
  return {
    id: x.id,
    prenom: x.prenom,
    nom: x.nom,
    dateNaissance: birthDate(x.age, now),
    dateEntree: `${now.getFullYear() - Math.max(x.age - 11, 1)}-09-15`,
    branche: x.branche,
    etapeId: BRANCHES[x.branche].steps[x.etape].id,
    choix: x.choix ?? [],
    specs: x.specs ?? [],
  };
}

export function seedJeunes(now: Date = new Date()): Jeune[] {
  return SEEDS.map((x) => jeuneFromSeed(x, now));
}

export function findJeune(jeunes: Jeune[], id: string | undefined | null): Jeune | undefined {
  return jeunes.find((j) => j.id === id);
}

export const fullName = (j: Pick<Jeune, "prenom" | "nom">) => `${j.prenom} ${j.nom}`;

export function ageOf(j: Jeune, now: Date = new Date()): number | null {
  if (!j.dateNaissance) return null;
  const b = fromISODate(j.dateNaissance);
  const birthdayPassed = now.getMonth() > b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() >= b.getDate());
  return now.getFullYear() - b.getFullYear() - (birthdayPassed ? 0 : 1);
}

/** Enfants liés au compte famille de démo (table liens_parent). */
export const FAMILLE = { name: "Famille Ndiaye", kids: ["awa", "ibou"] };

/** Prochaines cérémonies, relatives à aujourd'hui pour la démo. */
export function ceremonies(now: Date = new Date()) {
  const plus = (n: number) => toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n));
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
  const unit = BRANCHES[j.branche].unit;
  const debut = fromISODate(j.dateEntree).getFullYear();
  const age = ageOf(j);
  if (j.branche !== "troupe" || age === null || age < 13) return [{ unit, period: `depuis sept. ${debut}` }];
  return [
    { unit, period: `depuis sept. ${debut}` },
    { unit: BRANCHES.meute.unit, period: `${debut - 4} – ${debut}` },
  ];
}

/** Date de remise (démo) d'une étape déjà franchie ; inconnue pour un jeune ajouté par le chef. */
export function dateRemise(j: Jeune, k: number, current: number): string | null {
  const x = SEED_BY_ID.get(j.id);
  return x ? toISODate(daysAgo(x.last + 150 * (current - k) + 40)) : null;
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const DEMO_COMMENTS: Record<string, string> = {
  "tr.eng.contact.1": "Sous-camp monté au camp de Toubab Dialaw",
  "tr.eng.sport.3": "1 km en 6 min 40 lors de la sortie à Hann",
  "tr.vol.esprit.2": "Aide sa grand-mère au marché chaque samedi",
  "br.campeur": "15 nuits sous tente entre Popenguine et Toubab Dialaw",
};

/** Preuves (ou brevets) réussies par un jeune de démo, dans l'ordre du carnet. */
function seededPreuves(x: Seed): { domaineId: string; preuveId: string }[] {
  const step = BRANCHES[x.branche].steps[x.etape];
  if (x.brevets) {
    return x.brevets.map((preuveId) => ({ preuveId, domaineId: step.domaines.find((d) => d.preuves.some((p) => p.id === preuveId))?.id ?? "" }));
  }
  const ordered = step.domaines
    .filter((d) => d.obligatoire)
    .flatMap((d) => d.preuves.slice(0, d.min ?? d.preuves.length).map((p) => ({ domaineId: d.id, preuveId: p.id })));
  return ordered.slice(0, Math.round((x.avance ?? 0) * ordered.length));
}

export function seedValidations(now: Date = new Date()): Validation[] {
  const stamp = now.toISOString();
  const out: Validation[] = [];
  for (const x of SEEDS) {
    const step = BRANCHES[x.branche].steps[x.etape];
    const done = seededPreuves(x);
    done.forEach(({ domaineId, preuveId }, i) => {
      out.push({
        id: uuid(),
        jeuneId: x.id,
        etapeId: step.id,
        domaineId,
        preuveId,
        date: toISODate(daysAgo(x.last + Math.floor((done.length - 1 - i) / 3) * 7, now)),
        validePar: CADRES[i % 3 === 2 ? 1 : 0],
        commentaire: DEMO_COMMENTS[preuveId],
        pending: false,
        annuleeLe: null,
        updatedAt: stamp,
      });
    });
  }
  // Une validation annulée, pour montrer qu'elle reste au journal.
  out.push({
    id: uuid(),
    jeuneId: "moussa",
    etapeId: "tr.eng",
    domaineId: "tr.eng.equipement",
    preuveId: "tr.eng.equipement.1",
    date: toISODate(daysAgo(30, now)),
    validePar: CADRES[1],
    pending: false,
    annuleeLe: toISODate(daysAgo(6, now)),
    annuleePar: CADRES[0],
    updatedAt: stamp,
  });
  return out;
}
