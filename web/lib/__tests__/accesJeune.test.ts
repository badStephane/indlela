import { describe, expect, it } from "vitest";
import { branchesDuCompte, peutVoirJeune } from "../accesJeune";
import type { Compte, Unite } from "../admin";
import type { Jeune } from "../mock";

const unitesServeur: Unite[] = [
  { id: "7f3c-troupe", nom: "Troupe Troisième Dakar", branche: "troupe", annee: "2026-2027", responsable: null },
  { id: "9a1d-meute", nom: "Meute Troisième Dakar", branche: "meute", annee: "2026-2027", responsable: null },
];

const compte = (patch: Partial<Compte>): Compte => ({
  id: "u1",
  nom: "Marie Faye",
  identifiant: "marie.faye",
  roles: ["cadre"],
  actif: true,
  unites: [],
  enfants: [],
  deuxFA: false,
  derniereConnexion: null,
  ...patch,
});

const jeune = (patch: Partial<Jeune> = {}): Jeune => ({
  id: "j1",
  prenom: "Cheikh",
  nom: "Fall",
  dateNaissance: null,
  dateEntree: "2026-09-01",
  branche: "troupe",
  etapeId: "e1",
  choix: [],
  specs: [],
  consentementLe: "2026-09-01",
  statut: "actif",
  ...patch,
});

describe("branchesDuCompte", () => {
  it("traduit les unités du serveur (UUID) en branches", () => {
    expect(branchesDuCompte(compte({ unites: ["7f3c-troupe"] }), unitesServeur)).toEqual(["troupe"]);
  });

  it("garde les unités de démo, dont l'identifiant est déjà la branche", () => {
    expect(branchesDuCompte(compte({ unites: ["meute"] }), [])).toEqual(["meute"]);
  });

  it("ignore une unité inconnue", () => {
    expect(branchesDuCompte(compte({ unites: ["unite-supprimee"] }), unitesServeur)).toEqual([]);
  });
});

describe("peutVoirJeune", () => {
  it("ouvre la fiche au cadre affecté à l'unité du jeune par le serveur", () => {
    expect(peutVoirJeune("cadre", jeune(), compte({ unites: ["7f3c-troupe"] }), unitesServeur)).toBe(true);
  });

  it("refuse la fiche au cadre d'une autre unité", () => {
    expect(peutVoirJeune("cadre", jeune(), compte({ unites: ["9a1d-meute"] }), unitesServeur)).toBe(false);
  });

  it("refuse une fiche sans consentement des parents", () => {
    expect(peutVoirJeune("groupe", jeune({ consentementLe: null }), compte({ roles: ["groupe"] }), unitesServeur)).toBe(false);
  });

  it("refuse tout à un compte désactivé", () => {
    expect(peutVoirJeune("groupe", jeune(), compte({ roles: ["groupe"], actif: false }), unitesServeur)).toBe(false);
  });
});
