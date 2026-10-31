// Lecture d'une liste de jeunes venue d'un fichier Excel (ou CSV) : un tableau de cellules
// en texte, avec ou sans ligne de titres. Chaque ligne est contrôlée avant l'import.

import { BRANCHES } from "./referentiels";

/** Au-delà, l'import se fait en plusieurs fois (une unité dépasse rarement 60 jeunes). */
export const MAX_IMPORT_ROWS = 200;

interface Person {
  prenom: string;
  nom: string;
}

interface NamedStep {
  id: string;
  name: string;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const personKey = (p: Person) => `${norm(p.prenom)}|${norm(p.nom)}`;

/** Texte d'une cellule Excel ; une date devient AAAA-MM-JJ (Excel la stocke sans fuseau). */
export function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return "";
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
  }
  return String(v).trim();
}

/** « 14/03/2013 », « 14.03.2013 » ou « 2013-03-14 » → date ISO, si elle existe. */
export function parseDate(s: string): string | null {
  let y: number, m: number, d: number;
  const fr = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (fr) [d, m, y] = [+fr[1], +fr[2], +fr[3]];
  else if (iso) [y, m, d] = [+iso[1], +iso[2], +iso[3]];
  else return null;
  const x = new Date(y, m - 1, d);
  if (x.getFullYear() !== y || x.getMonth() !== m - 1 || x.getDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function ageAt(iso: string, now: Date = new Date()): number {
  const b = new Date(iso + "T00:00:00");
  let a = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
  return a;
}

const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type ColumnKey = "prenom" | "nom" | "date" | "etape" | "unite";

/** Repère les colonnes par leur titre ; sans ligne de titres, l'ordre par défaut s'applique. */
function columns(rows: string[][], order: ColumnKey[]): { col: Record<ColumnKey, number>; body: string[][]; first: number } {
  const header = (rows[0] ?? []).map(norm);
  const hasHeader = header.some((h) => h.startsWith("prenom") || h === "nom" || h.startsWith("nom "));
  const find = (key: ColumnKey): number => {
    if (!hasHeader) return order.indexOf(key);
    if (key === "nom") return header.findIndex((h) => h === "nom" || h.startsWith("nom ") || h === "nom de famille");
    return header.findIndex((h) => h.startsWith(key));
  };
  const col = { prenom: find("prenom"), nom: find("nom"), date: find("date"), etape: find("etape"), unite: find("unite") };
  return { col, body: hasHeader ? rows.slice(1) : rows, first: hasHeader ? 2 : 1 };
}

const at = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");

export interface LigneUnite {
  /** Numéro de ligne dans le fichier, titres compris. */
  ligne: number;
  prenom: string;
  nom: string;
  dateNaissance: string | null;
  /** Étape lue dans le fichier ; null = l'étape choisie pour toute la liste. */
  etapeId: string | null;
  erreur: string | null;
}

/** Liste de l'unité importée par son responsable : prénom et nom exigés, date et étape facultatives. */
export function analyseListeUnite(rows: string[][], existing: Person[], steps: NamedStep[], now: Date = new Date()): LigneUnite[] {
  const { col, body, first } = columns(rows, ["prenom", "nom", "date", "etape"]);
  const seen = new Set(existing.map(personKey));
  const today = isoOf(now);
  const out: LigneUnite[] = [];
  for (const [i, r] of body.entries()) {
    if (out.length >= MAX_IMPORT_ROWS) break;
    if (!r.some((c) => c.trim())) continue;
    const prenom = at(r, col.prenom);
    const nom = at(r, col.nom);
    const rawDate = at(r, col.date);
    const rawEtape = at(r, col.etape);
    const date = rawDate ? parseDate(rawDate) : null;
    const etape = rawEtape ? steps.find((s) => norm(s.name) === norm(rawEtape)) : undefined;
    const key = personKey({ prenom, nom });
    let erreur: string | null = null;
    if (!prenom || !nom) erreur = !prenom ? "Prénom manquant" : "Nom manquant";
    else if (rawDate && (!date || date > today)) erreur = `Date invalide : ${rawDate}`;
    else if (rawEtape && !etape) erreur = `Étape inconnue : ${rawEtape}`;
    else if (seen.has(key)) erreur = "Déjà dans l'unité";
    if (prenom && nom) seen.add(key);
    out.push({ ligne: i + first, prenom, nom, dateNaissance: date, etapeId: etape?.id ?? null, erreur });
  }
  return out;
}

export interface ImportRow {
  ligne: number;
  prenom: string;
  nom: string;
  dateNaissance: string | null;
  age: number | null;
  erreur: string | null;
}

/** Import de l'admin pour tout le groupe : date de naissance et unité exigées. En V1, seule la troupe est ouverte. */
export function analyseImport(rows: string[][], existing: Person[], now: Date = new Date()): ImportRow[] {
  const { col, body, first } = columns(rows, ["prenom", "nom", "date", "unite"]);
  const seen = new Set(existing.map(personKey));
  return body
    .map((r, i) => ({ r, ligne: i + first }))
    .filter(({ r }) => r.some((c) => c.trim()))
    .slice(0, MAX_IMPORT_ROWS)
    .map(({ r, ligne }) => {
      const prenom = at(r, col.prenom);
      const nom = at(r, col.nom);
      const rawDate = at(r, col.date);
      const rawUnite = at(r, col.unite);
      const unite = norm(rawUnite);
      const date = rawDate ? parseDate(rawDate) : null;
      const key = personKey({ prenom, nom });
      let erreur: string | null = null;
      if (!prenom || !nom) erreur = !prenom ? "Prénom manquant" : "Nom manquant";
      else if (!rawDate) erreur = "Date de naissance manquante";
      else if (!date) erreur = `Date invalide : ${rawDate}`;
      else if (unite.startsWith("meute") || unite.startsWith("route"))
        erreur = `${unite.startsWith("meute") ? BRANCHES.meute.name : BRANCHES.route.name} : module prévu en V2`;
      else if (!unite.startsWith("troupe")) erreur = rawUnite ? `Unité inconnue : ${rawUnite}` : "Unité manquante";
      else if (seen.has(key)) erreur = "Déjà dans le carnet";
      if (!erreur) seen.add(key);
      return { ligne, prenom, nom, dateNaissance: date, age: date ? ageAt(date, now) : null, erreur };
    });
}

/** Modèle Excel de l'import de l'admin. */
export const MODELE_IMPORT: string[][] = [
  ["Prénom", "Nom", "Date de naissance", "Unité"],
  ["Mame Diarra", "Sy", "14/03/2013", "Troupe"],
];

/** Fichier d'essai : quelques lignes justes, et une erreur de chaque sorte. */
export const EXEMPLE_IMPORT: string[][] = [
  ["Prénom", "Nom", "Date de naissance", "Unité"],
  ["Mame Diarra", "Sy", "14/03/2013", "Troupe"],
  ["Babacar", "Ndao", "02/11/2012", "Troupe"],
  ["Coumba", "Faye", "27/06/2014", "Troupe"],
  ["Alassane", "Wade", "09/01/2013", "Troupe"],
  ["Seynabou", "Diouf", "18/08/2016", "Meute"],
  ["Moussa", "Diop", "05/05/2012", "Troupe"],
  ["Adja", "Mbengue", "31/02/2013", "Troupe"],
  ["Ousseynou", "", "12/12/2012", "Troupe"],
];

/** Modèle Excel de la liste d'une unité, rempli par son responsable. */
export const MODELE_UNITE: string[][] = [
  ["Prénom", "Nom", "Date de naissance", "Étape"],
  ["Mame Diarra", "Sy", "14/03/2013", "Volontaire"],
];
