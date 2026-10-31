import { describe, expect, it } from "vitest";
import { libelleGroupe, nettoyerGroupe, nomGroupe, nomUnite, nomsUnites } from "../groupe";

const g = { nom: "Troisième Dakar", paroisse: "Saint-Pierre" };

describe("nettoyerGroupe", () => {
  it("garde la désignation du groupe sans le mot « Groupe », et la paroisse sans le mot « Paroisse »", () => {
    expect(nettoyerGroupe({ nom: "  groupe   Troisième  Dakar ", paroisse: "Paroisse Saint-Pierre " })).toEqual(g);
    expect(nettoyerGroupe({ nom: "Troisième Dakar", paroisse: "" })).toEqual({ nom: "Troisième Dakar", paroisse: "" });
  });

  it("ne retire pas « Groupe » s'il fait partie d'un mot", () => {
    expect(nettoyerGroupe({ nom: "Groupement Est", paroisse: "" }).nom).toBe("Groupement Est");
  });
});

describe("noms affichés", () => {
  it("nomme le groupe et ses unités d'après la désignation du groupe", () => {
    expect(nomGroupe(g)).toBe("Groupe Troisième Dakar");
    expect(nomUnite("troupe", g)).toBe("Troupe Troisième Dakar");
    expect(nomUnite("meute", g)).toBe("Meute Troisième Dakar");
    expect(nomsUnites(g)).toEqual({ meute: "Meute Troisième Dakar", troupe: "Troupe Troisième Dakar", route: "Route Troisième Dakar" });
  });

  it("ajoute la paroisse au libellé complet du groupe", () => {
    expect(libelleGroupe(g)).toBe("Groupe Troisième Dakar · Paroisse Saint-Pierre");
    expect(libelleGroupe({ ...g, paroisse: "" })).toBe("Groupe Troisième Dakar");
  });

  it("reste lisible tant que le groupe n'a pas de nom", () => {
    const vide = { nom: "", paroisse: "" };
    expect(nomGroupe(vide)).toBe("Groupe");
    expect(nomUnite("troupe", vide)).toBe("Troupe");
  });
});

describe("renommerUnites", () => {
  it("renomme les unités qui suivaient le nom du groupe, pas celles nommées à part", async () => {
    const { renommerUnites } = await import("../groupe");
    const unites = [
      { id: "troupe", nom: "Troupe Troisième Dakar", branche: "troupe" as const, annee: "2026-2027", responsable: null },
      { id: "t2", nom: "Troupe des pionniers", branche: "troupe" as const, annee: "2026-2027", responsable: null },
    ];
    const apres = renommerUnites(unites, g, { nom: "Quatrième Dakar", paroisse: "" });
    expect(apres.map((u) => u.nom)).toEqual(["Troupe Quatrième Dakar", "Troupe des pionniers"]);
    expect(unites[0].nom).toBe("Troupe Troisième Dakar");
  });
});
