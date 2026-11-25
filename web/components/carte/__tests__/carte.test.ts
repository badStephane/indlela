import { describe, expect, it } from "vitest";
import { segmentsBarre } from "../BarreSentier";
import { largeurSegment } from "../Echelle";
import { estOngletActif, ongletsVisibles } from "../NavBas";

describe("segmentsBarre", () => {
  it("garde la teinte de chaque étape quand une étape précédente est vide", () => {
    const segments = segmentsBarre([
      { etape: "Volontaire", nombre: 0 },
      { etape: "Engagé", nombre: 5 },
      { etape: "Technicien", nombre: 2 },
    ]);

    expect(segments.map((s) => s.etape)).toEqual(["Engagé", "Technicien"]);
    expect(segments[0].teinte).toBe("bg-sentier-2 text-encre");
    expect(segments[1].teinte).toBe("bg-sentier text-white");
  });

  it("donne la teinte la plus foncée aux étapes au-delà de la quatrième", () => {
    const segments = segmentsBarre(["A", "B", "C", "D", "E"].map((etape) => ({ etape, nombre: 1 })));

    expect(segments[4].teinte).toBe("bg-encre text-white");
  });

  it("renvoie une liste vide quand l'unité n'a aucun jeune", () => {
    expect(segmentsBarre([{ etape: "Volontaire", nombre: 0 }])).toEqual([]);
  });
});

describe("largeurSegment", () => {
  it("garde 14 px par preuve quand l'échelle est courte", () => {
    expect(largeurSegment(10)).toBe(14);
  });

  it("rétrécit les segments pour que l'échelle tienne sur un téléphone", () => {
    expect(largeurSegment(30) * 30).toBeLessThanOrEqual(180);
  });

  it("ne descend jamais sous 4 px", () => {
    expect(largeurSegment(200)).toBe(4);
  });
});

describe("ongletsVisibles", () => {
  it("ne garde que les quatre premiers onglets", () => {
    const onglets = ["a", "b", "c", "d", "e"].map((x) => ({ libelle: x, href: `/${x}` }));

    expect(ongletsVisibles(onglets).map((o) => o.libelle)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("estOngletActif", () => {
  it("ignore la requête et la barre oblique finale", () => {
    expect(estOngletActif("/unite", "/unite/")).toBe(true);
    expect(estOngletActif("/jeune?id=12", "/jeune")).toBe(true);
  });

  it("distingue deux chemins différents", () => {
    expect(estOngletActif("/unite", "/unite/epreuves")).toBe(false);
  });
});
