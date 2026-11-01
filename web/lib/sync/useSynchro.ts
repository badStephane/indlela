"use client";

// Quand synchroniser : à l'ouverture de la session, au retour du réseau, peu après chaque saisie,
// au retour sur l'application, et à la demande (bouton de synchronisation).
// Une synchronisation envoie d'abord ce qui attend, puis relit le serveur et fusionne.

import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { supabase } from "../supabase";
import type { Unite } from "../admin";
import type { Moi } from "../session";
import { toISODate } from "../dates";
import { plural } from "../progress";
import { aEnvoyer, fusionner, marquerEnvoye, nbAEnvoyer, type Etat, type Synchro } from "./plan";
import { envoyer, lire } from "./serveur";
import { uuid } from "../mock";
import { apresEnvoiRef, fusionnerRef, refAEnvoyer, type EtatRef } from "./referentiels";
import { envoyerRef, lireRef, nbRefAEnvoyer } from "./serveurRef";

/** Laisse finir une série de touches (plusieurs preuves cochées) avant d'envoyer. */
const DELAI_ENVOI_MS = 1500;

export interface EtatSynchronisable extends Etat, EtatRef {
  synchro: Synchro;
  moi: Moi | null;
  unites: Unite[];
}

interface Options<T extends EtatSynchronisable> {
  etatRef: MutableRefObject<T>;
  setEtat: Dispatch<SetStateAction<T>>;
  /** État relu depuis le téléphone : avant, on ne sait pas encore qui est connecté. */
  pret: boolean;
  enLigne: boolean;
  nAEnvoyer: number;
  signataire: string;
  /** null : la synchronisation a réussi. */
  onEtat: (erreur: string | null) => void;
  notifier: (message: string) => void;
}

export function useSynchro<T extends EtatSynchronisable>(o: Options<T>): (manuel?: boolean) => Promise<void> {
  const opts = useRef(o);
  opts.current = o;
  const enCours = useRef(false);
  const encore = useRef(false);
  const relancer = useRef<() => void>(() => undefined);

  const synchroniser = useCallback(async (manuel = false) => {
    const { etatRef, setEtat, signataire, onEtat, notifier } = opts.current;
    const depart = etatRef.current;
    if (!supabase || !depart.moi) return;
    if (enCours.current) {
      encore.current = true;
      return;
    }
    enCours.current = true;
    try {
      const plan = aEnvoyer(depart, depart.synchro);
      const n = nbAEnvoyer(plan);
      if (n > 0) {
        const bilan = await envoyer(plan, { groupeId: depart.moi.groupeId, unites: depart.unites, signataire });
        setEtat((s) => marquerEnvoye(s, bilan.envoye, bilan.refusees, toISODate(new Date())));
        const k = bilan.refusees.length;
        if (k) notifier(`${k} ${plural(k, "preuve était déjà validée", "preuves étaient déjà validées")} par un autre cadre : saisie retirée.`);
        if (bilan.erreur) {
          onEtat(bilan.erreur);
          notifier(bilan.erreur);
          return;
        }
      }
      // Référentiels et adaptations : une erreur n'empêche pas de relire le serveur, qui la corrige souvent.
      const planRef = refAEnvoyer(depart, depart.unites, uuid);
      const nRef = nbRefAEnvoyer(planRef);
      const envoiRef = nRef > 0 ? await envoyerRef(planRef, depart.moi.groupeId) : null;
      if (envoiRef?.ok) setEtat((s) => ({ ...s, refServeur: apresEnvoiRef(s.refServeur, planRef) }));
      if (envoiRef && !envoiRef.ok) notifier(envoiRef.erreur);

      const [lu, luRef] = await Promise.all([lire(etatRef.current.unites), lireRef()]);
      if (!lu.ok) {
        onEtat(lu.erreur);
        if (manuel) notifier(lu.erreur);
        return;
      }
      setEtat((s) => ({ ...s, ...fusionner(s, lu.etat, s.synchro), ...(luRef.ok ? fusionnerRef(s, luRef, s.unites) : {}) }));
      onEtat(envoiRef && !envoiRef.ok ? envoiRef.erreur : null);
      const total = n + (envoiRef?.ok ? nRef : 0);
      if (total > 0) notifier(`${total} ${plural(total, "saisie envoyée", "saisies envoyées")} au serveur`);
      else if (manuel) notifier("Tout est à jour.");
    } finally {
      enCours.current = false;
      if (encore.current) {
        encore.current = false;
        relancer.current();
      }
    }
  }, []);
  relancer.current = () => void synchroniser();

  const actif = !!supabase && !!o.etatRef.current.moi;
  const moiId = o.etatRef.current.moi?.id;

  // Ouverture de la session, ou retour du réseau : on envoie et on relit.
  useEffect(() => {
    if (o.pret && actif && o.enLigne) void synchroniser();
  }, [o.pret, actif, o.enLigne, moiId, synchroniser]);

  // Une saisie attend : elle part peu après, sans action du cadre.
  useEffect(() => {
    if (!(o.pret && actif && o.enLigne && o.nAEnvoyer > 0)) return;
    const t = setTimeout(() => void synchroniser(), DELAI_ENVOI_MS);
    return () => clearTimeout(t);
  }, [o.pret, actif, o.enLigne, o.nAEnvoyer, synchroniser]);

  // Retour sur l'application : on récupère ce que les autres cadres ont saisi entre-temps.
  useEffect(() => {
    if (!actif) return;
    const auRetour = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void synchroniser();
    };
    document.addEventListener("visibilitychange", auRetour);
    return () => document.removeEventListener("visibilitychange", auRetour);
  }, [actif, synchroniser]);

  return synchroniser;
}
