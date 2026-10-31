import { describe, expect, it } from "vitest";
import { BRANCHES } from "../referentiels";
import { analyseImport, analyseListeUnite, cellText, MAX_IMPORT_ROWS } from "../importTable";

const steps = BRANCHES.troupe.steps;
const NOW = new Date(2026, 9, 31, 12);
const existing = [{ prenom: "Moussa", nom: "Diop" }];

describe("cellText", () => {
  it("rend chaque cellule Excel en texte", () => {
    expect(cellText(null)).toBe("");
    expect(cellText("  Awa ")).toBe("Awa");
    expect(cellText(12)).toBe("12");
    expect(cellText(new Date(Date.UTC(2013, 2, 14)))).toBe("2013-03-14");
  });
});

describe("analyseListeUnite", () => {
  it("lit les colonnes par leur titre, dans n'importe quel ordre", () => {
    const rows = [
      ["Nom", "Prénom", "Étape", "Date de naissance"],
      ["Sy", "Mame Diarra", "Engagé", "14/03/2013"],
    ];
    const [r] = analyseListeUnite(rows, existing, steps, NOW);
    expect(r).toMatchObject({ ligne: 2, prenom: "Mame Diarra", nom: "Sy", dateNaissance: "2013-03-14", etapeId: "tr.eng", erreur: null });
  });

  it("sans titres, suit l'ordre prénom, nom, date, étape", () => {
    const [r] = analyseListeUnite([["Awa", "Ba", "", ""]], [], steps, NOW);
    expect(r).toMatchObject({ ligne: 1, prenom: "Awa", nom: "Ba", dateNaissance: null, etapeId: null, erreur: null });
  });

  it("reconnaît l'étape sans tenir compte des accents ni des majuscules", () => {
    const rows = [["Prénom", "Nom", "Étape"], ["Awa", "Ba", "ENGAGE"], ["Ali", "Sow", "technicien"]];
    expect(analyseListeUnite(rows, [], steps, NOW).map((r) => r.etapeId)).toEqual(["tr.eng", "tr.tec"]);
  });

  it("signale nom manquant, date ou étape inconnue, et doublon", () => {
    const rows = [
      ["Prénom", "Nom", "Date de naissance", "Étape"],
      ["Awa", "", "", ""],
      ["Ali", "Sow", "31/02/2013", ""],
      ["Ali", "Fall", "", "Pionnier"],
      ["Moussa", "Diop", "", ""],
      ["Coumba", "Faye", "", ""],
      ["coumba", "FAYE", "", ""],
      ["Bébé", "Futur", "01/01/2030", ""],
    ];
    expect(analyseListeUnite(rows, existing, steps, NOW).map((r) => r.erreur)).toEqual([
      "Nom manquant",
      "Date invalide : 31/02/2013",
      "Étape inconnue : Pionnier",
      "Déjà dans l'unité",
      null,
      "Déjà dans l'unité",
      "Date invalide : 01/01/2030",
    ]);
  });

  it("ignore les lignes vides et s'arrête au nombre maximal de lignes", () => {
    const rows = [["Prénom", "Nom"], ["", ""], ...Array.from({ length: MAX_IMPORT_ROWS + 5 }, (_, i) => [`P${i}`, `N${i}`])];
    expect(analyseListeUnite(rows, [], steps, NOW)).toHaveLength(MAX_IMPORT_ROWS);
  });
});

describe("analyseImport (admin)", () => {
  it("exige la date de naissance et une unité ouverte", () => {
    const rows = [
      ["prenom", "nom", "date_naissance", "unite"],
      ["Mame Diarra", "Sy", "14/03/2013", "Troupe Saint-Paul"],
      ["Seynabou", "Diouf", "18/08/2016", "Meute Saint-Paul"],
      ["Babacar", "Ndao", "", "Troupe"],
      ["Moussa", "Diop", "05/05/2012", "Troupe"],
    ];
    expect(analyseImport(rows, existing, NOW).map((r) => r.erreur)).toEqual([null, "Meute : module prévu en V2", "Date de naissance manquante", "Déjà dans le carnet"]);
  });
});
