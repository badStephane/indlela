import { describe, expect, it } from "vitest";
import { BASE_STEPS, EMPTY_ADAPT, effectiveSteps, type RefSteps, type UnitAdapt } from "../effective";
import { updateDomaine, updatePreuve } from "../refEditor";
import { critStatus, progressOf } from "../progress";
import type { Jeune, Validation } from "../mock";

const jeune = (patch: Partial<Jeune> = {}): Jeune => ({
  id: "awa",
  prenom: "Awa",
  nom: "Ndiaye",
  dateNaissance: null,
  dateEntree: "2026-09-01",
  branche: "troupe",
  etapeId: "tr.eng",
  choix: [],
  specs: [],
  consentementLe: "2025-09-20",
  statut: "actif",
  ...patch,
});

let n = 0;
const val = (preuveId: string, patch: Partial<Validation> = {}): Validation => ({
  id: `v${++n}`,
  jeuneId: "awa",
  etapeId: "tr.eng",
  domaineId: preuveId.split(".").slice(0, 3).join("."),
  preuveId,
  date: "2026-10-20",
  validePar: "Cdt. I. Seck",
  pending: false,
  annuleeLe: null,
  updatedAt: "2026-10-20T10:00:00.000Z",
  ...patch,
});

const steps = (adapt: UnitAdapt = EMPTY_ADAPT, ref: RefSteps = BASE_STEPS) => effectiveSteps(ref, { troupe: adapt });
const domaineOf = (p: ReturnType<typeof progressOf>, id: string) => p.domaines.find((d) => d.domaine.id === id);

describe("progressOf · étapes à domaines", () => {
  it("ne compte pas un domaine au choix que le jeune n'a pas choisi", () => {
    const p = progressOf(jeune(), steps(), []);
    expect(domaineOf(p, "tr.eng.chretienne")).toBeUndefined();
    expect(p.choixPossibles.map((c) => c.id)).toContain("tr.eng.chretienne");
  });

  it("ajoute toutes les preuves d'un domaine choisi pour le jeune", () => {
    const base = progressOf(jeune(), steps(), []).total;
    const chosen = progressOf(jeune({ choix: ["tr.eng.chretienne"] }), steps(), []).total;
    expect(chosen - base).toBe(7);
  });

  it("n'exige que N preuves dans un domaine « N parmi M »", () => {
    const d = domaineOf(progressOf(jeune(), steps(), []), "tr.eng.travaux")!;
    expect(d.preuves).toHaveLength(10);
    expect(d.required).toBe(6);
  });

  it("déclare un domaine « N parmi M » complet dès N preuves réussies, sans dépasser N dans le total", () => {
    const six = [1, 2, 3, 4, 5, 6, 7].map((i) => val(`tr.eng.travaux.${i}`));
    const p = progressOf(jeune(), steps(), six);
    expect(domaineOf(p, "tr.eng.travaux")!.complete).toBe(true);
    expect(p.done).toBe(6);
  });

  it("déclare l'étape complète quand tous les domaines du programme le sont", () => {
    const all = steps().troupe.find((s) => s.id === "tr.eng")!.domaines.filter((d) => d.obligatoire).flatMap((d) => d.preuves.map((x) => val(x.id)));
    const p = progressOf(jeune(), steps(), all);
    expect(p.complete).toBe(true);
    expect(p.done).toBe(p.total);
  });

  it("compte un domaine au choix dès qu'une de ses preuves est validée", () => {
    const p = progressOf(jeune(), steps(), [val("tr.eng.chretienne.1")]);
    expect(domaineOf(p, "tr.eng.chretienne")?.validated).toBe(1);
  });

  it("ne compte pas une validation annulée", () => {
    const p = progressOf(jeune(), steps(), [val("tr.eng.sport.1", { annuleeLe: "2026-10-25" })]);
    expect(p.done).toBe(0);
  });

  it("ignore un domaine retiré par l'unité, même choisi", () => {
    const p = progressOf(jeune({ choix: ["tr.eng.chretienne"] }), steps({ retirees: ["tr.eng.chretienne"], ajoutees: {} }), []);
    expect(domaineOf(p, "tr.eng.chretienne")).toBeUndefined();
    expect(p.choixPossibles.map((c) => c.id)).not.toContain("tr.eng.chretienne");
  });

  it("ajoute au total une preuve propre à l'unité dans un domaine obligatoire", () => {
    const base = progressOf(jeune(), steps(), []).total;
    const adapt: UnitAdapt = { retirees: [], ajoutees: { "tr.eng.sport": [{ id: "u1", label: "Tour du lac" }] } };
    expect(progressOf(jeune(), steps(adapt), []).total).toBe(base + 1);
  });

  it("place le jeune à la première étape si son étape n'existe plus", () => {
    const p = progressOf(jeune({ etapeId: "inconnue" }), steps(), []);
    expect(p.index).toBe(0);
    expect(p.step?.id).toBe("tr.vol");
  });
});

