// Lecture d'une liste de jeunes collée par le chef d'unité (WhatsApp, Excel, notes).
// Une ligne par jeune ; colonnes séparées par tabulation, « ; » ou « , » acceptées.

export const MAX_PASTE_ROWS = 80;

export type Probleme = "nom-manquant" | "doublon" | null;

export interface ParsedName {
  /** Numéro de ligne dans le texte collé, pour les clés d'affichage. */
  line: number;
  prenom: string;
  nom: string;
  probleme: Probleme;
}

interface Person {
  prenom: string;
  nom: string;
}

const BULLET = /^\s*(?:\d+\s*[.)\-]|[-•*·])\s*/;
const COLUMNS = /[\t;,]/;

export function parseNameList(text: string, existing: Person[]): ParsedName[] {
  const lines = text.split(/\r?\n/).map((l, i) => ({ i, text: l.replace(BULLET, "").trim() })).filter((l) => l.text);
  const order = headerOrder(lines[0]?.text);
  const body = order ? lines.slice(1) : lines;

  const seen = new Set(existing.map(personKey));
  const out: ParsedName[] = [];
  for (const l of body.slice(0, MAX_PASTE_ROWS)) {
    const p = COLUMNS.test(l.text) ? fromColumns(l.text, order ?? "prenom-nom") : fromWords(l.text);
    const key = personKey(p);
    const probleme: Probleme = !p.nom ? "nom-manquant" : seen.has(key) ? "doublon" : null;
    seen.add(key);
    out.push({ line: l.i, ...p, probleme });
  }
  return out;
}

/** Ordre des colonnes annoncé par une ligne d'en-tête, ou null s'il n'y en a pas. */
function headerOrder(first: string | undefined): "prenom-nom" | "nom-prenom" | null {
  if (!first || !COLUMNS.test(first)) return null;
  const cols = first.split(COLUMNS).map((c) => fold(c.trim()));
  const iPrenom = cols.indexOf("prenom");
  const iNom = cols.indexOf("nom");
  if (iPrenom < 0 || iNom < 0) return null;
  return iPrenom < iNom ? "prenom-nom" : "nom-prenom";
}

function fromColumns(text: string, order: "prenom-nom" | "nom-prenom"): Person {
  const [a = "", b = ""] = text.split(COLUMNS).map((c) => c.trim()).filter(Boolean);
  const [prenom, nom] = order === "prenom-nom" ? [a, b] : [b, a];
  return { prenom: properCase(prenom), nom: properCase(nom) };
}

/** « Mame Diarra Ndiaye », « NDIAYE Awa », « Mame Diarra BOUSSO ». */
function fromWords(text: string): Person {
  const words = text.split(/\s+/);
  if (words.length === 1) return { prenom: properCase(words[0]), nom: "" };

  const caps = words.map(isAllCaps);
  let nomWords: string[];
  let prenomWords: string[];
  if (caps.some(Boolean) && !caps.every(Boolean)) {
    const lead = caps.indexOf(false);
    const trail = caps.lastIndexOf(false) + 1;
    [nomWords, prenomWords] = lead > 0 ? [words.slice(0, lead), words.slice(lead)] : [words.slice(trail), words.slice(0, trail)];
  } else {
    [nomWords, prenomWords] = [words.slice(-1), words.slice(0, -1)];
  }
  return { prenom: prenomWords.map(properCase).join(" "), nom: nomWords.map(properCase).join(" ") };
}

function isAllCaps(word: string): boolean {
  const letters = word.replace(/[^\p{L}]/gu, "");
  return letters.length > 1 && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
}

/** Majuscules d'usage pour un mot tout en capitales ou tout en minuscules ; sinon il est gardé tel quel. */
function properCase(word: string): string {
  if (word !== word.toUpperCase() && word !== word.toLowerCase()) return word;
  return word.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function personKey(p: Person): string {
  return `${fold(p.prenom)}|${fold(p.nom)}`;
}
