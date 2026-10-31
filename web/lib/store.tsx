"use client";

// État de l'application côté téléphone. Tout ce qui doit survivre à un
// rechargement (jeunes ajoutés, validations en attente comprises) est gardé dans IndexedDB.
// En production, flush() enverra la file d'attente à Supabase ; ici, la
// synchronisation est simulée.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { get, set } from "idb-keyval";
import { CURRENT_CADRE, findJeune, seedJeunes, seedValidations, uuid, type Jeune, type Validation } from "./mock";
import { critStatus, isValidated, pendingCount, plural } from "./progress";
import { toISODate } from "./dates";
import { EMPTY_ADAPT, domaineOfPreuve, effectiveSteps, preuveLabel, type RefEdits, type StepsByBranch, type UnitAdapt } from "./effective";
import type { BranchCode } from "./referentiels";

export type Role = "cadre" | "groupe" | "parent" | "admin";

export const ROLE_HOME: Record<Role, string> = {
  cadre: "/unite",
  groupe: "/groupe",
  parent: "/famille",
  admin: "/admin/referentiels",
};

export interface RefState extends RefEdits {
  dirty: Partial<Record<BranchCode, boolean>>;
  ver: Record<BranchCode, number>;
  routeCreated: boolean;
}

export interface DemoFlags {
  emptyUnit: boolean;
  /** La première synchronisation échoue, pour montrer l'état d'erreur. */
  syncFails: boolean;
}

/** Jeune saisi par le chef d'unité, avant que l'application lui donne un identifiant. */
export interface NewJeune {
  prenom: string;
  nom: string;
  dateNaissance: string | null;
  branche: BranchCode;
  etapeId: string;
}

/** Une preuve cochée à la validation, avec la façon dont le jeune l'a réussie. */
export interface ValidationEntry {
  preuveId: string;
  commentaire: string;
}

interface Persisted {
  role: Role | null;
  lastTab: string | null;
  jeunes: Jeune[];
  vals: Validation[];
  simOffline: boolean;
  demo: DemoFlags;
  ref: RefState;
  /** Adaptations des épreuves par unité (une unité par branche dans la démo). */
  adapts: Partial<Record<BranchCode, UnitAdapt>>;
}

interface Toast {
  id: number;
  msg: string;
  undo?: () => void;
}

interface Store extends Persisted {
  hydrated: boolean;
  offline: boolean;
  syncErr: boolean;
  pending: number;
  toast: Toast | null;
  sheet: string | null;
  /** Épreuves effectives de chaque branche, adaptations de l'unité comprises. */
  steps: StepsByBranch;
  enter: (role: Role) => void;
  logout: () => void;
  setLastTab: (tab: string) => void;
  showToast: (msg: string, undo?: () => void) => void;
  hideToast: () => void;
  addJeunes: (list: NewJeune[]) => void;
  updateJeune: (id: string, patch: Partial<Pick<Jeune, "etapeId" | "choix">>) => void;
  updateAdapt: (branche: BranchCode, fn: (a: UnitAdapt) => UnitAdapt) => void;
  validate: (j: Jeune, entries: ValidationEntry[], date: string) => void;
  openCancelSheet: (validationId: string) => void;
  closeSheet: () => void;
  cancelValidation: (validationId: string) => void;
  tapSync: () => void;
  setDemo: (patch: Partial<DemoFlags>) => void;
  updateRef: (fn: (r: RefState) => RefState) => void;
}

// v3 : étape → domaine → preuves, d'après le carnet de preuves (les données de démo antérieures ne sont pas reprises).
const KEY = "carnet-indlela-v3";

const initialRef = (): RefState => ({ edits: {}, dirty: {}, ver: { troupe: 2, meute: 1, route: 1 }, routeCreated: false });

const initial = (): Persisted => ({
  role: null,
  lastTab: null,
  jeunes: seedJeunes(),
  vals: seedValidations(),
  simOffline: false,
  demo: { emptyUnit: false, syncFails: true },
  ref: initialRef(),
  adapts: {},
});