describe("progressOf · éléments archivés par l'admin", () => {
  const archived = (fn: (t: RefSteps["troupe"]) => RefSteps["troupe"]) => steps(EMPTY_ADAPT, { ...BASE_STEPS, troupe: fn(BASE_STEPS.troupe) });

  it("retire du programme une preuve archivée non validée", () => {
    const base = progressOf(jeune(), steps(), []).total;
    expect(progressOf(jeune(), archived((t) => updatePreuve(t, "tr.eng.sport.5", { archive: true })), []).total).toBe(base - 1);
  });

  it("garde dans l'historique une preuve archivée déjà validée, sans qu'elle remplace une preuve active", () => {
    const ref = archived((t) => updatePreuve(t, "tr.eng.sport.5", { archive: true }));
    const vals = ["tr.eng.sport.1", "tr.eng.sport.2", "tr.eng.sport.3", "tr.eng.sport.5"].map((id) => val(id));
    const sport = domaineOf(progressOf(jeune(), ref, vals), "tr.eng.sport")!;
    expect(sport.preuves.map((x) => x.id)).toContain("tr.eng.sport.5");
    expect(sport.validated).toBe(3);
    expect(sport.complete).toBe(false);
  });

  it("retire du programme et des choix un domaine archivé", () => {
    const p = progressOf(jeune({ choix: ["tr.eng.chretienne"] }), archived((t) => updateDomaine(t, "tr.eng.chretienne", { archive: true })), []);
    expect(domaineOf(p, "tr.eng.chretienne")).toBeUndefined();
    expect(p.choixPossibles.map((c) => c.id)).not.toContain("tr.eng.chretienne");
  });
});

describe("progressOf · Technicien (3 brevets sur 2 séries)", () => {
  const tech = (choix: string[] = []) => jeune({ etapeId: "tr.tec", choix });
  const brevet = (id: string, serie: string) => val(id, { etapeId: "tr.tec", domaineId: serie });

  it("propose tous les brevets, rangés par série", () => {
    const p = progressOf(tech(), steps(), []);
    const athlete = p.choixPossibles.find((c) => c.id === "br.athlete");
    expect(athlete?.groupe).toBe("Série Sport");
    expect(p.total).toBe(3);
  });

  it("met au programme les brevets choisis par le jeune", () => {
    const p = progressOf(tech(["br.campeur", "br.secourisme"]), steps(), []);
    expect(p.domaines.flatMap((d) => d.preuves.map((x) => x.id)).sort()).toEqual(["br.campeur", "br.secourisme"]);
  });

  it("n'est pas complet avec 3 brevets d'une seule série", () => {
    const vals = [brevet("br.cuisinier", "tr.tec.pionnier"), brevet("br.campeur", "tr.tec.pionnier"), brevet("br.topographe", "tr.tec.pionnier")];
    const p = progressOf(tech(), steps(), vals);
    expect(p.brevets).toEqual({ obtenus: 3, series: 1 });
    expect(p.complete).toBe(false);
  });

  it("est complet avec 3 brevets sur 2 séries", () => {
    const vals = [brevet("br.cuisinier", "tr.tec.pionnier"), brevet("br.campeur", "tr.tec.pionnier"), brevet("br.secourisme", "tr.tec.contact")];
    const p = progressOf(tech(), steps(), vals);
    expect(p.done).toBe(3);
    expect(p.complete).toBe(true);
  });
});

describe("critStatus", () => {
  it("donne la dernière validation active, ou l'annulation, ou rien", () => {
    expect(critStatus([], "awa", "tr.eng.sport.1").st).toBe("todo");
    expect(critStatus([val("tr.eng.sport.1", { annuleeLe: "2026-10-25" })], "awa", "tr.eng.sport.1").st).toBe("cancelled");
    expect(critStatus([val("tr.eng.sport.1", { pending: true })], "awa", "tr.eng.sport.1").st).toBe("pending");
  });
});
