"use client";

// Lecture et écriture de classeurs Excel (.xlsx) dans le navigateur.
// Un ancien fichier CSV reste accepté à l'import.

import { readSheet } from "read-excel-file/browser";
import writeXlsxFile, { type Cell, type SheetData } from "write-excel-file/browser";
import { cellText } from "./importTable";
import { parseCsv } from "./csv";

export const EXCEL_ACCEPT = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.csv,text/csv";

/** Première feuille du classeur, chaque cellule en texte. */
export async function lireTableau(file: File): Promise<string[][]> {
  if (/\.csv$/i.test(file.name)) return parseCsv(await file.text());
  const data = await readSheet(file);
  return data.map((row) => row.map(cellText));
}

export type Valeur = string | number | Date | null | undefined;

export interface Feuille {
  nom: string;
  /** Première ligne = titres des colonnes (en gras, figés en haut). */
  lignes: Valeur[][];
  largeurs?: number[];
}

/** Excel refuse certains caractères et plus de 31 caractères dans un nom de feuille. */
const nomFeuille = (s: string) => s.replace(/[[\]:*?/\\]/g, " ").slice(0, 31);

function cellule(v: Valeur, titre: boolean): Cell {
  if (v === null || v === undefined || v === "") return null;
  if (titre) return { value: String(v), fontWeight: "bold" };
  if (v instanceof Date) return { value: v, type: Date, format: "dd/mm/yyyy" };
  return v;
}

export async function telechargerExcel(fichier: string, feuilles: Feuille[]): Promise<void> {
  const sheets = feuilles.map((f) => ({
    sheet: nomFeuille(f.nom),
    data: f.lignes.map((row, i) => row.map((v) => cellule(v, i === 0))) as SheetData,
    columns: f.largeurs?.map((width) => ({ width })),
    stickyRowsCount: 1,
    dateFormat: "dd/mm/yyyy",
  }));
  await writeXlsxFile(sheets).toFile(fichier);
}

/** Nom de fichier sans accents ni espaces : « Groupe Grand-Dakar » → « groupe-grand-dakar ». */
export function slug(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "groupe"
  );
}