/** Démo « Unité vide » : retire la troupe, ou remet les jeunes de démo qui manquent. */
function withDemoTroupe(jeunes: Jeune[], empty: boolean): Jeune[] {
  if (empty) return jeunes.filter((j) => j.branche !== "troupe");
  const missing = seedJeunes().filter((x) => x.branche === "troupe" && !jeunes.some((j) => j.id === x.id));
  return [...jeunes, ...missing];
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<Persisted>(initial);
  const [hydrated, setHydrated] = useState(false);
  const [netOnline, setNetOnline] = useState(true);
  const [syncErr, setSyncErr] = useState(false);
  const failedOnce = useRef(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    get<Persisted>(KEY)
      .then((saved) => {
        if (alive && saved) setP({ ...initial(), ...saved, ref: { ...initialRef(), ...saved.ref } });
      })
      .catch(() => {})
      .finally(() => alive && setHydrated(true));
    setNetOnline(navigator.onLine);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (hydrated) set(KEY, p).catch(() => {});
  }, [p, hydrated]);

  const showToast = useCallback((msg: string, undo?: () => void) => {
    clearTimeout(timer.current);
    const id = Date.now();
    setToast({ id, msg, undo });
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), undo ? 6000 : 3500);
  }, []);
  const hideToast = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const flush = useCallback(
    (n: number) => {
      const now = new Date().toISOString();
      setP((s) => ({ ...s, simOffline: false, vals: s.vals.map((v) => (v.pending ? { ...v, pending: false, updatedAt: now } : v)) }));
      setSyncErr(false);
      showToast(n ? `${n} ${plural(n, "validation synchronisée", "validations synchronisées")}` : "De nouveau en ligne");
    },
    [showToast],
  );

  // Retour du vrai réseau : la file part seule, sauf si la démo force le mode hors connexion.
  const pRef = useRef(p);
  pRef.current = p;
  useEffect(() => {
    const on = () => {
      setNetOnline(true);
      if (!pRef.current.simOffline) {
        const n = pendingCount(pRef.current.vals);
        if (n) flush(n);
      }
    };
    const off = () => setNetOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [flush]);

  const offline = p.simOffline || !netOnline;
  const pending = pendingCount(p.vals);
  const steps = useMemo(() => effectiveSteps(p.ref, p.adapts), [p.ref, p.adapts]);

  const tapSync = useCallback(() => {
    if (!offline && !syncErr) {
      setP((s) => ({ ...s, simOffline: true }));
      showToast("Hors connexion : les validations restent sur le téléphone.");
      return;
    }
    if (!netOnline) {
      showToast("Toujours pas de réseau. Les validations restent sur le téléphone.");
      return;
    }
    if (offline && pending && p.demo.syncFails && !failedOnce.current) {
      failedOnce.current = true;
      setP((s) => ({ ...s, simOffline: false }));
      setSyncErr(true);
      showToast(`La synchronisation a échoué. ${pending} ${plural(pending, "validation reste", "validations restent")} sur le téléphone.`);
      return;
    }
    flush(pending);
  }, [offline, syncErr, netOnline, pending, p.demo.syncFails, showToast, flush]);

  const addJeunes = useCallback(
    (list: NewJeune[]) => {
      if (!list.length) return;
      const today = toISODate(new Date());
      const add: Jeune[] = list.map((x) => ({ ...x, id: uuid(), dateEntree: today, choix: [], specs: [] }));
      setP((s) => ({ ...s, jeunes: [...s.jeunes, ...add] }));
      const n = add.length;
      showToast(n === 1 ? `${add[0].prenom} ${add[0].nom} est dans l'unité` : `${n} jeunes ajoutés à l'unité`);
    },
    [showToast],
  );

  const validate = useCallback(
    (j: Jeune, entries: ValidationEntry[], date: string) => {
      const batch = uuid();
      const stamp = new Date().toISOString();
      // Une preuve déjà validée ne l'est pas deux fois (double touche, deux cadres).
      const fresh = entries.filter((e) => !isValidated(critStatus(pRef.current.vals, j.id, e.preuveId)));
      if (!fresh.length) return;
      const step = steps[j.branche].find((x) => x.id === j.etapeId);
      const add: Validation[] = fresh.map((e) => ({
        id: uuid(),
        jeuneId: j.id,
        etapeId: j.etapeId,
        domaineId: domaineOfPreuve(step, e.preuveId)?.id ?? "",
        preuveId: e.preuveId,
        date,
        validePar: CURRENT_CADRE.short,
        commentaire: e.commentaire || undefined,
        pending: offline,
        annuleeLe: null,
        batch,
        updatedAt: stamp,
      }));
      // pRef suit l'état rendu : on l'avance tout de suite pour qu'une seconde touche voie ces lignes.
      pRef.current = { ...pRef.current, vals: [...pRef.current.vals, ...add] };
      setP((s) => ({ ...s, vals: [...s.vals, ...add] }));
      const n = add.length;
      showToast(`${n} ${plural(n, "preuve validée", "preuves validées")} pour ${j.prenom}${offline ? " · en attente de réseau" : ""}`, () => {
        setP((s) => ({ ...s, vals: s.vals.filter((v) => v.batch !== batch) }));
        showToast("Validation retirée");
      });
    },
    [offline, showToast, steps],
  );

  const cancelValidation = useCallback(
    (id: string) => {
      const today = toISODate(new Date());
      const now = new Date().toISOString();
      setSheet(null);
      setP((s) => ({
        ...s,
        vals: s.vals.map((v) => (v.id === id ? { ...v, annuleeLe: today, annuleePar: CURRENT_CADRE.short, updatedAt: now } : v)),
      }));
      showToast("Validation annulée · gardée dans le journal");
    },
    [showToast],
  );

  const value = useMemo<Store>(
    () => ({
      ...p,
      hydrated,
      offline,
      syncErr,
      pending,
      toast,
      sheet,
      steps,
      enter: (role) => setP((s) => ({ ...s, role, lastTab: ROLE_HOME[role] })),
      logout: () => {
        setSheet(null);
        hideToast();
        setP((s) => ({ ...s, role: null, lastTab: null }));
      },
      setLastTab: (tab) => setP((s) => (s.lastTab === tab ? s : { ...s, lastTab: tab })),
      showToast,
      hideToast,
      addJeunes,
      updateJeune: (id, patch) => setP((s) => ({ ...s, jeunes: s.jeunes.map((j) => (j.id === id ? { ...j, ...patch } : j)) })),
      updateAdapt: (branche, fn) => setP((s) => ({ ...s, adapts: { ...s.adapts, [branche]: fn(s.adapts[branche] ?? EMPTY_ADAPT) } })),
      validate,
      openCancelSheet: (id) => {
        hideToast();
        setSheet(id);
      },
      closeSheet: () => setSheet(null),
      cancelValidation,
      tapSync,
      setDemo: (patch) =>
        setP((s) => ({
          ...s,
          demo: { ...s.demo, ...patch },
          jeunes: patch.emptyUnit === undefined ? s.jeunes : withDemoTroupe(s.jeunes, patch.emptyUnit),
        })),
      updateRef: (fn) => setP((s) => ({ ...s, ref: fn(s.ref) })),
    }),
    [p, hydrated, offline, syncErr, pending, toast, sheet, steps, showToast, hideToast, addJeunes, validate, cancelValidation, tapSync],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside <StoreProvider>");
  return s;
}

/** Validation ciblée par la feuille d'annulation, avec son jeune et le libellé de l'épreuve. */
export function useSheetTarget() {
  const { sheet, vals, jeunes, steps } = useStore();
  if (!sheet) return null;
  const v = vals.find((x) => x.id === sheet);
  const j = v ? findJeune(jeunes, v.jeuneId) : undefined;
  return v && j ? { v, j, label: preuveLabel(steps[j.branche], v.etapeId, v.preuveId) } : null;
}

/** Jeunes de la troupe : l'unité du cadre dans la démo. */
export function useTroupe(): Jeune[] {
  const { jeunes } = useStore();
  return useMemo(() => jeunes.filter((j) => j.branche === "troupe"), [jeunes]);
}
