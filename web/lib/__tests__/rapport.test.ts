import { describe, expect, it } from "vitest";
import { BASE_STEPS, effectiveSteps } from "../effective";
import type { Jeune, Validation } from "../mock";
import type { Reconnaissance } from "../courHonneur";
import { anneeScoute, bilanJeunes, etapeALaDate, evolution, periodes, synthese } from "../rapport";

const steps = effectiveSteps(BASE_STEPS, {});
const A = anneeScoute(new Date(2026, 9, 31));

const jeune = (id: string, patch: Partial<Jeune> = {}): Jeune => ({
  id,
  prenom: id,
  nom: "Test",
  dateNaissance: null,
  dateEntree: "2025-09-15",
  branche: "troupe",
  etapeId: "tr.eng",
  choix: [],
  specs: [],
  consentementLe: "2025-09-20",
  statut: "actif",
  ...patch,
});

let n = 0;
const val = (jeuneId: string, date: string, patch: Partial<Validation> = {}): Validation => ({
  id: `v${++n}`,
  jeuneId,
  etapeId: "tr.eng",
  domaineId: "",
  preuveId: `p${n}`,
  date,
  validePar: "Cdt. I. Seck",
  pending: false,
  annuleeLe: null,
  updatedAt: `${date}T10:00:00.000Z`,
  ...patch,
});

const recon = (jeuneId: string, etapeId: string, date: string, decision: Reconnaissance["decision"] = "reconnue"): Reconnaissance => ({
  id: `r${++n}`,
  jeuneId,
  etapeId,
  date,
  decision,
  observations: "",
  ct: "Cdt. Ibrahima Seck",
  pending: false,
});

describe("anneeScoute", () => {
  it("va du 1er septembre au 31 août", () => {
    expect(A).toEqual({ label: "2026-2027", debut: "2026-09-01", fin: "2027-08-31" });
    expect(anneeScoute(new Date(2027, 1, 10)).label).toBe("2026-2027");
    expect(anneeScoute(new Date(2026, 7, 31)).label).toBe("2025-2026");
  });
});

describe("periodes", () => {
  it("découpe l'année en trimestres scouts, jusqu'à aujourd'hui", () => {
    expect(periodes(A, "trimestre", "2026-10-31")).toEqual([{ label: "1er trimestre (sept.–nov.)", debut: "2026-09-01", fin: "2026-11-30" }]);
    const all = periodes(A, "trimestre", "2027-08-31");
    expect(all.map((p) => [p.debut, p.fin])).toEqual([
      ["2026-09-01", "2026-11-30"],
      ["2026-12-01", "2027-02-28"],
      ["2027-03-01", "2027-05-31"],
      ["2027-06-01", "2027-08-31"],
    ]);
  });

  it("découpe en semaines de sept jours depuis la rentrée", () => {
    expect(periodes(A, "semaine", "2026-09-20").map((p) => [p.label, p.debut, p.fin])).toEqual([
      ["Semaine 1", "2026-09-01", "2026-09-07"],
      ["Semaine 2", "2026-09-08", "2026-09-14"],
      ["Semaine 3", "2026-09-15", "2026-09-21"],
    ]);
    const year = periodes(A, "semaine", "2027-08-31");
    expect(year).toHaveLength(53);
    expect(year.at(-1)).toMatchObject({ debut: "2027-08-31", fin: "2027-08-31" });
  });

  it("donne une seule période pour l'année, et rien avant la rentrée", () => {
    expect(periodes(A, "annee", "2026-10-31")).toEqual([{ label: "Année 2026-2027", debut: "2026-09-01", fin: "2027-08-31" }]);
    expect(periodes(A, "trimestre", "2026-08-15")).toEqual([]);
  });
});

describe("etapeALaDate", () => {
  it("retrouve l'étape d'un jeune à une date grâce aux étapes reconnues depuis", () => {
    const j = jeune("a", { etapeId: "tr.tec" });
    const recons = [recon("a", "tr.vol", "2026-09-20"), recon("a", "tr.eng", "2027-01-10"), recon("a", "tr.eng", "2026-12-01", "ajournee")];
    expect(etapeALaDate(j, "2026-09-01", recons)).toBe("tr.vol");
    expect(etapeALaDate(j, "2026-09-20", recons)).toBe("tr.eng");
    expect(etapeALaDate(j, "2026-12-31", recons)).toBe("tr.eng");
    expect(etapeALaDate(j, "2027-02-01", recons)).toBe("tr.tec");
  });
});

