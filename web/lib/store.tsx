"use client";

// État de l'application côté téléphone. Tout ce qui doit survivre à un
// rechargement (validations en attente comprises) est gardé dans IndexedDB.
// En production, flush() enverra la file d'attente à Supabase ; ici, la
// synchronisation est simulée. Le journal n'enregistre que ce que le serveur
// a reçu : une validation saisie hors connexion y entre à la synchronisation.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { get, set } from "idb-keyval";
import { DEMO_USERS, fullName, SEED_JEUNES, seedValidations, uuid, type Jeune, type Validation } from "./mock";
import { SEED_COMPTES, SEED_UNITES, seedJournal, type Compte, type JournalEntry, type Unite } from "./admin";
import { pendingCount, plural } from "./progress";
import { toISODate } from "./dates";
import { BRANCHES, type BranchCode } from "./referentiels";

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
  jeunes: Jeune[];
  comptes: Compte[];
  unites: Unite[];
  journal: JournalEntry[];
  /** Date ISO de la dernière sauvegarde chiffrée. */
  lastBackup: string;
  simOffline: boolean;
  demo: DemoFlags;
  ref: RefState;
}

interface Toast {
  id: number;
  msg: string;
  undo?: () => void;
}

export type JournalInput = Omit<JournalEntry, "id" | "at" | "user">;

interface Store extends Persisted {
  hydrated: boolean;
  offline: boolean;
  syncErr: boolean;
  pending: number;
  toast: Toast | null;
  sheet: string | null;
  /** Nom inscrit au journal et sur les validations pour le rôle connecté. */
  userName: string;
  /** Compte connecté (table utilisateurs). */
  compte: Compte | undefined;
  findJeune: (id: string | undefined | null) => Jeune | undefined;
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
  setJeunes: (fn: (j: Jeune[]) => Jeune[]) => void;
  setComptes: (fn: (c: Compte[]) => Compte[]) => void;
  setUnites: (fn: (u: Unite[]) => Unite[]) => void;
  setLastBackup: (iso: string) => void;
  log: (...entries: JournalInput[]) => void;
}

const KEY = "carnet-indlela-v1";

const initialRef = (): RefState => ({ edits: {}, extra: {}, dirty: {}, ver: { troupe: 2, meute: 1, route: 1 }, routeCreated: false });

const initial = (): Persisted => {
  const vals = seedValidations();
  const backup = new Date();
  backup.setHours(3, 0, 0, 0);
  return {
    role: null,
    lastTab: null,
    vals,
    jeunes: SEED_JEUNES,
    comptes: SEED_COMPTES,
    unites: SEED_UNITES,
    journal: seedJournal(vals),
    lastBackup: backup.toISOString(),
    simOffline: false,
    demo: { emptyUnit: false, syncFails: true },
    ref: initialRef(),
  };
};

