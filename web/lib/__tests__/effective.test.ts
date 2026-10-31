import { describe, expect, it } from "vitest";
import { EMPTY_ADAPT, effectiveSteps, preuveLabel, type RefEdits, type UnitAdapt } from "../effective";

const NO_EDITS: RefEdits = { edits: {} };
const engage = (ref: RefEdits, adapt: UnitAdapt) => effectiveSteps(ref, { troupe: adapt }).troupe.find((s) => s.id === "tr.eng")!;
const domaine = (ref: RefEdits, adapt: UnitAdapt, id: string) => engage(ref, adapt).domaines.find((d) => d.id === id)!;

describe("effectiveSteps", () => {
  it("reprend les domaines du carnet quand l'unité n'a rien changé", () => {
    const step = engage(NO_EDITS, EMPTY_ADAPT);
    expect(step.domaines.map((d) => d.id)).toContain("tr.eng.chretienne");
    expect(step.domaines.every((d) => !d.retire)).toBe(true);
    expect(domaine(NO_EDITS, EMPTY_ADAPT, "tr.eng.chretienne").obligatoire).toBe(false);
  });

  it("retire un domaine au choix pour l'unité", () => {
    expect(domaine(NO_EDITS, { retirees: ["tr.eng.chretienne"], ajoutees: {} }, "tr.eng.chretienne").retire).toBe(true);
  });

  it("ne retire jamais un domaine obligatoire", () => {
    expect(domaine(NO_EDITS, { retirees: ["tr.eng.sport"], ajoutees: {} }, "tr.eng.sport").retire).toBe(false);
  });

  it("ajoute les preuves propres à l'unité à la fin du domaine", () => {
    const pont = { id: "u1", label: "Construire un pont de singe" };
    const d = domaine(NO_EDITS, { retirees: [], ajoutees: { "tr.eng.contact": [pont] } }, "tr.eng.contact");
    expect(d.preuves.at(-1)).toEqual({ ...pont, unite: true });
    expect(d.preuves.slice(0, -1).every((p) => !p.unite)).toBe(true);
  });

  it("applique le réglage de l'admin : domaine obligatoire ou au choix", () => {
    expect(domaine({ edits: { "tr.eng.chretienne": true } }, EMPTY_ADAPT, "tr.eng.chretienne").obligatoire).toBe(true);
  });
});

describe("preuveLabel", () => {
  it("retrouve le libellé d'une preuve, même d'une unité", () => {
    const steps = effectiveSteps(NO_EDITS, { troupe: { retirees: [], ajoutees: { "tr.vol.sport": [{ id: "u2", label: "Tour du lac" }] } } }).troupe;
    expect(preuveLabel(steps, "tr.vol", "tr.vol.esprit.2")).toMatch(/bonne action/i);
    expect(preuveLabel(steps, "tr.vol", "u2")).toBe("Tour du lac");
    expect(preuveLabel(steps, "tr.vol", "inconnue")).toBe("Preuve supprimée");
  });
});
