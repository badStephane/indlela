import { describe, expect, it } from "vitest";
import { BRANCHES } from "../referentiels";
import { decisionPossible, etapeSuivante, historique, majoriteAtteinte, type Reconnaissance } from "../courHonneur";

const steps = BRANCHES.troupe.steps;
const recon = (patch: Partial<Reconnaissance>): Reconnaissance => ({
  id: "r1",
  jeuneId: "awa",
  etapeId: "tr.vol",
  date: "2026-03-10",
  decision: "reconnue",
  observations: "",
  ct: "Cdt. Ibrahima Seck",
  pending: false,
  ...patch,
});

describe("majoriteAtteinte", () => {
  it("exige au moins les 3/4 des voix des présents", () => {
    expect(majoriteAtteinte(8, 6, 0.75)).toBe(true);
    expect(majoriteAtteinte(8, 5, 0.75)).toBe(false);
    expect(majoriteAtteinte(7, 6, 0.75)).toBe(true);
    expect(majoriteAtteinte(7, 5, 0.75)).toBe(false);
  });

  it("refuse un vote incohérent", () => {
    expect(majoriteAtteinte(0, 0, 0.75)).toBe(false);
    expect(majoriteAtteinte(5, 6, 0.75)).toBe(false);
    expect(majoriteAtteinte(5, -1, 0.75)).toBe(false);
  });
});

describe("etapeSuivante", () => {
  it("donne l'étape qui suit, ou rien après la dernière", () => {
    expect(etapeSuivante(steps, "tr.vol")?.id).toBe("tr.eng");
    expect(etapeSuivante(steps, "tr.ani")).toBeUndefined();
  });
});

describe("decisionPossible", () => {
  const engage = steps.find((s) => s.id === "tr.eng")!;
  const animateur = steps.find((s) => s.id === "tr.ani")!;

  it("permet de reconnaître une étape sans vote", () => {
    expect(decisionPossible(engage, { decision: "reconnue" })).toEqual({ ok: true });
  });

  it("permet toujours d'ajourner", () => {
    expect(decisionPossible(animateur, { decision: "ajournee" })).toEqual({ ok: true });
  });

  it("pour Animateur, exige tous les membres présents, l'avis des parents et les 3/4 des voix", () => {
    const vote = { presents: 8, voixPour: 6, tousPresents: true, parentsConsultes: true };
    expect(decisionPossible(animateur, { decision: "reconnue", ...vote })).toEqual({ ok: true });
    expect(decisionPossible(animateur, { decision: "reconnue", ...vote, voixPour: 5 }).ok).toBe(false);
    expect(decisionPossible(animateur, { decision: "reconnue", ...vote, tousPresents: false }).ok).toBe(false);
    expect(decisionPossible(animateur, { decision: "reconnue", ...vote, parentsConsultes: false }).ok).toBe(false);
  });
});

describe("historique", () => {
  it("donne les décisions d'un jeune, de la plus ancienne à la plus récente", () => {
    const list = [
      recon({ id: "b", etapeId: "tr.eng", date: "2026-09-01" }),
      recon({ id: "x", jeuneId: "moussa" }),
      recon({ id: "a", etapeId: "tr.vol", date: "2026-03-10" }),
    ];
    expect(historique(list, "awa").map((r) => r.id)).toEqual(["a", "b"]);
  });
});