describe("evolution", () => {
  it("compte, par période et par unité, effectif, validations, jeunes qui progressent, décisions et étapes", () => {
    const jeunes = [jeune("a"), jeune("b"), jeune("nouveau", { dateEntree: "2026-12-05" }), jeune("sans", { consentementLe: null }), jeune("louveteau", { branche: "meute", etapeId: "me.pt" })];
    const vals = [
      val("a", "2026-09-10"),
      val("a", "2026-10-02"),
      val("b", "2026-11-30"),
      val("a", "2026-10-03", { annuleeLe: "2026-10-04" }),
      val("nouveau", "2026-12-10"),
      val("louveteau", "2026-09-12", { etapeId: "me.pt" }),
    ];
    const recons = [recon("a", "tr.vol", "2026-10-15"), recon("b", "tr.eng", "2026-11-20", "ajournee")];
    const ps = periodes(A, "trimestre", "2027-01-15");
    const rows = evolution({ jeunes, vals, recons, steps }, ps, ["troupe", "meute"]);

    const t1 = rows.find((r) => r.periode.debut === "2026-09-01" && r.branche === "troupe")!;
    expect(t1).toMatchObject({ effectif: 2, validations: 3, jeunesProgressant: 2, reconnues: 1, ajournees: 1 });
    expect(t1.parEtape).toEqual([0, 2, 0, 0]);

    const t2 = rows.find((r) => r.periode.debut === "2026-12-01" && r.branche === "troupe")!;
    expect(t2).toMatchObject({ effectif: 3, validations: 1, jeunesProgressant: 1, reconnues: 0 });

    const meute = rows.find((r) => r.periode.debut === "2026-09-01" && r.branche === "meute")!;
    expect(meute).toMatchObject({ effectif: 1, validations: 1 });
    expect(meute.parEtape[0]).toBe(1);
  });
});

describe("synthese et bilanJeunes", () => {
  const jeunes = [jeune("a"), jeune("nouveau", { dateEntree: "2026-12-05", etapeId: "tr.vol" })];
  const vals = [val("a", "2026-09-10"), val("a", "2025-12-01"), val("nouveau", "2026-12-10")];
  const recons = [recon("a", "tr.vol", "2026-10-15")];
  const data = { jeunes, vals, recons, steps };

  it("résume l'année de chaque unité", () => {
    expect(synthese(data, A, ["troupe"], "2027-01-15")).toEqual([
      { branche: "troupe", effectifDebut: 1, effectifFin: 2, validations: 2, jeunesProgressant: 2, reconnues: 1, ajournees: 0 },
    ]);
  });

  it("donne pour chaque jeune l'étape à la rentrée et l'étape actuelle", () => {
    const rows = bilanJeunes(data, A, "2027-01-15");
    expect(rows.map((r) => [r.j.id, r.etapeDebut, r.etapeFin, r.validations, r.reconnues])).toEqual([
      ["a", "tr.vol", "tr.eng", 1, 1],
      ["nouveau", "tr.vol", "tr.vol", 1, 0],
    ]);
  });
});

describe("feuillesRapport", () => {
  it("donne une synthèse, une feuille par unité ouverte et la liste des jeunes", async () => {
    const { construireRapport, feuillesRapport } = await import("../rapportExport");
    const data = { jeunes: [jeune("a"), jeune("l", { branche: "meute", etapeId: "me.pt" })], vals: [val("a", "2026-09-10")], recons: [], steps };
    const r = construireRapport(data, A, "trimestre", "2026-10-31");
    const { GROUPE_DEMO, nomsUnites } = await import("../groupe");
    const feuilles = feuillesRapport(r, steps, nomsUnites(GROUPE_DEMO));
    expect(r.branches).toEqual(["meute", "troupe"]);
    expect(feuilles.map((f) => f.nom)).toEqual(["Synthèse", "Meute Troisième Dakar", "Troupe Troisième Dakar", "Jeunes"]);
    const troupe = feuilles[2].lignes;
    expect(troupe[0].slice(-4)).toEqual(["Volontaire", "Engagé", "Technicien", "Animateur"]);
    expect(troupe[1].slice(3, 5)).toEqual([1, 1]);
    expect(feuilles[3].lignes).toHaveLength(3);
  });
});

describe("construireRapport", () => {
  it("range les jeunes par unité puis par nom", async () => {
    const { construireRapport } = await import("../rapportExport");
    const data = {
      jeunes: [jeune("t2", { nom: "Sow" }), jeune("m1", { branche: "meute", etapeId: "me.pt", nom: "Ba" }), jeune("t1", { nom: "Ba" })],
      vals: [],
      recons: [],
      steps,
    };
    expect(construireRapport(data, A, "annee", "2026-10-31").jeunes.map((x) => x.j.id)).toEqual(["m1", "t1", "t2"]);
  });
});
