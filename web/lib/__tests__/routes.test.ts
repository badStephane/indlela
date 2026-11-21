import { describe, expect, it } from "vitest";
import { depuisAncienneAdresse } from "../routes";

describe("depuisAncienneAdresse", () => {
  it("traduit les anciennes adresses des écrans d'un jeune", () => {
    expect(depuisAncienneAdresse("/jeunes/awa")).toBe("/jeune?id=awa");
    expect(depuisAncienneAdresse("/jeunes/awa/carnet")).toBe("/jeune/carnet?id=awa");
    expect(depuisAncienneAdresse("/jeunes/awa/valider/")).toBe("/jeune/valider?id=awa");
  });

  it("laisse les autres adresses à la page introuvable", () => {
    expect(depuisAncienneAdresse("/introuvable")).toBeNull();
    expect(depuisAncienneAdresse("/jeunes/awa/autre")).toBeNull();
    expect(depuisAncienneAdresse("/jeunes")).toBeNull();
  });
});
