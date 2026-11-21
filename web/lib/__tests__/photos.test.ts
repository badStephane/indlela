import { describe, expect, it } from "vitest";
import { cheminPhoto, COTE_MAX, dimensionsReduites, MAX_PHOTOS, planPhotos, type PhotoPreuve } from "../photos";

const photo = (id: string, patch: Partial<PhotoPreuve> = {}): PhotoPreuve => ({
  id,
  validationId: "v1",
  jeuneId: "j1",
  taille: 120000,
  envoyee: false,
  ...patch,
});

describe("dimensionsReduites", () => {
  it("ramène le plus grand côté à 1280 px en gardant les proportions", () => {
    expect(dimensionsReduites(4000, 3000)).toEqual({ largeur: COTE_MAX, hauteur: 960 });
    expect(dimensionsReduites(3000, 4000)).toEqual({ largeur: 960, hauteur: COTE_MAX });
  });

  it("n'agrandit jamais une petite photo", () => {
    expect(dimensionsReduites(800, 600)).toEqual({ largeur: 800, hauteur: 600 });
  });

  it("donne toujours au moins un pixel", () => {
    expect(dimensionsReduites(10000, 3)).toEqual({ largeur: COTE_MAX, hauteur: 1 });
  });
});

describe("cheminPhoto", () => {
  it("suit le chemin fixé par la base : <jeune>/<photo>.jpg", () => {
    expect(cheminPhoto("j1", "p1")).toBe("j1/p1.jpg");
  });
});

describe("planPhotos", () => {
  const valsServeur = { v1: "active", v2: "annulee" };
  const valsLocales = new Set(["v1", "v2", "v3"]);

  it("envoie une photo dès que sa validation est connue du serveur", () => {
    const { aEnvoyer } = planPhotos([photo("p1"), photo("p2", { validationId: "v3" })], valsServeur, valsLocales);
    expect(aEnvoyer.map((p) => p.id)).toEqual(["p1"]);
  });

  it("garde en attente la photo d'une validation pas encore envoyée", () => {
    const { aEnvoyer, orphelines } = planPhotos([photo("p2", { validationId: "v3" })], valsServeur, valsLocales);
    expect(aEnvoyer).toEqual([]);
    expect(orphelines).toEqual([]);
  });

  it("abandonne la photo d'une validation retirée ou annulée avant l'envoi", () => {
    const { orphelines } = planPhotos([photo("p3", { validationId: "v-retiree" }), photo("p4", { validationId: "v2" })], valsServeur, valsLocales);
    expect(orphelines.map((p) => p.id)).toEqual(["p3", "p4"]);
  });

  it("ne renvoie pas une photo déjà envoyée", () => {
    const { aEnvoyer, orphelines } = planPhotos([photo("p1", { envoyee: true })], valsServeur, valsLocales);
    expect(aEnvoyer).toEqual([]);
    expect(orphelines).toEqual([]);
  });

  it("limite à trois photos par preuve", () => {
    expect(MAX_PHOTOS).toBe(3);
  });
});
