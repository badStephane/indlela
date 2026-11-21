"use client";

// Photos de preuve sur le téléphone, et leur envoi. Une photo prise pendant la validation est réduite
// et gardée tout de suite (même sans réseau) ; elle est jointe aux validations à la confirmation,
// puis part dès que sa validation est sur le serveur. Hors démo, la déconnexion efface tout.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEMO } from "./demo";
import { supabase } from "./supabase";
import { useStore } from "./store";
import { uuid } from "./mock";
import { plural } from "./progress";
import { planPhotos, type PhotoPreuve } from "./photos";
import {
  ecrireListe,
  ecrireProprietaire,
  fichiersOrphelins,
  garderFichier,
  lireFichier,
  lireListe,
  lireProprietaire,
  oublierFichier,
  reduirePhoto,
  toutEffacer,
} from "./photosAppareil";
import { envoyerPhoto } from "./photosServeur";

/** Après un échec passager (réseau), nouvel essai. */
const NOUVEL_ESSAI_MS = 30_000;

export interface LienPhotos {
  validationId: string;
  jeuneId: string;
  photoIds: string[];
}

interface Photos {
  /** Photos jointes à une validation, pas encore envoyées. */
  enAttente: number;
  /** Augmente à chaque photo reçue par le serveur : les vues relisent leurs photos. */
  version: number;
  preparer: (source: File) => Promise<{ ok: true; id: string } | { ok: false; erreur: string }>;
  abandonner: (id: string) => void;
  attacher: (liens: LienPhotos[]) => void;
  /** Photos d'une validation encore sur le téléphone. */
  locales: (validationId: string) => PhotoPreuve[];
  fichier: (id: string) => Promise<Blob | undefined>;
}

const Ctx = createContext<Photos | null>(null);

export function PhotosProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const [liste, setListe] = useState<PhotoPreuve[]>([]);
  const [pret, setPret] = useState(false);
  const [version, setVersion] = useState(0);
  const [relance, setRelance] = useState(0);
  const tailles = useRef(new Map<string, number>());
  const enCours = useRef(false);
  const notifier = useRef(store.showToast);
  notifier.current = store.showToast;

  // Relecture du téléphone ; les fichiers d'une photo abandonnée (page quittée) sont effacés.
  useEffect(() => {
    let vivant = true;
    lireListe()
      .then(async (l) => {
        if (!vivant) return;
        setListe(l);
        const orphelins = await fichiersOrphelins(new Set(l.map((p) => p.id)));
        await Promise.all(orphelins.map(oublierFichier));
      })
      .catch(() => undefined)
      .finally(() => vivant && setPret(true));
    return () => {
      vivant = false;
    };
  }, []);

  const changer = useCallback((fn: (l: PhotoPreuve[]) => PhotoPreuve[]) => {
    setListe((l) => {
      const suivante = fn(l);
      ecrireListe(suivante).catch(() => notifier.current("Ce téléphone n'enregistre plus les photos : retrouvez du réseau avant de fermer l'application."));
      return suivante;
    });
  }, []);

  // Déconnexion hors démo : aucune photo ne reste sur un téléphone partagé.
  useEffect(() => {
    if (!pret || !store.hydrated || store.role || DEMO) return;
    toutEffacer().catch(() => undefined);
    setListe([]);
  }, [pret, store.hydrated, store.role]);

  const serveurActif = !!supabase && !!store.moi;
  const compte = store.moi?.id ?? (store.role ? "demo" : null);

  // Un autre compte se connecte sur ce téléphone : les photos en attente de l'ancien ne partent pas
  // sous son nom ; elles sont effacées (l'ancien compte a été prévenu en quittant, s'il a quitté).
  useEffect(() => {
    if (!pret || !store.hydrated || !compte) return;
    let vivant = true;
    lireProprietaire()
      .then((ancien) => {
        if (!vivant || !ancien || ancien === compte) return;
        toutEffacer().catch(() => undefined);
        setListe([]);
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, [pret, store.hydrated, compte]);

  // Envoi : les photos dont la validation est sur le serveur partent une à une.
  useEffect(() => {
    if (!pret || enCours.current) return;
    const { aEnvoyer, orphelines } = planPhotos(liste, store.synchro.vals, new Set(store.vals.map((v) => v.id)));
    if (orphelines.length) {
      const ids = new Set(orphelines.map((p) => p.id));
      orphelines.forEach((p) => void oublierFichier(p.id));
      changer((l) => l.filter((p) => !ids.has(p.id)));
      return;
    }
    if (!serveurActif || store.offline || !aEnvoyer.length) return;
    enCours.current = true;
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      let envoyees = 0;
      for (const p of aEnvoyer) {
        const fichier = await lireFichier(p.id);
        const r = fichier ? await envoyerPhoto(p, fichier) : ({ ok: false, definitif: true, erreur: "fichier perdu sur le téléphone." } as const);
        if (r.ok) {
          envoyees++;
          changer((l) => l.map((x) => (x.id === p.id ? { ...x, envoyee: true } : x)));
          await oublierFichier(p.id);
        } else if (r.definitif) {
          changer((l) => l.filter((x) => x.id !== p.id));
          await oublierFichier(p.id);
          notifier.current(`Une photo n'a pas été gardée : ${r.erreur}`);
        } else {
          minuterie = setTimeout(() => setRelance((n) => n + 1), NOUVEL_ESSAI_MS);
          break;
        }
      }
      if (envoyees) {
        setVersion((v) => v + 1);
        notifier.current(`${envoyees} ${plural(envoyees, "photo envoyée", "photos envoyées")}`);
      }
    })().finally(() => {
      enCours.current = false;
    });
    return () => clearTimeout(minuterie);
  }, [pret, liste, store.synchro.vals, store.vals, serveurActif, store.offline, relance, changer]);

  const preparer = useCallback<Photos["preparer"]>(async (source) => {
    const r = await reduirePhoto(source);
    if (!r.ok) return r;
    const id = uuid();
    try {
      await garderFichier(id, r.fichier);
    } catch {
      return { ok: false, erreur: "Le téléphone n'a plus de place pour garder la photo." };
    }
    tailles.current.set(id, r.fichier.size);
    return { ok: true, id };
  }, []);

  const abandonner = useCallback((id: string) => {
    tailles.current.delete(id);
    void oublierFichier(id);
  }, []);

  const attacher = useCallback(
    (liens: LienPhotos[]) => {
      const ajout = liens.flatMap((l) =>
        l.photoIds.map((id): PhotoPreuve => ({ id, validationId: l.validationId, jeuneId: l.jeuneId, taille: tailles.current.get(id) ?? 1, envoyee: false })),
      );
      if (!ajout.length) return;
      if (compte) ecrireProprietaire(compte).catch(() => undefined);
      changer((l) => [...l, ...ajout]);
    },
    [changer, compte],
  );

  const value = useMemo<Photos>(
    () => ({
      enAttente: liste.filter((p) => !p.envoyee).length,
      version,
      preparer,
      abandonner,
      attacher,
      locales: (validationId) => liste.filter((p) => p.validationId === validationId && !p.envoyee),
      fichier: lireFichier,
    }),
    [liste, version, preparer, abandonner, attacher],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePhotos(): Photos {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePhotos hors de PhotosProvider");
  return v;
}