const critLabel = (j: Jeune, v: Validation) => BRANCHES[j.branche].steps[v.etape].crit[v.critere];

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
        if (!alive || !saved) return;
        // Un état enregistré avant l'ajout du journal repart du journal de démo.
        const base = initial();
        setP({ ...base, ...saved, journal: saved.journal ?? seedJournal(saved.vals ?? base.vals), ref: { ...initialRef(), ...saved.ref } });
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

  const userName = p.role ? DEMO_USERS[p.role].nom : "";
  const findJeune = useCallback((id: string | undefined | null) => p.jeunes.find((j) => j.id === id), [p.jeunes]);

  const entries = useCallback((user: string, list: JournalInput[]): JournalEntry[] => {
    const at = new Date().toISOString();
    return list.map((e) => ({ ...e, id: uuid(), at, user }));
  }, []);

  const log = useCallback(
    (...list: JournalInput[]) => setP((s) => ({ ...s, journal: [...entries(s.role ? DEMO_USERS[s.role].nom : "", list), ...s.journal] })),
    [entries],
  );

  const validationEntry = (j: Jeune, v: Validation): JournalInput => ({
    action: "validation",
    table: "validations",
    ligne: v.id,
    resume: `« ${critLabel(j, v)} » validé pour ${fullName(j)}`,
    apres: { critere: critLabel(j, v), date: v.date, valide_par: v.validePar, commentaire: v.commentaire ?? null },
  });

  const cancelEntry = (j: Jeune, v: Validation, today: string): JournalInput => ({
    action: "annulation",
    table: "validations",
    ligne: v.id,
    resume: `Validation de « ${critLabel(j, v)} » annulée pour ${fullName(j)}`,
    avant: { annulee_le: null },
    apres: { annulee_le: today },
  });

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
      setP((s) => {
        const sent = s.vals.filter((v) => v.pending && !v.annuleeLe);
        const logged = sent.flatMap((v) => {
          const j = s.jeunes.find((x) => x.id === v.jeuneId);
          return j ? [validationEntry(j, v)] : [];
        });
        return {
          ...s,
          simOffline: false,
          vals: s.vals.map((v) => (v.pending ? { ...v, pending: false, updatedAt: now } : v)),
          journal: [...entries(s.role ? DEMO_USERS[s.role].nom : "", logged), ...s.journal],
        };
      });
      setSyncErr(false);
      showToast(n ? `${n} ${plural(n, "validation synchronisée", "validations synchronisées")}` : "De nouveau en ligne");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showToast, entries],
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
        validePar: userName,
        commentaire: commentaire || undefined,
        pending: offline,
        annuleeLe: null,
        batch,
        updatedAt: now.toISOString(),
      }));
      setP((s) => ({ ...s, vals: [...s.vals, ...add], journal: offline ? s.journal : [...entries(userName, add.map((v) => validationEntry(j, v))), ...s.journal] }));
      const n = add.length;
      showToast(`${n} ${plural(n, "critère validé", "critères validés")} pour ${j.prenom}${offline ? " · en attente de réseau" : ""}`, () => {
        // Une saisie restée sur le téléphone peut disparaître ; une saisie reçue par
        // le serveur ne s'efface jamais : elle est annulée et le journal le garde.
        const today = toISODate(new Date());
        const stamp = new Date().toISOString();
        setP((s) => {
          const mine = s.vals.filter((v) => v.batch === batch);
          const synced = mine.filter((v) => !v.pending && !v.annuleeLe);
          return {
            ...s,
            vals: s.vals
              .filter((v) => v.batch !== batch || !v.pending)
              .map((v) => (v.batch === batch && !v.annuleeLe ? { ...v, annuleeLe: today, annuleePar: userName, updatedAt: stamp } : v)),
            journal: synced.length ? [...entries(userName, synced.map((v) => cancelEntry(j, v, today))), ...s.journal] : s.journal,
          };
        });
        showToast("Validation retirée");
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [offline, showToast, userName, entries],
  );

  const cancelValidation = useCallback(
    (id: string) => {
      const today = toISODate(new Date());
      const now = new Date().toISOString();
      setSheet(null);
      setP((s) => {
        const v = s.vals.find((x) => x.id === id);
        const j = v && s.jeunes.find((x) => x.id === v.jeuneId);
        return {
          ...s,
          vals: s.vals.map((x) => (x.id === id ? { ...x, annuleeLe: today, annuleePar: userName, updatedAt: now } : x)),
          journal: v && j && !v.pending ? [...entries(userName, [cancelEntry(j, v, today)]), ...s.journal] : s.journal,
        };
      });
      showToast("Validation annulée · gardée dans le journal");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showToast, userName, entries],
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
      userName,
      compte: p.role ? p.comptes.find((c) => c.id === DEMO_USERS[p.role!].compte) : undefined,
      findJeune,
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
      setJeunes: (fn) => setP((s) => ({ ...s, jeunes: fn(s.jeunes) })),
      setComptes: (fn) => setP((s) => ({ ...s, comptes: fn(s.comptes) })),
      setUnites: (fn) => setP((s) => ({ ...s, unites: fn(s.unites) })),
      setLastBackup: (iso) => setP((s) => ({ ...s, lastBackup: iso })),
      log,
    }),
    [p, hydrated, offline, syncErr, pending, toast, sheet, userName, findJeune, showToast, hideToast, validate, cancelValidation, tapSync, log],
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
  const { sheet, vals, findJeune } = useStore();
  if (!sheet) return null;
  const v = vals.find((x) => x.id === sheet);
  const j = v ? findJeune(v.jeuneId) : undefined;
  return v && j ? { v, j } : null;
}

/** Jeunes actifs de la troupe : fiche active seulement avec le consentement des parents. */
export function useTroupe(): Jeune[] {
  const { jeunes, demo } = useStore();
  return useMemo(
    () => jeunes.filter((j) => j.branche === "troupe" && j.statut === "actif" && !!j.consentementLe && (!demo.emptyUnit || j.importe)),
    [jeunes, demo.emptyUnit],
  );
}
