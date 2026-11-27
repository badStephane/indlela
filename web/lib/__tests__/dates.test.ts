import { describe, expect, it } from "vitest";
import { fmtMoisAn, fmtPoint } from "../dates";

describe("fmtPoint", () => {
  it("écrit le jour et le mois à deux chiffres, séparés par un point", () => {
    expect(fmtPoint("2026-09-03")).toBe("03.09");
  });

  it("ajoute l'année quand on la demande", () => {
    expect(fmtPoint("2026-11-28", true)).toBe("28.11.2026");
  });
});

describe("fmtMoisAn", () => {
  it("écrit le mois et l'année", () => {
    expect(fmtMoisAn("2026-03-14")).toBe("03.2026");
  });
});
