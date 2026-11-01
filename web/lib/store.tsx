"use client";

// État de l'application côté téléphone. Tout ce qui doit survivre à un
// rechargement (jeunes ajoutés, validations en attente comprises) est gardé dans IndexedDB.
// En production, flush() enverra la file d'attente à Supabase ; ici, la
// synchronisation est simulée.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { del, get, set } from "idb-keyval";
import { DEMO } from "./demo";
import { DEMO_USERS, findJeune, fullName, seedJeunes, seedValidations, uuid, type Jeune, type Validation } from "./mock";
import { GROUPE_DEMO, GROUPE_VIDE, libelleGroupe, nettoyerGroupe, nomGroupe, nomsUnites, renommerUnites, type Groupe, type NomsUnites } from "./groupe";
import { exigeDeuxFA, SEED_COMPTES, SEED_UNITES, seedJournal, type Compte, type JournalEntry, type Unite } from "./admin";
import { critStatus, isValidated, pendingCount, plural } from "./progress";
import { toISODate } from "./dates";
import { BASE_STEPS, EMPTY_ADAPT, domaineOfPreuve, effectiveSteps, preuveLabel, type RefSteps, type StepsByBranch, type UnitAdapt } from "./effective";
import { REF_TITLES, type BranchCode, type Etape } from "./referentiels";
import { etapeSuivante, type DecisionInput, type Reconnaissance } from "./courHonneur";
import { deconnecter, type Moi } from "./session";

export type Role = "cadre" | "groupe" | "progression" | "parent" | "admin";

export const ROLE_HOME: Record<Role, string> = {
  cadre: "/unite",
  groupe: "/groupe",
  progression: "/progression",
  parent: "/famille",
  admin: "/admin/referentiels",
};

/** Version publiée d'un référentiel de branche. */
export interface BranchRef {
  version: number;
  steps: Etape[];
}

export interface RefState {
  /** Versions publiées par l'admin ; une branche absente suit le carnet transcrit. */
  published: Partial<Record<BranchCode, BranchRef>>;
  /** Brouillons en cours, invisibles des cadres jusqu'à la publication. */
  draft: Partial<Record<BranchCode, Etape[]>>;
  routeCreated: boolean;
}

/** Version du carnet transcrit, avant toute publication par l'admin. */
const BASE_VERSION: Record<BranchCode, number> = { troupe: 2, meute: 1, route: 1 };

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
  /** Date ISO du consentement des parents ; sans lui, la fiche reste inactive. */
  consentementLe: string | null;
}

/** Décision de cour d'honneur saisie par le cadre. */
export interface CourInput extends DecisionInput {
  date: string;
  observations: string;
  ct: string;
}

/** Une preuve cochée à la validation, avec la façon dont le jeune l'a réussie. */
export interface ValidationEntry {
  preuveId: string;
  commentaire: string;
}

