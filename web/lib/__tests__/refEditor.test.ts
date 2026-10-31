import { describe, expect, it } from "vitest";
import { BRANCHES, type Etape } from "../referentiels";
import { addDomaine, addEtape, addPreuve, moveDomaine, movePreuve, updateDomaine, updateEtape, updatePreuve } from "../refEditor";

const base = (): Etape[] => BRANCHES.troupe.steps;
const step = (steps: Etape[], id: string) => steps.find((s) => s.id === id)!;
const dom = (steps: Etape[], id: string) => steps.flatMap((s) => s.domaines).find((d) => d.id === id)!;
const preuve = (steps: Etape[], id: string) => steps.flatMap((s) => s.domaines.flatMap((d) => d.preuves)).find((p) => p.id === id)!;

describe("éditeur de référentiel", () => {
  it("ne modifie jamais le référentiel d'origine", () => {
    const before = JSON.stringify(base());
    updatePreuve(base(), "tr.vol.esprit.1", { label: "Autre libellé" });
    addDomaine(base(), "tr.vol", "Nouveau domaine", "d1");
    expect(JSON.stringify(base())).toBe(before);
  });

  it("corrige le libellé d'une preuve sans changer son identifiant", () => {
    const next = updatePreuve(base(), "tr.vol.esprit.2", { label: "  Faire une B.A chaque jour  " });
    expect(preuve(next, "tr.vol.esprit.2").label).toBe("Faire une B.A chaque jour");
  });

  it("refuse un libellé vide", () => {
    const next = updatePreuve(base(), "tr.vol.esprit.2", { label: "   " });
    expect(preuve(next, "tr.vol.esprit.2").label).toBe(preuve(base(), "tr.vol.esprit.2").label);
  });

  it("archive une preuve au lieu de la supprimer", () => {
    const next = updatePreuve(base(), "tr.vol.esprit.7", { archive: true });
    expect(preuve(next, "tr.vol.esprit.7").archive).toBe(true);
    expect(dom(next, "tr.vol.esprit").preuves).toHaveLength(8);
  });

  it("ajoute une preuve en fin de domaine, avec l'identifiant fourni", () => {
    const next = addPreuve(base(), "tr.vol.sport", "Nager 50 m", "p1");
    expect(dom(next, "tr.vol.sport").preuves.at(-1)).toEqual({ id: "p1", label: "Nager 50 m" });
  });

  it("ajoute un domaine obligatoire et vide en fin d'étape", () => {
    const next = addDomaine(base(), "tr.eng", "Secourisme de base", "d1");
    expect(step(next, "tr.eng").domaines.at(-1)).toEqual({ id: "d1", name: "Secourisme de base", obligatoire: true, preuves: [] });
  });

  it("règle « N parmi M » entre 1 et le nombre de preuves actives, ou le retire", () => {
    expect(dom(updateDomaine(base(), "tr.eng.travaux", { min: 4 }), "tr.eng.travaux").min).toBe(4);
    expect(dom(updateDomaine(base(), "tr.eng.travaux", { min: 50 }), "tr.eng.travaux").min).toBe(10);
    expect(dom(updateDomaine(base(), "tr.eng.travaux", { min: 0 }), "tr.eng.travaux").min).toBeUndefined();
  });

  it("monte et descend un domaine, sans sortir de l'étape", () => {
    const ids = (s: Etape[]) => step(s, "tr.vol").domaines.map((d) => d.id);
    expect(ids(moveDomaine(base(), "tr.vol.sport", -1)).slice(0, 3)).toEqual(["tr.vol.esprit", "tr.vol.sport", "tr.vol.chretienne"]);
    expect(ids(moveDomaine(base(), "tr.vol.esprit", -1))).toEqual(ids(base()));
  });

  it("monte et descend une preuve dans son domaine", () => {
    const next = movePreuve(base(), "tr.vol.sport.2", -1);
    expect(dom(next, "tr.vol.sport").preuves.map((p) => p.id).slice(0, 2)).toEqual(["tr.vol.sport.2", "tr.vol.sport.1"]);
  });

  it("renomme une étape et ajoute une étape vide en fin de branche", () => {
    expect(step(updateEtape(base(), "tr.vol", { name: "Aspirant" }), "tr.vol").name).toBe("Aspirant");
    const next = addEtape([], "Compagnon", "e1");
    expect(next).toEqual([{ id: "e1", name: "Compagnon", val: "", domaines: [] }]);
  });
});
