import { describe, expect, it } from "vitest";
import type { Unite } from "../admin";
import type { UnitAdapt } from "../effective";
import type { Etape } from "../referentiels";
import type { RefState } from "../store";
import { apresEnvoiRef, fusionnerRef, lireEtapes, REF_SERVEUR_VIDE, refAEnvoyer, type EtatRef, type LigneReferentiel } from "../sync/referentiels";

const TROUPE = "7f3c0000-0000-4000-8000-000000000001";
const unites: Unite[] = [{ id: TROUPE, nom: "Troupe", branche: "troupe", annee: "2026-2027", responsable: null }];
const etapes = (nom: string): Etape[] => [{ id: "t.vol", name: nom, val: "Cour d'honneur", domaines: [] }];
const adapt: UnitAdapt = { retirees: ["t.vol.nature"], ajoutees: { "t.vol.esprit": [{ id: "u.1", label: "Chant de la troupe" }] } };
const ref = (patch: Partial<RefState> = {}): RefState => ({ published: {}, draft: {}, routeCreated: false, ...patch });
const etat = (patch: Partial<EtatRef> = {}): EtatRef => ({ ref: ref(), adapts: {}, refServeur: REF_SERVEUR_VIDE, ...patch });
let n = 0;
const nouvelId = () => `id-${++n}`;

const ligne = (patch: Partial<LigneReferentiel>): LigneReferentiel => ({ id: "r1", branche: "troupe", version: 3, etapes: etapes("Volontaire v3"), publie_le: "2026-10-01T10:00:00Z", ...patch });

describe("lireEtapes", () => {
  it("accepte un référentiel au format de l'application", () => {
    expect(lireEtapes(etapes("Volontaire"))).toHaveLength(1);
  });

  it("refuse un contenu illisible plutôt que d'afficher un carnet cassé", () => {
    expect(lireEtapes({ id: "x" })).toBeNull();
    expect(lireEtapes([{ id: "t.vol" }])).toBeNull();
  });
});

describe("refAEnvoyer", () => {
  it("un brouillon nouveau part avec la version suivante du carnet", () => {
    const a = refAEnvoyer(etat({ ref: ref({ draft: { troupe: etapes("Brouillon") } }) }), unites, nouvelId);
    expect(a.brouillons).toMatchObject([{ branche: "troupe", version: 3, steps: etapes("Brouillon") }]);
  });

  it("un brouillon déjà envoyé et inchangé ne repart pas", () => {
    const e = etat({ ref: ref({ draft: { troupe: etapes("Brouillon") } }) });
    const a = refAEnvoyer(e, unites, nouvelId);
    const apres = { ...e, refServeur: apresEnvoiRef(e.refServeur, a) };
    expect(refAEnvoyer(apres, unites, nouvelId).brouillons).toEqual([]);
  });

  it("une publication locale part en reprenant la ligne du brouillon envoyé", () => {
    const e = etat({
      ref: ref({ published: { troupe: { version: 3, steps: etapes("Publiée") } } }),
      refServeur: { ...REF_SERVEUR_VIDE, brouillons: { troupe: { id: "brouillon-1", sig: "x" } } },
    });
    const a = refAEnvoyer(e, unites, nouvelId);
    expect(a.publications).toMatchObject([{ branche: "troupe", version: 3, id: "brouillon-1" }]);
    expect(a.abandons).toEqual([]);
  });

  it("un brouillon abandonné sur le téléphone est retiré du serveur", () => {
    const e = etat({ refServeur: { ...REF_SERVEUR_VIDE, brouillons: { troupe: { id: "brouillon-1", sig: "x" } } } });
    expect(refAEnvoyer(e, unites, nouvelId).abandons).toEqual([{ branche: "troupe", id: "brouillon-1" }]);
  });

  it("une adaptation modifiée part pour l'unité de la branche", () => {
    const a = refAEnvoyer(etat({ adapts: { troupe: adapt } }), unites, nouvelId);
    expect(a.adapts).toEqual([{ branche: "troupe", uniteId: TROUPE, adapt }]);
  });
});

describe("fusionnerRef", () => {
  it("prend la dernière version publiée et le brouillon du serveur", () => {
    const lignes = [ligne({ id: "r2", version: 2 }), ligne({}), ligne({ id: "r4", version: 4, etapes: etapes("Brouillon v4"), publie_le: null })];
    const r = fusionnerRef(etat(), { referentiels: lignes, adaptations: [] }, unites);
    expect(r.ref.published.troupe).toEqual({ version: 3, steps: etapes("Volontaire v3") });
    expect(r.ref.draft.troupe).toEqual(etapes("Brouillon v4"));
    expect(refAEnvoyer(r, unites, nouvelId)).toEqual({ publications: [], brouillons: [], abandons: [], adapts: [] });
  });

  it("garde un brouillon local modifié et pas encore envoyé", () => {
    const r = fusionnerRef(etat({ ref: ref({ draft: { troupe: etapes("Mon brouillon") } }) }), { referentiels: [ligne({ id: "r4", version: 4, publie_le: null })], adaptations: [] }, unites);
    expect(r.ref.draft.troupe).toEqual(etapes("Mon brouillon"));
    // Le brouillon du serveur garde sa ligne : l'envoi la remplacera au lieu d'en créer une seconde.
    expect(refAEnvoyer(r, unites, nouvelId).brouillons).toMatchObject([{ id: "r4" }]);
  });

  it("garde une publication locale pas encore envoyée", () => {
    const local = etat({ ref: ref({ published: { troupe: { version: 4, steps: etapes("Publiée localement") } } }) });
    const r = fusionnerRef(local, { referentiels: [ligne({})], adaptations: [] }, unites);
    expect(r.ref.published.troupe?.version).toBe(4);
  });

  it("lit l'adaptation de l'unité et la range sous sa branche", () => {
    const r = fusionnerRef(etat(), { referentiels: [], adaptations: [{ unite_id: TROUPE, retirees: adapt.retirees, ajoutees: adapt.ajoutees }] }, unites);
    expect(r.adapts.troupe).toEqual(adapt);
    expect(refAEnvoyer(r, unites, nouvelId).adapts).toEqual([]);
  });
});
