import { describe, expect, it } from "vitest";
import { BASE_STEPS, effectiveSteps } from "../effective";
import { BRANCHES } from "../referentiels";
import type { Jeune, Validation } from "../mock";
import type { Compte } from "../admin";
import type { Reconnaissance } from "../courHonneur";
import { ajournes, cadresInactifs, decisionsRecentes, estActif, jeunesARelancer, parEtape, pretsAPresenter, sansConsentement } from "../suivi";

const NOW = new Date(2026, 9, 31, 12);
const steps = effectiveSteps(BASE_STEPS, {});

const jeune = (id: string, patch: Partial<Jeune> = {}): Jeune => ({
  id,
  prenom: id,
  nom: "Test",
  dateNaissance: null,
  dateEntree: "2026-09-01",
  branche: "troupe",
  etapeId: "tr.vol",
  choix: [],
  specs: [],
  consentementLe: "2025-09-20",
  statut: "actif",
  ...patch,
});

let n = 0;
const val = (jeuneId: string, preuveId: string, date: string, patch: Partial<Validation> = {}): Validation => ({
  id: `v${++n}`,
  jeuneId,
  etapeId: "tr.vol",
  domaineId: "",
  preuveId,
  date,
  validePar: "Cdt. I. Seck",
  pending: false,
  annuleeLe: null,
  updatedAt: `${date}T10:00:00.000Z`,
  ...patch,
});

const recon = (jeuneId: string, etapeId: string, date: string, decision: Reconnaissance["decision"]): Reconnaissance => ({
  id: `r${++n}`,
  jeuneId,
  etapeId,
  date,
  decision,
  observations: "",
  ct: "Cdt. Ibrahima Seck",
  pending: false,
});

const compte = (id: string, patch: Partial<Compte> = {}): Compte => ({
  id,
  nom: id,
  identifiant: id,
  role: "cadre",
  actif: true,
  unites: ["troupe"],
  enfants: [],
  deuxFA: false,
  derniereConnexion: "2026-10-30",
  ...patch,
});

/** Toutes les preuves obligatoires de Volontaire, validées pour ce jeune. */
const volontaireComplet = (jeuneId: string): Validation[] =>
  BRANCHES.troupe.steps[0].domaines.filter((d) => d.obligatoire).flatMap((d) => d.preuves.map((p) => val(jeuneId, p.id, "2026-10-20")));

describe("estActif et sansConsentement", () => {
  it("une fiche n'est active qu'avec le consentement des parents", () => {
    const list = [jeune("a"), jeune("b", { consentementLe: null }), jeune("c", { statut: "sorti" })];
    expect(list.filter(estActif).map((j) => j.id)).toEqual(["a"]);
    expect(sansConsentement(list).map((j) => j.id)).toEqual(["b"]);
  });
});

describe("jeunesARelancer", () => {
  it("liste les jeunes sans validation depuis le seuil, les plus anciens d'abord", () => {
    const list = [jeune("recent"), jeune("vieux"), jeune("jamais")];
    const vals = [val("recent", "p1", "2026-10-25"), val("vieux", "p1", "2026-09-01")];
    const out = jeunesARelancer(list, vals, 30, NOW);
    expect(out.map((x) => x.j.id)).toEqual(["jamais", "vieux"]);
    expect(out[0].jours).toBeNull();
    expect(out[1].jours).toBe(60);
  });

  it("ignore une validation annulée et les fiches inactives", () => {
    const list = [jeune("a"), jeune("b", { consentementLe: null })];
    const vals = [val("a", "p1", "2026-10-25", { annuleeLe: "2026-10-26" })];
    expect(jeunesARelancer(list, vals, 30, NOW).map((x) => x.j.id)).toEqual(["a"]);
  });
});

describe("cadresInactifs", () => {
  it("retient les cadres actifs sans connexion depuis le seuil ou jamais connectés", () => {
    const comptes = [
      compte("actif", { derniereConnexion: "2026-10-28" }),
      compte("ancien", { derniereConnexion: "2026-10-01" }),
      compte("jamais", { derniereConnexion: null }),
      compte("desactive", { actif: false, derniereConnexion: null }),
      compte("parent", { role: "parent", derniereConnexion: null }),
    ];
    const out = cadresInactifs(comptes, 21, NOW);
    expect(out.map((x) => x.compte.id)).toEqual(["jamais", "ancien"]);
    expect(out[1].jours).toBe(30);
  });
});

describe("parEtape", () => {
  it("compte les jeunes actifs d'une branche à chaque étape", () => {
    const list = [jeune("a"), jeune("b", { etapeId: "tr.eng" }), jeune("c", { etapeId: "tr.eng" }), jeune("d", { branche: "meute", etapeId: "me.pt" })];
    expect(parEtape(list, steps, "troupe")).toEqual([1, 2, 0, 0]);
    expect(parEtape(list, steps, "meute")[0]).toBe(1);
  });
});

describe("pretsAPresenter", () => {
  it("retient les jeunes dont l'étape en cours est complète", () => {
    const list = [jeune("pret"), jeune("encours")];
    const vals = [...volontaireComplet("pret"), val("encours", "tr.vol.esprit.1", "2026-10-20")];
    expect(pretsAPresenter(list, steps, vals).map((x) => x.j.id)).toEqual(["pret"]);
  });

  it("n'y remet pas un jeune ajourné pour cette étape", () => {
    const list = [jeune("pret")];
    const vals = volontaireComplet("pret");
    const recons = [recon("pret", "tr.vol", "2026-10-10", "ajournee")];
    expect(pretsAPresenter(list, steps, vals, recons)).toEqual([]);
  });
});

describe("ajournes", () => {
  it("liste les jeunes dont la dernière décision sur l'étape en cours est un ajournement", () => {
    const list = [jeune("a"), jeune("b"), jeune("c", { etapeId: "tr.eng" })];
    const recons = [
      recon("a", "tr.vol", "2026-09-10", "ajournee"),
      recon("b", "tr.vol", "2026-09-10", "ajournee"),
      recon("b", "tr.vol", "2026-10-10", "reconnue"),
      // Ajourné à une étape qu'il a depuis franchie.
      recon("c", "tr.vol", "2026-05-10", "ajournee"),
    ];
    const out = ajournes(list, recons);
    expect(out.map((x) => x.j.id)).toEqual(["a"]);
    expect(out[0].le).toBe("2026-09-10");
  });
});

describe("decisionsRecentes", () => {
  it("renvoie les dernières décisions, les plus récentes d'abord", () => {
    const recons = [recon("a", "tr.vol", "2026-09-10", "reconnue"), recon("b", "tr.vol", "2026-10-10", "ajournee"), recon("c", "tr.vol", "2026-08-10", "reconnue")];
    expect(decisionsRecentes(recons, 2).map((r) => r.jeuneId)).toEqual(["b", "a"]);
  });
});
