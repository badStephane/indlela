"use client";

// État de l'application côté téléphone. Tout ce qui doit survivre à un
// rechargement (validations en attente comprises) est gardé dans IndexedDB.
// En production, flush() enverra la file d'attente à Supabase ; ici, la
// synchronisation est simulée.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { get, set } from "idb-keyval";
import { CURRENT_CADRE, findJeune, seedValidations, uuid, type Jeune, type Validation } from "./mock";
import { pendingCount, plural } from "./progress";
import { toISODate } from "./dates";
import type { BranchCode } from "./referentiels";

export type Role = "cadre" | "groupe" | "parent" | "admin";

export const ROLE_HOME: Record<Role, string> = {
  cadre: "/unite",
  groupe: "/groupe",
  parent: "/famille",
  admin: "/admin/referentiels",
};

export interface RefState {
  /** Critère obligatoire (true) ou optionnel, par clé « branche.etape.critere ». */
  edits: Record<string, boolean>;
  /** Critères ajoutés, par clé « branche + etape ». */
  extra: Record<string, number>;
  dirty: Partial<Record<BranchCode, boolean>>;
  ver: Record<BranchCode, number>;
  routeCreated: boolean;
}

export interface DemoFlags {
  emptyUnit: boolean;
  /** La première synchronisation échoue, pour montrer l'état d'erreur. */
  syncFails: boolean;
}

interface Persisted {
  role: Role | null;
  lastTab: string | null;
  vals: Validation[];
  simOffline: boolean;
  demo: DemoFlags;
  ref: RefState;
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
  enter: (role: Role) => void;
  logout: () => void;
  setLastTab: (tab: string) => void;
  showToast: (msg: string, undo?: () => void) => void;
  hideToast: () => void;
  validate: (j: Jeune, criteres: number[], commentaire: string) => void;
  openCancelSheet: (validationId: string) => void;
  closeSheet: () => void;
  cancelValidation: (validationId: string) => void;
  tapSync: () => void;
  setDemo: (patch: Partial<DemoFlags>) => void;
  updateRef: (fn: (r: RefState) => RefState) => void;
}

const KEY = "carnet-indlela-v1";

const initialRef = (): RefState => ({ edits: {}, extra: {}, dirty: {}, ver: { troupe: 2, meute: 1, route: 1 }, routeCreated: false });

const initial = (): Persisted => ({
  role: null,
  lastTab: null,
  vals: seedValidations(),
  simOffline: false,
  demo: { emptyUnit: false, syncFails: true },
  ref: initialRef(),
});

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

  const validate = useCallback(
    (j: Jeune, criteres: number[], commentaire: string) => {
      if (!criteres.length) return;
      const batch = uuid();
      const now = new Date();
      const add: Validation[] = criteres.map((critere) => ({
        id: uuid(),
        jeuneId: j.id,
        etape: j.etape,
        critere,
        date: toISODate(now),
        validePar: CURRENT_CADRE.short,
        commentaire: commentaire || undefined,
        pending: offline,
        annuleeLe: null,
        batch,
        updatedAt: now.toISOString(),
      }));
      setP((s) => ({ ...s, vals: [...s.vals, ...add] }));
      const n = add.length;
      showToast(`${n} ${plural(n, "critère validé", "critères validés")} pour ${j.prenom}${offline ? " · en attente de réseau" : ""}`, () => {
        setP((s) => ({ ...s, vals: s.vals.filter((v) => v.batch !== batch) }));
        showToast("Validation retirée");
      });
    },
    [offline, showToast],
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
      enter: (role) => setP((s) => ({ ...s, role, lastTab: ROLE_HOME[role] })),
      logout: () => {
        setSheet(null);
        hideToast();
        setP((s) => ({ ...s, role: null, lastTab: null }));
      },
      setLastTab: (tab) => setP((s) => (s.lastTab === tab ? s : { ...s, lastTab: tab })),
      showToast,
      hideToast,
      validate,
      openCancelSheet: (id) => {
        hideToast();
        setSheet(id);
      },
      closeSheet: () => setSheet(null),
      cancelValidation,
      tapSync,
      setDemo: (patch) => setP((s) => ({ ...s, demo: { ...s.demo, ...patch } })),
      updateRef: (fn) => setP((s) => ({ ...s, ref: fn(s.ref) })),
    }),
    [p, hydrated, offline, syncErr, pending, toast, sheet, showToast, hideToast, validate, cancelValidation, tapSync],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside <StoreProvider>");
  return s;
}

/** Validation ciblée par la feuille d'annulation, avec son jeune. */
export function useSheetTarget() {
  const { sheet, vals } = useStore();
  if (!sheet) return null;
  const v = vals.find((x) => x.id === sheet);
  const j = v ? findJeune(v.jeuneId) : undefined;
  return v && j ? { v, j } : null;
}
