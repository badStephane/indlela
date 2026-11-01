import { describe, expect, it } from "vitest";
import type { Unite } from "../admin";
import type { Reconnaissance } from "../courHonneur";
import type { Jeune, Validation } from "../mock";
import { depuisLigneCour, depuisLigneJeune, depuisLigneValidation, uniteDeBranche, versLigneCour, versLigneJeune, versLigneValidation } from "../sync/lignes";
import { aEnvoyer, apresEnvoi, fusionner, marquerEnvoye, nbAEnvoyer, SYNCHRO_VIDE, type Synchro } from "../sync/plan";

const ID_J = "4b1f0c2e-0000-4000-8000-000000000001";
const ID_J2 = "4b1f0c2e-0000-4000-8000-000000000002";
const ID_V = "4b1f0c2e-0000-4000-8000-0000000000a1";
const ID_R = "4b1f0c2e-0000-4000-8000-0000000000c1";
const TROUPE = "7f3c0000-0000-4000-8000-000000000001";

const unites: Unite[] = [
  { id: "7f3c0000-0000-4000-8000-000000000009", nom: "Troupe 2025", branche: "troupe", annee: "2025-2026", responsable: null },
  { id: TROUPE, nom: "Troupe Troisième Dakar", branche: "troupe", annee: "2026-2027", responsable: null },
];

const jeune = (patch: Partial<Jeune> = {}): Jeune => ({
  id: ID_J,
  prenom: "Awa",
  nom: "Ndiaye",
  dateNaissance: "2013-04-02",
  dateEntree: "2026-09-15",
  branche: "troupe",
  etapeId: "t.vol",
  choix: [],
  specs: [],
  consentementLe: "2026-09-20",
  statut: "actif",
  ...patch,
});

const validation = (patch: Partial<Validation> = {}): Validation => ({
  id: ID_V,
  jeuneId: ID_J,
  etapeId: "t.vol",
  domaineId: "t.vol.esprit",
  preuveId: "t.vol.esprit.1",
  date: "2026-10-10",
  validePar: "Marie Faye",
  pending: true,
  annuleeLe: null,
  updatedAt: "2026-10-10T10:00:00Z",
  ...patch,
});

const cour = (patch: Partial<Reconnaissance> = {}): Reconnaissance => ({
  id: ID_R,
  jeuneId: ID_J,
  etapeId: "t.vol",
  date: "2026-11-01",
  decision: "reconnue",
  observations: "",
  ct: "Marie Faye",
  pending: true,
  ...patch,
});

describe("lignes", () => {
  it("range un jeune dans l'unité de sa branche la plus récente", () => {
    expect(uniteDeBranche(unites, "troupe")).toBe(TROUPE);
    expect(uniteDeBranche(unites, "meute")).toBeUndefined();
  });

  it("aller-retour d'une fiche de jeune", () => {
    const ligne = versLigneJeune(jeune(), "groupe-1", TROUPE);
    expect(ligne).toMatchObject({ id: ID_J, groupe_id: "groupe-1", unite_id: TROUPE, etape_id: "t.vol", consentement_le: "2026-09-20", importe: false });
    expect(depuisLigneJeune(ligne, unites)).toEqual({ ...jeune(), importe: false });
  });

  it("écarte une fiche du serveur dont l'unité est inconnue", () => {
    expect(depuisLigneJeune({ ...versLigneJeune(jeune(), "g", TROUPE), unite_id: "inconnue" }, unites)).toBeNull();
  });

  it("une validation envoyée laisse le serveur fixer le signataire", () => {
    const ligne = versLigneValidation(validation({ commentaire: "Camp de Toussaint" }));
    expect(ligne).not.toHaveProperty("valide_par");
    expect(ligne).toMatchObject({ id: ID_V, jeune_id: ID_J, preuve_id: "t.vol.esprit.1", commentaire: "Camp de Toussaint", valide_par_nom: "Marie Faye" });
  });

  it("lit une validation annulée du serveur", () => {
    const v = depuisLigneValidation({
      ...versLigneValidation(validation()),
      valide_par_nom: "Marie Faye",
      annulee_le: "2026-10-12T08:30:00+00:00",
      annulee_par: "Marie Faye",
      updated_at: "2026-10-12T08:30:00+00:00",
    });
    expect(v).toMatchObject({ id: ID_V, pending: false, annuleeLe: "2026-10-12", annuleePar: "Marie Faye" });
  });

  it("aller-retour d'une décision de cour d'honneur, vote compris", () => {
    const r = cour({ presents: 9, voixPour: 7 });
    expect(depuisLigneCour(versLigneCour(r))).toEqual({ ...r, pending: false });
  });
});

