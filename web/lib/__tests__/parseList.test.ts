import { describe, expect, it } from "vitest";
import { MAX_PASTE_ROWS, parseNameList } from "../parseList";

const names = (text: string, existing: { prenom: string; nom: string }[] = []) =>
  parseNameList(text, existing).map((r) => [r.prenom, r.nom, r.probleme]);

describe("parseNameList", () => {
  it("lit une ligne par jeune, le dernier mot étant le nom", () => {
    expect(names("Awa Ndiaye\nMoussa Diop")).toEqual([
      ["Awa", "Ndiaye", null],
      ["Moussa", "Diop", null],
    ]);
  });

  it("garde les prénoms composés", () => {
    expect(names("Mame Diarra Ndiaye")).toEqual([["Mame Diarra", "Ndiaye", null]]);
  });

  it("reconnaît le nom écrit en capitales, avant ou après le prénom", () => {
    expect(names("NDIAYE Awa\nMame Diarra BOUSSO")).toEqual([
      ["Awa", "Ndiaye", null],
      ["Mame Diarra", "Bousso", null],
    ]);
  });

  it("remet les majuscules d'usage", () => {
    expect(names("awa ndiaye\nMAMADOU N'DIAYE-FALL")).toEqual([
      ["Awa", "Ndiaye", null],
      ["Mamadou", "N'Diaye-Fall", null],
    ]);
  });

  it("ignore les lignes vides, la numérotation et les puces", () => {
    expect(names("1. Awa Ndiaye\n\n2) Moussa Diop\n- Fatou Sarr\n• Pape Seck\n  ")).toEqual([
      ["Awa", "Ndiaye", null],
      ["Moussa", "Diop", null],
      ["Fatou", "Sarr", null],
      ["Pape", "Seck", null],
    ]);
  });

  it("lit les colonnes d'un tableur, prénom puis nom par défaut", () => {
    expect(names("Awa\tNdiaye\nMoussa;Diop")).toEqual([
      ["Awa", "Ndiaye", null],
      ["Moussa", "Diop", null],
    ]);
  });

  it("suit l'ordre de la ligne d'en-tête et ne la garde pas", () => {
    expect(names("Nom;Prénom\nNdiaye;Awa")).toEqual([["Awa", "Ndiaye", null]]);
  });

  it("signale une ligne sans nom de famille", () => {
    expect(names("Awa")).toEqual([["Awa", "", "nom-manquant"]]);
  });

  it("signale un jeune déjà dans l'unité, sans tenir compte des accents ni de la casse", () => {
    expect(names("Ndeye THIAM", [{ prenom: "Ndèye", nom: "Thiam" }])).toEqual([["Ndeye", "Thiam", "doublon"]]);
  });

  it("signale un jeune collé deux fois", () => {
    expect(names("Awa Ndiaye\nawa ndiaye")).toEqual([
      ["Awa", "Ndiaye", null],
      ["Awa", "Ndiaye", "doublon"],
    ]);
  });

  it(`s'arrête à ${MAX_PASTE_ROWS} jeunes`, () => {
    const text = Array.from({ length: MAX_PASTE_ROWS + 5 }, (_, i) => `Jeune${i} Nom${i}`).join("\n");
    expect(parseNameList(text, [])).toHaveLength(MAX_PASTE_ROWS);
  });
});
