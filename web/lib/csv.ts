// CSV au format attendu par Excel et LibreOffice en français : point-virgule, UTF-8 avec BOM.

import { BRANCHES } from "./referentiels";
import type { Jeune } from "./mock";

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const url = URL.createObjectURL(new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Découpe un CSV (séparateur ; ou , détecté sur la première ligne, guillemets gérés). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some(Boolean));
}

export const MODELE_IMPORT = [
  ["prenom", "nom", "date_naissance", "unite"],
  ["Mame Diarra", "Sy", "14/03/2013", "Troupe Saint-Paul"],
];

export const EXEMPLE_IMPORT = `prenom;nom;date_naissance;unite
Mame Diarra;Sy;14/03/2013;Troupe Saint-Paul
Babacar;Ndao;02/11/2012;Troupe Saint-Paul
Coumba;Faye;27/06/2014;Troupe Saint-Paul
Alassane;Wade;09/01/2013;Troupe
Seynabou;Diouf;18/08/2016;Meute Saint-Paul
Moussa;Diop;05/05/2012;Troupe Saint-Paul
Adja;Mbengue;31/02/2013;Troupe Saint-Paul
Ousseynou;;12/12/2012;Troupe Saint-Paul
`;

export interface ImportRow {
  ligne: number;
  prenom: string;
  nom: string;
  dateNaissance: string | null;
  age: number | null;
  erreur: string | null;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function parseDate(s: string): string | null {
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

/** Contrôle chaque ligne d'un import de jeunes. En V1, seule la troupe est ouverte. */
export function analyseImport(text: string, existing: Jeune[]): ImportRow[] {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const header = rows[0].map(norm);
  const hasHeader = header.some((h) => h.startsWith("prenom") || h === "nom");
  const col = (name: string, fallback: number) => {
    const i = header.findIndex((h) => h.startsWith(name));
    return hasHeader && i >= 0 ? i : fallback;
  };
  const [cP, cN, cD, cU] = [col("prenom", 0), col("nom", 1), col("date", 2), col("unite", 3)];
  const seen = new Set(existing.map((j) => `${norm(j.prenom)}|${norm(j.nom)}`));

  return rows.slice(hasHeader ? 1 : 0).map((r, i) => {
    const prenom = r[cP] ?? "";
    const nom = r[cN] ?? "";
    const unite = norm(r[cU] ?? "");
    const date = r[cD] ? parseDate(r[cD]) : null;
    const key = `${norm(prenom)}|${norm(nom)}`;
    let erreur: string | null = null;
    if (!prenom || !nom) erreur = !prenom ? "Prénom manquant" : "Nom manquant";
    else if (!r[cD]) erreur = "Date de naissance manquante";
    else if (!date) erreur = `Date invalide : ${r[cD]}`;
    else if (unite.startsWith("meute") || unite.startsWith("route"))
      erreur = `${unite.startsWith("meute") ? BRANCHES.meute.name : BRANCHES.route.name} : module prévu en V2`;
    else if (!unite.startsWith("troupe")) erreur = r[cU] ? `Unité inconnue : ${r[cU]}` : "Unité manquante";
    else if (seen.has(key)) erreur = "Déjà dans le carnet";
    if (!erreur) seen.add(key);
    return { ligne: i + (hasHeader ? 2 : 1), prenom, nom, dateNaissance: date, age: date ? ageAt(date) : null, erreur };
  });
}