describe("aEnvoyer", () => {
  it("tout ce qui n'a jamais atteint le serveur part", () => {
    const a = aEnvoyer({ jeunes: [jeune()], vals: [validation()], recons: [cour()] }, SYNCHRO_VIDE);
    expect(a.jeunes.map((j) => j.id)).toEqual([ID_J]);
    expect(a.nouvelles.map((v) => v.id)).toEqual([ID_V]);
    expect(a.cours.map((r) => r.id)).toEqual([ID_R]);
    expect(nbAEnvoyer(a)).toBe(3);
  });

  it("rien ne part quand le téléphone est à jour", () => {
    const local = { jeunes: [jeune()], vals: [validation({ pending: false })], recons: [cour({ pending: false })] };
    const synchro = apresEnvoi(SYNCHRO_VIDE, aEnvoyer(local, SYNCHRO_VIDE));
    expect(nbAEnvoyer(aEnvoyer(local, synchro))).toBe(0);
  });

  it("une fiche modifiée après l'envoi repart, quel que soit l'écran qui l'a changée", () => {
    const synchro = apresEnvoi(SYNCHRO_VIDE, aEnvoyer({ jeunes: [jeune()], vals: [], recons: [] }, SYNCHRO_VIDE));
    const a = aEnvoyer({ jeunes: [jeune({ etapeId: "t.cerf" })], vals: [], recons: [] }, synchro);
    expect(a.jeunes.map((j) => j.etapeId)).toEqual(["t.cerf"]);
  });

  it("une validation envoyée puis annulée part comme annulation", () => {
    const synchro = apresEnvoi(SYNCHRO_VIDE, aEnvoyer({ jeunes: [], vals: [validation()], recons: [] }, SYNCHRO_VIDE));
    const a = aEnvoyer({ jeunes: [], vals: [validation({ annuleeLe: "2026-10-12" })], recons: [] }, synchro);
    expect(a.nouvelles).toEqual([]);
    expect(a.annulations.map((v) => v.id)).toEqual([ID_V]);
  });

  it("une validation annulée avant d'avoir été envoyée ne part pas", () => {
    const a = aEnvoyer({ jeunes: [], vals: [validation({ annuleeLe: "2026-10-12" })], recons: [] }, SYNCHRO_VIDE);
    expect(nbAEnvoyer(a)).toBe(0);
  });

  it("une fiche de démo (identifiant non UUID) ne part jamais", () => {
    expect(aEnvoyer({ jeunes: [jeune({ id: "moussa" })], vals: [], recons: [] }, SYNCHRO_VIDE).jeunes).toEqual([]);
  });
});

