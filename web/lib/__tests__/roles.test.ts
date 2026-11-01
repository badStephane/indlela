import { describe, expect, it } from "vitest";
import { basculerRole, espaceInitial, exigeDeuxFARoles, libelleRoles, lireRoles, normaliserRoles } from "../roles";

describe("lireRoles", () => {
  it("accepte un cumul de rôles d'encadrement", () => {
    expect(lireRoles(["admin", "progression"])).toEqual(["admin", "progression"]);
  });

  it("refuse un compte parent qui cumule un autre rôle", () => {
    expect(lireRoles(["parent", "cadre"])).toBeNull();
  });

  it("refuse une liste vide, un rôle inconnu ou un doublon", () => {
    expect(lireRoles([])).toBeNull();
    expect(lireRoles(["superadmin"])).toBeNull();
    expect(lireRoles(["cadre", "cadre"])).toBeNull();
    expect(lireRoles("admin")).toBeNull();
  });
});

describe("normaliserRoles", () => {
  it("reprend l'ancien rôle unique d'un compte enregistré sur le téléphone", () => {
    expect(normaliserRoles({ role: "cadre" })).toEqual(["cadre"]);
  });

  it("garde une liste de rôles valide", () => {
    expect(normaliserRoles({ roles: ["groupe", "cadre"] })).toEqual(["groupe", "cadre"]);
  });

  it("ne donne aucun rôle à une fiche illisible", () => {
    expect(normaliserRoles({ role: "superadmin" })).toEqual([]);
  });
});

describe("basculerRole", () => {
  it("ajoute puis retire un rôle d'encadrement", () => {
    expect(basculerRole(["admin"], "progression")).toEqual(["admin", "progression"]);
    expect(basculerRole(["admin", "progression"], "admin")).toEqual(["progression"]);
  });

  it("choisir parent remplace tous les autres rôles, et inversement", () => {
    expect(basculerRole(["admin", "cadre"], "parent")).toEqual(["parent"]);
    expect(basculerRole(["parent"], "cadre")).toEqual(["cadre"]);
  });

  it("ne retire jamais le dernier rôle", () => {
    expect(basculerRole(["cadre"], "cadre")).toEqual(["cadre"]);
  });

  it("range les rôles dans un ordre stable", () => {
    expect(basculerRole(["progression"], "admin")).toEqual(["admin", "progression"]);
  });
});

describe("espaceInitial", () => {
  it("ouvre l'espace de terrain avant l'administration", () => {
    expect(espaceInitial(["admin", "progression"])).toBe("progression");
    expect(espaceInitial(["admin"])).toBe("admin");
  });

  it("garde l'espace choisi la dernière fois s'il est encore permis", () => {
    expect(espaceInitial(["admin", "progression"], "admin")).toBe("admin");
    expect(espaceInitial(["progression"], "admin")).toBe("progression");
  });
});

describe("exigeDeuxFARoles et libelleRoles", () => {
  it("exige le second facteur dès qu'un rôle le demande", () => {
    expect(exigeDeuxFARoles(["cadre"])).toBe(false);
    expect(exigeDeuxFARoles(["cadre", "groupe"])).toBe(true);
  });

  it("nomme tous les rôles du compte", () => {
    expect(libelleRoles(["admin", "progression"])).toBe("Administrateur · Responsable progression");
  });
});
