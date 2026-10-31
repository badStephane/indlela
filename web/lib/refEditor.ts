// Modifications du référentiel par l'admin. Chaque opération rend un nouveau référentiel
// sans toucher à l'ancien ; rien ne se supprime : un domaine ou une preuve s'archive,
// pour que les validations passées gardent leur libellé.

import type { Domaine, Etape, Preuve } from "./referentiels";

export const MAX_LABEL = 160;

const clean = (text: string) => text.trim().slice(0, MAX_LABEL);

type DomainePatch = Partial<Pick<Domaine, "name" | "obligatoire" | "min" | "archive">>;
type PreuvePatch = Partial<Pick<Preuve, "label" | "archive">>;
type EtapePatch = Partial<Pick<Etape, "name" | "val" | "rule">>;

function mapDomaines(steps: Etape[], fn: (d: Domaine) => Domaine): Etape[] {
  return steps.map((s) => ({ ...s, domaines: s.domaines.map(fn) }));
}

function move<T extends { id: string }>(list: T[], id: string, delta: number): T[] {
  const i = list.findIndex((x) => x.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function updateEtape(steps: Etape[], etapeId: string, patch: EtapePatch): Etape[] {
  if (patch.name !== undefined && !clean(patch.name)) return steps;
  const tidy = Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, clean(v ?? "")]));
  return steps.map((s) => (s.id === etapeId ? { ...s, ...tidy } : s));
}

export function addEtape(steps: Etape[], name: string, id: string): Etape[] {
  const n = clean(name);
  return n ? [...steps, { id, name: n, val: "", domaines: [] }] : steps;
}

export function addDomaine(steps: Etape[], etapeId: string, name: string, id: string): Etape[] {
  const n = clean(name);
  if (!n) return steps;
  return steps.map((s) => (s.id === etapeId ? { ...s, domaines: [...s.domaines, { id, name: n, obligatoire: true, preuves: [] }] } : s));
}

export function updateDomaine(steps: Etape[], domaineId: string, patch: DomainePatch): Etape[] {
  if (patch.name !== undefined && !clean(patch.name)) return steps;
  return mapDomaines(steps, (d) => {
    if (d.id !== domaineId) return d;
    const { min, ...rest } = { ...d, ...patch, ...(patch.name !== undefined ? { name: clean(patch.name) } : {}) };
    const actives = d.preuves.filter((p) => !p.archive).length;
    return min && min > 0 ? { ...rest, min: Math.min(min, Math.max(actives, 1)) } : rest;
  });
}

export function moveDomaine(steps: Etape[], domaineId: string, delta: number): Etape[] {
  return steps.map((s) => (s.domaines.some((d) => d.id === domaineId) ? { ...s, domaines: move(s.domaines, domaineId, delta) } : s));
}

export function addPreuve(steps: Etape[], domaineId: string, label: string, id: string): Etape[] {
  const l = clean(label);
  return l ? mapDomaines(steps, (d) => (d.id === domaineId ? { ...d, preuves: [...d.preuves, { id, label: l }] } : d)) : steps;
}

export function updatePreuve(steps: Etape[], preuveId: string, patch: PreuvePatch): Etape[] {
  if (patch.label !== undefined && !clean(patch.label)) return steps;
  const tidy = patch.label !== undefined ? { ...patch, label: clean(patch.label) } : patch;
  return mapDomaines(steps, (d) => (d.preuves.some((p) => p.id === preuveId) ? { ...d, preuves: d.preuves.map((p) => (p.id === preuveId ? { ...p, ...tidy } : p)) } : d));
}

export function movePreuve(steps: Etape[], preuveId: string, delta: number): Etape[] {
  return mapDomaines(steps, (d) => (d.preuves.some((p) => p.id === preuveId) ? { ...d, preuves: move(d.preuves, preuveId, delta) } : d));
}