describe("fusionner", () => {
  const synchroDe = (jeunes: Jeune[], vals: Validation[] = [], recons: Reconnaissance[] = []): Synchro =>
    apresEnvoi(SYNCHRO_VIDE, aEnvoyer({ jeunes, vals, recons }, SYNCHRO_VIDE));

  it("prend ce que le serveur connaît, sans attente", () => {
    const serveur = { jeunes: [jeune()], vals: [validation({ pending: false })], recons: [] };
    const r = fusionner({ jeunes: [], vals: [], recons: [] }, serveur);
    expect(r.jeunes).toEqual([jeune()]);
    expect(r.vals[0].pending).toBe(false);
    expect(nbAEnvoyer(aEnvoyer(r, r.synchro))).toBe(0);
  });

  it("garde une saisie locale pas encore envoyée", () => {
    const local = { jeunes: [jeune({ id: ID_J2, prenom: "Moussa" })], vals: [validation()], recons: [cour()] };
    const r = fusionner(local, { jeunes: [], vals: [], recons: [] }, SYNCHRO_VIDE);
    expect(r.jeunes.map((j) => j.id)).toEqual([ID_J2]);
    expect(r.vals.map((v) => v.pending)).toEqual([true]);
    expect(r.recons.map((x) => x.pending)).toEqual([true]);
  });

  it("une modification locale en attente n'est pas écrasée par le serveur", () => {
    const avant = synchroDe([jeune()]);
    const local = { jeunes: [jeune({ etapeId: "t.cerf" })], vals: [], recons: [] };
    const r = fusionner(local, { jeunes: [jeune()], vals: [], recons: [] }, avant);
    expect(r.jeunes[0].etapeId).toBe("t.cerf");
    expect(aEnvoyer(r, r.synchro).jeunes).toHaveLength(1);
  });

  it("le serveur l'emporte sur une fiche locale déjà à jour", () => {
    const avant = synchroDe([jeune()]);
    const r = fusionner({ jeunes: [jeune()], vals: [], recons: [] }, { jeunes: [jeune({ etapeId: "t.cerf" })], vals: [], recons: [] }, avant);
    expect(r.jeunes[0].etapeId).toBe("t.cerf");
  });

  it("retire une fiche que le serveur ne montre plus (changement d'unité, droits retirés)", () => {
    const avant = synchroDe([jeune()]);
    const r = fusionner({ jeunes: [jeune()], vals: [], recons: [] }, { jeunes: [], vals: [], recons: [] }, avant);
    expect(r.jeunes).toEqual([]);
  });

  it("garde une annulation locale pas encore envoyée", () => {
    const avant = synchroDe([], [validation()]);
    const local = { jeunes: [], vals: [validation({ annuleeLe: "2026-10-12", pending: false })], recons: [] };
    const r = fusionner(local, { jeunes: [], vals: [validation({ pending: false })], recons: [] }, avant);
    expect(r.vals[0].annuleeLe).toBe("2026-10-12");
    expect(aEnvoyer(r, r.synchro).annulations).toHaveLength(1);
  });

  it("garde le lot d'une validation locale, pour le bouton Annuler", () => {
    const avant = synchroDe([], [validation()]);
    const r = fusionner({ jeunes: [], vals: [validation({ batch: "lot-1", pending: false })], recons: [] }, { jeunes: [], vals: [validation({ pending: false })], recons: [] }, avant);
    expect(r.vals[0].batch).toBe("lot-1");
  });
});

describe("marquerEnvoye", () => {
  it("une saisie reçue n'est plus en attente et ne repart pas", () => {
    const etat = { jeunes: [jeune()], vals: [validation()], recons: [cour()], synchro: SYNCHRO_VIDE };
    const r = marquerEnvoye(etat, aEnvoyer(etat, SYNCHRO_VIDE), [], "2026-11-02");
    expect(r.vals[0].pending).toBe(false);
    expect(r.recons[0].pending).toBe(false);
    expect(nbAEnvoyer(aEnvoyer(r, r.synchro))).toBe(0);
  });

  it("retire une validation refusée parce que la preuve est déjà validée ailleurs", () => {
    const etat = { jeunes: [], vals: [validation()], recons: [], synchro: SYNCHRO_VIDE };
    const r = marquerEnvoye(etat, { jeunes: [], nouvelles: [], annulations: [], cours: [] }, [ID_V], "2026-11-02");
    expect(r.vals).toEqual([]);
  });

  it("une validation retirée pendant son envoi revient annulée, et l'annulation part", () => {
    const envoye = { jeunes: [], nouvelles: [validation()], annulations: [], cours: [] };
    const r = marquerEnvoye({ jeunes: [], vals: [], recons: [], synchro: SYNCHRO_VIDE }, envoye, [], "2026-11-02");
    expect(r.vals).toMatchObject([{ id: ID_V, annuleeLe: "2026-11-02" }]);
    expect(aEnvoyer(r, r.synchro).annulations.map((v) => v.id)).toEqual([ID_V]);
  });
});
