import { describe, expect, it } from "vitest";
import { codeTotp, DOMAINE_COMPTES, emailDeConnexion, messageErreurAuth, motDePasseValide, normaliserIdentifiant } from "../auth";

describe("normaliserIdentifiant", () => {
  it("met en minuscules, retire accents et espaces autour", () => {
    expect(normaliserIdentifiant("  Aïssatou.Diallo ")).toBe("aissatou.diallo");
  });

  it("garde chiffres, points et tirets", () => {
    expect(normaliserIdentifiant("jean-paul.sarr2")).toBe("jean-paul.sarr2");
  });
});

describe("emailDeConnexion", () => {
  it("rattache l'identifiant au domaine interne, qui ne reçoit jamais de courrier", () => {
    expect(emailDeConnexion("Ibrahima.Seck")).toBe(`ibrahima.seck@${DOMAINE_COMPTES}`);
    expect(DOMAINE_COMPTES.endsWith(".invalid")).toBe(true);
  });

  it("refuse un identifiant vide, trop court ou avec des caractères interdits", () => {
    expect(emailDeConnexion("")).toBeNull();
    expect(emailDeConnexion("a")).toBeNull();
    expect(emailDeConnexion("ibrahima seck")).toBeNull();
    expect(emailDeConnexion("x@autre.sn")).toBeNull();
  });
});

describe("motDePasseValide", () => {
  it("exige 10 caractères avec au moins une lettre et un chiffre", () => {
    expect(motDePasseValide("scout2026dakar")).toBe(true);
    expect(motDePasseValide("court1")).toBe(false);
    expect(motDePasseValide("seulementdeslettres")).toBe(false);
    expect(motDePasseValide("1234567890")).toBe(false);
  });
});

describe("codeTotp", () => {
  it("accepte six chiffres, espaces compris", () => {
    expect(codeTotp(" 123 456 ")).toBe("123456");
  });

  it("refuse tout autre format", () => {
    expect(codeTotp("12345")).toBeNull();
    expect(codeTotp("12a456")).toBeNull();
  });
});

describe("messageErreurAuth", () => {
  it("ne dit pas lequel de l'identifiant ou du mot de passe est faux", () => {
    expect(messageErreurAuth({ code: "invalid_credentials", status: 400 })).toBe("Identifiant ou mot de passe incorrect.");
  });

  it("explique les trop nombreux essais", () => {
    expect(messageErreurAuth({ code: "over_request_rate_limit", status: 429 })).toMatch(/Trop d'essais/);
    expect(messageErreurAuth({ status: 429 })).toMatch(/Trop d'essais/);
  });

  it("explique un code de double authentification faux ou expiré", () => {
    expect(messageErreurAuth({ code: "mfa_verification_failed", status: 422 })).toMatch(/Code incorrect/);
  });

  it("distingue l'absence de réseau", () => {
    expect(messageErreurAuth(new TypeError("Failed to fetch"))).toMatch(/serveur ne répond pas/);
    expect(messageErreurAuth({ name: "AuthRetryableFetchError", status: 0 })).toMatch(/serveur ne répond pas/);
  });

  it("donne un message générique pour le reste", () => {
    expect(messageErreurAuth(undefined)).toBe("La connexion a échoué. Réessayez.");
  });
});