interface Persisted {
  role: Role | null;
  /** Compte connecté par le serveur ; null en démo (« entrer comme »). */
  moi: Moi | null;
  /** Désignation et paroisse du groupe (table groupes) ; les unités en prennent le nom. */
  groupe: Groupe;
  lastTab: string | null;
  jeunes: Jeune[];
  vals: Validation[];
  /** Décisions de cour d'honneur (étapes reconnues ou ajournées). */
  recons: Reconnaissance[];
  comptes: Compte[];
  unites: Unite[];
  journal: JournalEntry[];
  /** Date ISO de la dernière sauvegarde chiffrée. */
  lastBackup: string;
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

export type JournalInput = Omit<JournalEntry, "id" | "at" | "user">;

interface Store extends Persisted {
  hydrated: boolean;
  /** Nom inscrit au journal et sur les validations pour le rôle connecté. */
  userName: string;
  /** Compte connecté (table utilisateurs). */
  compte: Compte | undefined;
  findJeune: (id: string | undefined | null) => Jeune | undefined;
  setJeunes: (fn: (j: Jeune[]) => Jeune[]) => void;
  setComptes: (fn: (c: Compte[]) => Compte[]) => void;
  setUnites: (fn: (u: Unite[]) => Unite[]) => void;
  setLastBackup: (iso: string) => void;
  /** « Groupe Troisième Dakar ». */
  groupeNom: string;
  /** « Groupe Troisième Dakar · Paroisse Saint-Pierre ». */
  groupeLibelle: string;
  /** Nom de l'unité de chaque branche : « Troupe Troisième Dakar ». */
  unitesNoms: NomsUnites;
  /** Renomme le groupe ou change sa paroisse ; les unités suivent le nom du groupe. Inscrit au journal. */
  setGroupe: (g: Groupe) => void;
  log: (...entries: JournalInput[]) => void;
  /** Le téléphone n'arrive plus à enregistrer (mémoire pleine, navigation privée…). */
  storageErr: boolean;
  offline: boolean;
  syncErr: boolean;
  pending: number;
  toast: Toast | null;
  sheet: string | null;
  /** Épreuves effectives de chaque branche, adaptations de l'unité comprises. */
  steps: StepsByBranch;
  /** Référentiel publié de chaque branche et son numéro de version. */
  refSteps: RefSteps;
  refVersion: Record<BranchCode, number>;
  enter: (role: Role) => void;
  /** Ouvre la session d'un compte authentifié par le serveur. */
  connecter: (moi: Moi) => void;
  logout: () => void;
  setLastTab: (tab: string) => void;
  showToast: (msg: string, undo?: () => void) => void;
  hideToast: () => void;
  addJeunes: (list: NewJeune[]) => void;
  updateJeune: (id: string, patch: Partial<Pick<Jeune, "etapeId" | "choix">>) => void;
  /** Adapte les épreuves de l'unité ; `resume` est inscrit au journal. */
  updateAdapt: (branche: BranchCode, fn: (a: UnitAdapt) => UnitAdapt, resume?: string) => void;
  validate: (j: Jeune, entries: ValidationEntry[], date: string) => void;
  /** Enregistre la décision de la cour d'honneur ; une étape reconnue fait passer le jeune à la suivante. */
  reconnaitre: (j: Jeune, input: CourInput) => void;
  openCancelSheet: (validationId: string) => void;
  closeSheet: () => void;
  cancelValidation: (validationId: string) => void;
  tapSync: () => void;
  setDemo: (patch: Partial<DemoFlags>) => void;
  updateRef: (fn: (r: RefState) => RefState) => void;
  /** Modifie le brouillon de la branche (créé à partir de la version publiée). */
  editDraft: (branche: BranchCode, fn: (steps: Etape[]) => Etape[]) => void;
  publishDraft: (branche: BranchCode) => void;
  discardDraft: (branche: BranchCode) => void;
}

// v8 : rôle « responsable progression », louveteaux de démo, groupe et paroisse, unités
// nommées d'après le groupe. Les données de démo antérieures ne sont pas reprises.
const KEY = "carnet-indlela-v8";

const initialRef = (): RefState => ({ published: {}, draft: {}, routeCreated: false });

const initial = (): Persisted => {
  // Hors démo, le téléphone part vide : les données viendront du serveur.
  const vals = DEMO ? seedValidations() : [];
  const backup = new Date();
  backup.setHours(3, 0, 0, 0);
  return {
  role: null,
  moi: null,
  groupe: DEMO ? GROUPE_DEMO : GROUPE_VIDE,
  lastTab: null,
  jeunes: DEMO ? seedJeunes() : [],
  vals,
  recons: [],
  comptes: DEMO ? SEED_COMPTES : [],
  unites: SEED_UNITES,
  journal: DEMO ? seedJournal(vals) : [],
  lastBackup: backup.toISOString(),
  simOffline: false,
  demo: { emptyUnit: false, syncFails: true },
  ref: initialRef(),
  adapts: {},
  };
};

/** Nom inscrit au journal et sur les validations : le compte connecté, ou le personnage de démo. */
const nomDe = (s: Persisted): string => s.moi?.nom ?? (s.role ? DEMO_USERS[s.role].nom : "");

/** Fiche de compte du connecté, en attendant que la liste des comptes vienne du serveur. */
const compteDe = (moi: Moi): Compte => ({
  id: moi.id,
  nom: moi.nom,
  identifiant: moi.identifiant,
  role: moi.role,
  actif: true,
  unites: [],
  enfants: [],
  deuxFA: exigeDeuxFA(moi.role),
  derniereConnexion: null,
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
  const [storageErr, setStorageErr] = useState(false);
  const failedOnce = useRef(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    // Sans cette demande, le navigateur peut effacer les saisies en attente quand la mémoire manque.
    navigator.storage?.persist?.().catch(() => undefined);
    get<Persisted>(KEY)
      .then((saved) => {
        if (!alive || !saved) return;
        const base = initial();
        setP({ ...base, ...saved, journal: saved.journal ?? base.journal, ref: { ...initialRef(), ...saved.ref } });
      })
      .catch(() => alive && setStorageErr(true))
      .finally(() => alive && setHydrated(true));
    setNetOnline(navigator.onLine);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    set(KEY, p)
      .then(() => setStorageErr(false))
      .catch(() => setStorageErr(true));
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

  const userName = nomDe(p);
  const findJeuneById = useCallback((id: string | undefined | null) => findJeune(p.jeunes, id), [p.jeunes]);

  /** Le journal n'enregistre que ce que le serveur a reçu : une saisie hors connexion y entre à la synchronisation. */
  const entries = useCallback((user: string, list: JournalInput[]): JournalEntry[] => {
    const at = new Date().toISOString();
    return list.map((e) => ({ ...e, id: uuid(), at, user }));
  }, []);
  const log = useCallback(
    (...list: JournalInput[]) => setP((s) => ({ ...s, journal: [...entries(nomDe(s), list), ...s.journal] })),
    [entries],
  );

  const flush = useCallback(
    (n: number) => {
      const now = new Date().toISOString();
      setP((s) => {
        const sent = s.vals.filter((v) => v.pending && !v.annuleeLe);
        const logged = sent.flatMap((v) => {
          const j = findJeune(s.jeunes, v.jeuneId);
          return j ? [validationEntry(stepsRef.current, j, v)] : [];
        });
        const reconsLogged = s.recons.filter((r) => r.pending).flatMap((r) => {
          const j = findJeune(s.jeunes, r.jeuneId);
          return j ? [reconEntry(stepsRef.current, j, r)] : [];
        });
        return {
          ...s,
          simOffline: false,
          vals: s.vals.map((v) => (v.pending ? { ...v, pending: false, updatedAt: now } : v)),
          recons: s.recons.map((r) => (r.pending ? { ...r, pending: false } : r)),
          journal: [...entries(nomDe(s), [...logged, ...reconsLogged]), ...s.journal],
        };
      });
      setSyncErr(false);
      showToast(n ? `${n} ${plural(n, "validation synchronisée", "validations synchronisées")}` : "De nouveau en ligne");
    },
    [showToast, entries],
  );

  // Retour du vrai réseau : la file part seule, sauf si la démo force le mode hors connexion.
  const pRef = useRef(p);
  const stepsRef = useRef<StepsByBranch>(effectiveSteps(BASE_STEPS, {}));
  pRef.current = p;
  useEffect(() => {
    const on = () => {
      setNetOnline(true);
      if (!pRef.current.simOffline) {
        const n = pendingCount(pRef.current.vals) + pRef.current.recons.filter((r) => r.pending).length;
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
  const pending = pendingCount(p.vals) + p.recons.filter((r) => r.pending).length;
  const refSteps = useMemo<RefSteps>(
    () => ({
      troupe: p.ref.published.troupe?.steps ?? BASE_STEPS.troupe,
      meute: p.ref.published.meute?.steps ?? BASE_STEPS.meute,
      route: p.ref.published.route?.steps ?? BASE_STEPS.route,
    }),
    [p.ref.published],
  );
  const refVersion = useMemo<Record<BranchCode, number>>(
    () => ({
      troupe: p.ref.published.troupe?.version ?? BASE_VERSION.troupe,
      meute: p.ref.published.meute?.version ?? BASE_VERSION.meute,
      route: p.ref.published.route?.version ?? BASE_VERSION.route,
    }),
    [p.ref.published],
  );
  const steps = useMemo(() => effectiveSteps(refSteps, p.adapts), [refSteps, p.adapts]);
  const unitesNoms = useMemo(() => nomsUnites(p.groupe), [p.groupe]);
  stepsRef.current = steps;

  const tapSync = useCallback(() => {
    if (!DEMO && !offline && !syncErr) {
      if (pending) flush(pending);
      else showToast("Tout est envoyé.");
      return;
    }
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
      const add: Jeune[] = list.map((x) => ({ ...x, id: uuid(), dateEntree: today, choix: [], specs: [], statut: "actif" }));
      const n = add.length;
      const sansConsentement = add.filter((j) => !j.consentementLe).length;
      setP((s) => ({
        ...s,
        jeunes: [...s.jeunes, ...add],
        journal: [
          ...entries(nomDe(s), [
            {
              action: "creation",
              table: "jeunes",
              ligne: n === 1 ? add[0].id : `${n} fiches`,
              resume: n === 1 ? `Fiche de ${fullName(add[0])} créée` : `${n} fiches créées dans ${nomsUnites(s.groupe)[add[0].branche]}`,
              apres: { fiches: n, sans_consentement: sansConsentement },
            },
          ]),
          ...s.journal,
        ],
      }));
      showToast(n === 1 ? `${add[0].prenom} ${add[0].nom} est dans l'unité` : `${n} jeunes ajoutés à l'unité`);
    },
    [showToast, entries],
  );

  const validate = useCallback(
    (j: Jeune, items: ValidationEntry[], date: string) => {
      const batch = uuid();
      const stamp = new Date().toISOString();
      // Une preuve déjà validée ne l'est pas deux fois (double touche, deux cadres).
      const fresh = items.filter((e) => !isValidated(critStatus(pRef.current.vals, j.id, e.preuveId)));
      if (!fresh.length) return;
      const step = steps[j.branche].find((x) => x.id === j.etapeId);
      const add: Validation[] = fresh.map((e) => ({
        id: uuid(),
        jeuneId: j.id,
        etapeId: j.etapeId,
        domaineId: domaineOfPreuve(step, e.preuveId)?.id ?? "",
        preuveId: e.preuveId,
        date,
        validePar: userName,
        commentaire: e.commentaire || undefined,
        pending: offline,
        annuleeLe: null,
        batch,
        refVersion: refVersion[j.branche],
        updatedAt: stamp,
      }));
      // pRef suit l'état rendu : on l'avance tout de suite pour qu'une seconde touche voie ces lignes.
      pRef.current = { ...pRef.current, vals: [...pRef.current.vals, ...add] };
      setP((s) => ({
        ...s,
        vals: [...s.vals, ...add],
        journal: offline ? s.journal : [...entries(userName, add.map((v) => validationEntry(steps, j, v))), ...s.journal],
      }));
      const n = add.length;
      showToast(`${n} ${plural(n, "preuve validée", "preuves validées")} pour ${j.prenom}${offline ? " · en attente de réseau" : ""}`, () => {
        // Une saisie restée sur le téléphone s'efface ; une saisie déjà envoyée s'annule au journal.
        const today = toISODate(new Date());
        const now = new Date().toISOString();
        setP((s) => {
          const synced = s.vals.filter((v) => v.batch === batch && !v.pending && !v.annuleeLe);
          return {
            ...s,
            vals: s.vals.flatMap((v) => (v.batch !== batch ? [v] : v.pending ? [] : [{ ...v, annuleeLe: today, annuleePar: userName, updatedAt: now }])),
            journal: synced.length ? [...entries(userName, synced.map((v) => cancelEntry(steps, j, v, today))), ...s.journal] : s.journal,
          };
        });
        showToast("Validation retirée");
      });
      if (storageErr) showToast("Attention : ce téléphone n'enregistre plus les saisies. Retrouvez du réseau avant de fermer l'application.");
    },
    [offline, showToast, steps, refVersion, storageErr, userName, entries],
  );

  const reconnaitre = useCallback(
    (j: Jeune, input: CourInput) => {
      const recon: Reconnaissance = {
        id: uuid(),
        jeuneId: j.id,
        etapeId: j.etapeId,
        date: input.date,
        decision: input.decision,
        observations: input.observations.trim().slice(0, 1000),
        ct: input.ct.trim().slice(0, 80),
        ...(input.presents !== undefined ? { presents: input.presents, voixPour: input.voixPour } : {}),
        pending: offline,
      };
      const branche = steps[j.branche];
      const current = branche.find((x) => x.id === j.etapeId);
      const next = input.decision === "reconnue" ? etapeSuivante(branche, j.etapeId) : undefined;
      setP((s) => ({
        ...s,
        recons: [...s.recons, recon],
        jeunes: next ? s.jeunes.map((x) => (x.id === j.id ? { ...x, etapeId: next.id } : x)) : s.jeunes,
        journal: offline ? s.journal : [...entries(userName, [reconEntry(steps, j, recon)]), ...s.journal],
      }));
      const msg =
        input.decision === "ajournee"
          ? `${j.prenom} : étape ${current?.name} ajournée`
          : `${j.prenom} : étape ${current?.name} reconnue${next ? ` · passe ${next.name}` : ""}`;
      showToast(msg, () => {
        setP((s) => ({
          ...s,
          recons: s.recons.filter((r) => r.id !== recon.id),
          jeunes: next ? s.jeunes.map((x) => (x.id === j.id ? { ...x, etapeId: j.etapeId } : x)) : s.jeunes,
        }));
        showToast("Décision retirée");
      });
    },
    [offline, showToast, steps, userName, entries],
  );

  const cancelValidation = useCallback(
    (id: string) => {
      const today = toISODate(new Date());
      const now = new Date().toISOString();
      setSheet(null);
      setP((s) => {
        const v = s.vals.find((x) => x.id === id);
        const j = v && findJeune(s.jeunes, v.jeuneId);
        return {
          ...s,
          vals: s.vals.map((x) => (x.id === id ? { ...x, annuleeLe: today, annuleePar: userName, updatedAt: now } : x)),
          journal: v && j && !v.pending ? [...entries(userName, [cancelEntry(stepsRef.current, j, v, today)]), ...s.journal] : s.journal,
        };
      });
      showToast("Validation annulée · gardée dans le journal");
    },
    [showToast, userName, entries],
  );

  const value = useMemo<Store>(
    () => ({
      ...p,
      hydrated,
      storageErr,
      userName,
      compte: p.moi ? (p.comptes.find((c) => c.id === p.moi!.id) ?? compteDe(p.moi)) : p.role ? p.comptes.find((c) => c.id === DEMO_USERS[p.role!].compte) : undefined,
      findJeune: findJeuneById,
      setJeunes: (fn) => setP((s) => ({ ...s, jeunes: fn(s.jeunes) })),
      setComptes: (fn) => setP((s) => ({ ...s, comptes: fn(s.comptes) })),
      setUnites: (fn) => setP((s) => ({ ...s, unites: fn(s.unites) })),
      setLastBackup: (iso) => setP((s) => ({ ...s, lastBackup: iso })),
      groupeNom: nomGroupe(p.groupe),
      groupeLibelle: libelleGroupe(p.groupe),
      unitesNoms,
      setGroupe: (input) =>
        setP((s) => {
          const g = nettoyerGroupe(input);
          if (!g.nom || (g.nom === s.groupe.nom && g.paroisse === s.groupe.paroisse)) return s;
          const change: JournalInput = {
            action: "modification",
            table: "groupes",
            ligne: "groupe",
            resume: `Groupe : ${libelleGroupe(s.groupe)} → ${libelleGroupe(g)}`,
            avant: { nom: s.groupe.nom, paroisse: s.groupe.paroisse },
            apres: { nom: g.nom, paroisse: g.paroisse },
          };
          return { ...s, groupe: g, unites: renommerUnites(s.unites, s.groupe, g), journal: [...entries(userName, [change]), ...s.journal] };
        }),
      log,
      offline,
      syncErr,
      pending,
      toast,
      sheet,
      steps,
      refSteps,
      refVersion,
      enter: (role) => setP((s) => ({ ...s, role, moi: null, lastTab: ROLE_HOME[role] })),
      connecter: (moi) => setP((s) => ({ ...s, role: moi.role, moi, groupe: moi.groupe, lastTab: ROLE_HOME[moi.role] })),
      logout: () => {
        setSheet(null);
        hideToast();
        void deconnecter();
        if (DEMO) {
          setP((s) => ({ ...s, role: null, moi: null, lastTab: null }));
          return;
        }
        // Hors démo : aucune donnée de mineur ne reste sur un téléphone partagé.
        del(KEY).catch(() => setStorageErr(true));
        setP(initial());
      },
      setLastTab: (tab) => setP((s) => (s.lastTab === tab ? s : { ...s, lastTab: tab })),
      showToast,
      hideToast,
      addJeunes,
      updateJeune: (id, patch) =>
        setP((s) => {
          const before = findJeune(s.jeunes, id);
          const etapeChange = before && patch.etapeId && patch.etapeId !== before.etapeId;
          const name = (eid: string) => steps[before?.branche ?? "troupe"].find((x) => x.id === eid)?.name ?? eid;
          return {
            ...s,
            jeunes: s.jeunes.map((j) => (j.id === id ? { ...j, ...patch } : j)),
            journal: etapeChange
              ? [
                  ...entries(userName, [
                    {
                      action: "modification",
                      table: "jeunes",
                      ligne: id,
                      resume: `Étape de ${fullName(before)} corrigée : ${name(before.etapeId)} → ${name(patch.etapeId!)}`,
                      avant: { etape: name(before.etapeId) },
                      apres: { etape: name(patch.etapeId!) },
                    },
                  ]),
                  ...s.journal,
                ]
              : s.journal,
          };
        }),
      updateAdapt: (branche, fn, resume) =>
        setP((s) => ({
          ...s,
          adapts: { ...s.adapts, [branche]: fn(s.adapts[branche] ?? EMPTY_ADAPT) },
          journal: resume ? [...entries(userName, [{ action: "modification", table: "adaptations_unite", ligne: branche, resume }]), ...s.journal] : s.journal,
        })),
      validate,
      reconnaitre,
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
      editDraft: (b, fn) =>
        setP((s) => ({ ...s, ref: { ...s.ref, draft: { ...s.ref.draft, [b]: fn(s.ref.draft[b] ?? s.ref.published[b]?.steps ?? BASE_STEPS[b]) } } })),
      publishDraft: (b) =>
        setP((s) => {
          const draft = s.ref.draft[b];
          if (!draft) return s;
          const version = (s.ref.published[b]?.version ?? BASE_VERSION[b]) + 1;
          const { [b]: _published, ...otherDrafts } = s.ref.draft;
          const publication: JournalInput = {
            action: "publication",
            table: "referentiels",
            ligne: `${b}-v${version}`,
            resume: `${REF_TITLES[b]} · version ${version} publiée`,
            avant: { version: version - 1 },
            apres: { version, actif: true },
          };
          return {
            ...s,
            ref: { ...s.ref, published: { ...s.ref.published, [b]: { version, steps: draft } }, draft: otherDrafts },
            journal: [...entries(userName, [publication]), ...s.journal],
          };
        }),
      discardDraft: (b) =>
        setP((s) => {
          const { [b]: _dropped, ...otherDrafts } = s.ref.draft;
          return { ...s, ref: { ...s.ref, draft: otherDrafts } };
        }),
    }),
    [p, hydrated, storageErr, offline, syncErr, pending, toast, sheet, steps, refSteps, refVersion, unitesNoms, userName, findJeuneById, entries, log, showToast, hideToast, addJeunes, validate, reconnaitre, cancelValidation, tapSync],
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

/** Jeunes actifs de la troupe : une fiche n'est active qu'avec le consentement des parents. */
export function useTroupe(): Jeune[] {
  const { jeunes } = useStore();
  return useMemo(() => jeunes.filter((j) => j.branche === "troupe" && j.statut === "actif" && !!j.consentementLe), [jeunes]);
}

/** Fiches de la troupe en attente du consentement des parents. */
export function useTroupeSansConsentement(): Jeune[] {
  const { jeunes } = useStore();
  return useMemo(() => jeunes.filter((j) => j.branche === "troupe" && j.statut === "actif" && !j.consentementLe), [jeunes]);
}

function validationEntry(steps: StepsByBranch, j: Jeune, v: Validation): JournalInput {
  const label = preuveLabel(steps[j.branche], v.etapeId, v.preuveId);
  return {
    action: "validation",
    table: "validations",
    ligne: v.id,
    resume: `« ${label} » validé pour ${fullName(j)}`,
    apres: { preuve: label, date: v.date, valide_par: v.validePar, commentaire: v.commentaire ?? null, version: v.refVersion ?? null },
  };
}

function cancelEntry(steps: StepsByBranch, j: Jeune, v: Validation, today: string): JournalInput {
  const label = preuveLabel(steps[j.branche], v.etapeId, v.preuveId);
  return {
    action: "annulation",
    table: "validations",
    ligne: v.id,
    resume: `Validation de « ${label} » annulée pour ${fullName(j)}`,
    avant: { annulee_le: null },
    apres: { annulee_le: today },
  };
}

function reconEntry(steps: StepsByBranch, j: Jeune, r: Reconnaissance): JournalInput {
  const etape = steps[j.branche].find((x) => x.id === r.etapeId)?.name ?? r.etapeId;
  return {
    action: "creation",
    table: "cours_honneur",
    ligne: r.id,
    resume: `Cour d'honneur : étape ${etape} ${r.decision === "reconnue" ? "reconnue" : "ajournée"} pour ${fullName(j)}`,
    apres: { etape, decision: r.decision, date: r.date, ct: r.ct, presents: r.presents ?? null, voix_pour: r.voixPour ?? null },
  };
}
