// Comptes, unités et journal : tables utilisateurs, affectations_cadres,
// liens_parent, unites et journal de la conception. Données simulées.

import type { BranchCode } from "./referentiels";
import { BRANCHES } from "./referentiels";
import { daysAgo, toISODate } from "./dates";
import { fullName, SEED_JEUNES, uuid, type Validation } from "./mock";
import type { Role } from "./store";

export interface Compte {
  id: string;
  nom: string;
  identifiant: string;
  role: Role;
  actif: boolean;
  /** Unités qu'un cadre peut gérer (affectations_cadres). */
  unites: string[];
  /** Enfants qu'un parent peut voir (liens_parent). */
  enfants: string[];
  /** Double authentification : obligatoire pour l'administrateur et le chef de groupe. */
  deuxFA: boolean;
  derniereConnexion: string | null;
}

export interface Unite {
  id: string;
  nom: string;
  branche: BranchCode;
  annee: string;
}

export type JournalAction =
  | "validation"
  | "annulation"
  | "publication"
  | "creation"
  | "modification"
  | "consentement"
  | "import"
  | "export"
  | "sauvegarde";

export type JournalValue = string | number | boolean | null;

export interface JournalEntry {
  id: string;
  /** Date et heure ISO. */
  at: string;
  user: string;
  action: JournalAction;
  table: string;
  ligne: string;
  resume: string;
  avant?: Record<string, JournalValue>;
  apres?: Record<string, JournalValue>;
}

export const ROLE_LABELS: Record<Role, string> = {
  cadre: "Cadre",
  groupe: "Chef de groupe",
  parent: "Parent",
  admin: "Administrateur",
};

export const ANNEE = "2026-2027";

export const SEED_UNITES: Unite[] = [
  { id: "meute", nom: "Meute Saint-Paul", branche: "meute", annee: ANNEE },
  { id: "troupe", nom: "Troupe Saint-Paul", branche: "troupe", annee: ANNEE },
  { id: "route", nom: "Route Saint-Paul", branche: "route", annee: ANNEE },
];

const d = (n: number) => toISODate(daysAgo(n));

const compte = (id: string, nom: string, role: Role, extra: Partial<Compte> = {}): Compte => ({
  id,
  nom,
  identifiant: identifiantDe(nom),
  role,
  actif: true,
  unites: [],
  enfants: [],
  deuxFA: role === "admin" || role === "groupe",
  derniereConnexion: null,
  ...extra,
});

export const SEED_COMPTES: Compte[] = [
  compte("u-admin1", "Abdou Karim Sène", "admin", { derniereConnexion: d(0) }),
  compte("u-admin2", "Aïssatou Diallo", "admin", { derniereConnexion: d(3) }),
  compte("u-cg", "Joseph Mendy", "groupe", { derniereConnexion: d(1) }),
  compte("u-iseck", "Ibrahima Seck", "cadre", { unites: ["troupe"], derniereConnexion: d(0) }),
  compte("u-fmbaye", "Fatou Mbaye", "cadre", { unites: ["troupe"], derniereConnexion: d(5) }),
  compte("u-ldiatta", "Lamine Diatta", "cadre", { unites: ["troupe"], derniereConnexion: d(12) }),
  compte("u-psagna", "Paul Sagna", "cadre", { unites: ["troupe"], actif: false, derniereConnexion: d(210) }),
  compte("u-mfaye", "Marie Faye", "cadre", { unites: ["meute"], derniereConnexion: d(2) }),
  compte("u-odiouf", "Omar Diouf", "cadre", { unites: ["meute"], derniereConnexion: d(9) }),
  compte("u-rgomis", "Rose Gomis", "cadre", { unites: ["meute"], derniereConnexion: d(30) }),
  compte("u-pndour", "Pierre Ndour", "cadre", { unites: ["meute"], derniereConnexion: d(16) }),
  compte("u-ncoly", "Ndèye Coly", "cadre", { unites: ["route"] }),
  compte("u-jsarr", "Jean Sarr", "cadre", { unites: ["route"] }),
  compte("u-fam-ndiaye", "Famille Ndiaye", "parent", { enfants: ["awa", "ibou"], derniereConnexion: d(1) }),
  compte("u-fam-diop", "Famille Diop", "parent", { enfants: ["moussa"], derniereConnexion: d(4) }),
  compte("u-fam-fall", "Famille Fall", "parent", { enfants: ["cheikh"] }),
];

/** « Aïssatou Diallo » → « aissatou.diallo ». */
export function identifiantDe(nom: string): string {
  const parts = nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, "")
    .trim()
    .split(/\s+/);
  return parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0] || "compte";
}

export function identifiantLibre(nom: string, comptes: Compte[]): string {
  const base = identifiantDe(nom);
  let id = base;
  for (let n = 2; comptes.some((c) => c.identifiant === id); n++) id = `${base}${n}`;
  return id;
}

const at = (iso: string, minutes: number) => {
  const x = new Date(iso + "T00:00:00");
  x.setHours(18, 0, 0, 0);
  x.setMinutes(minutes);
  return x.toISOString();
};

/** Journal de démo, reconstitué à partir des validations de départ. */
export function seedJournal(vals: Validation[]): JournalEntry[] {
  const out: JournalEntry[] = [];
  const admin = "Admin A. K. Sène";
  out.push(
    { id: uuid(), at: at(d(120), 600), user: admin, action: "creation", table: "unites", ligne: "troupe", resume: `Unité Troupe Saint-Paul créée (${ANNEE})`, apres: { nom: "Troupe Saint-Paul", branche: "troupe", annee: ANNEE } },
    { id: uuid(), at: at(d(118), 610), user: admin, action: "publication", table: "referentiels", ligne: "meute-v1", resume: "Guide du louvetier · version 1 publiée", apres: { version: 1, actif: true } },
    { id: uuid(), at: at(d(64), 620), user: admin, action: "publication", table: "referentiels", ligne: "troupe-v2", resume: "Carnet de preuves · version 2 publiée", avant: { version: 1 }, apres: { version: 2, actif: true } },
    { id: uuid(), at: at(d(40), 615), user: admin, action: "modification", table: "utilisateurs", ligne: "u-psagna", resume: "Compte de Paul Sagna désactivé", avant: { actif: true }, apres: { actif: false } },
  );
  vals.forEach((v, i) => {
    const j = SEED_JEUNES.find((x) => x.id === v.jeuneId)!;
    const crit = BRANCHES[j.branche].steps[v.etape].crit[v.critere];
    out.push({
      id: uuid(),
      at: at(v.date, 30 + ((i * 7) % 50)),
      user: v.validePar,
      action: "validation",
      table: "validations",
      ligne: v.id,
      resume: `« ${crit} » validé pour ${fullName(j)}`,
      apres: { critere: crit, date: v.date, valide_par: v.validePar },
    });
    if (v.annuleeLe)
      out.push({
        id: uuid(),
        at: at(v.annuleeLe, 45),
        user: v.annuleePar ?? v.validePar,
        action: "annulation",
        table: "validations",
        ligne: v.id,
        resume: `Validation de « ${crit} » annulée pour ${fullName(j)}`,
        avant: { annulee_le: null },
        apres: { annulee_le: v.annuleeLe },
      });
  });
  return out.sort((a, b) => b.at.localeCompare(a.at));
}
