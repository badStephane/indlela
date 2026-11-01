"use client";

// Comptes du groupe, côté serveur. Ce qui demande la clé secrète (créer l'accès, mot de passe,
// second facteur) passe par la fonction « comptes » ; le reste s'écrit dans la base, sous la RLS.

import { supabase } from "./supabase";
import { versComptes, versUnites, type LigneAffectation, type LigneLien, type LigneUnite, type LigneUtilisateur } from "./comptesLignes";
import type { Compte, JournalEntry, Unite } from "./admin";
import type { Moi } from "./session";
import type { Role } from "./store";

export type Resultat<T> = { ok: true; data: T } | { ok: false; erreur: string };

const HORS_LIGNE = "Le serveur ne répond pas. Vérifiez la connexion Internet, puis réessayez.";
const NON_CONFIGURE: Resultat<never> = { ok: false, erreur: "Le serveur n'est pas configuré." };

async function fonction<T>(corps: Record<string, unknown>): Promise<Resultat<T>> {
  if (!supabase) return NON_CONFIGURE;
  try {
    const { data, error } = await supabase.functions.invoke("comptes", { body: corps });
    if (!error) return data as Resultat<T>;
    // Réponse d'erreur de la fonction : son message est déjà rédigé pour l'admin.
    const reponse = (error as { context?: Response }).context;
    const corpsErreur = reponse && typeof reponse.json === "function" ? await reponse.json().catch(() => null) : null;
    return { ok: false, erreur: corpsErreur?.erreur ?? HORS_LIGNE };
  } catch {
    return { ok: false, erreur: HORS_LIGNE };
  }
}

const echec = (message: string): Resultat<never> => ({ ok: false, erreur: message });

export async function chargerComptes(): Promise<Resultat<{ comptes: Compte[]; unites: Unite[] }>> {
  if (!supabase) return NON_CONFIGURE;
  try {
    const [u, a, l, un] = await Promise.all([
      supabase.from("utilisateurs").select("id, nom, identifiant, role, actif, derniere_connexion").order("nom"),
      supabase.from("affectations_cadres").select("utilisateur_id, unite_id"),
      supabase.from("liens_parent").select("utilisateur_id, jeune_id"),
      supabase.from("unites").select("id, nom, branche, annee, responsable_id").order("branche"),
    ]);
    if (u.error || a.error || l.error || un.error) return echec("La liste des comptes n'a pas pu être chargée. Réessayez.");
    return {
      ok: true,
      data: {
        comptes: versComptes(u.data as LigneUtilisateur[], a.data as LigneAffectation[], l.data as LigneLien[]),
        unites: versUnites(un.data as LigneUnite[]),
      },
    };
  } catch {
    return echec(HORS_LIGNE);
  }
}

export const creerCompte = (input: { nom: string; identifiant: string; role: Role; motDePasse: string }) =>
  fonction<{ id: string; identifiant: string }>({ action: "creer", ...input });

export const changerMotDePasse = (id: string, motDePasse: string) => fonction<{ id: string }>({ action: "mot-de-passe", id, motDePasse });

export const retirerSecondFacteur = (id: string) => fonction<{ id: string; retires: number }>({ action: "retirer-second-facteur", id });

/** Écrit une modification et sa trace au journal (le serveur signe et horodate la trace). */
async function ecrire(moi: Moi, operation: PromiseLike<{ error: unknown }>, trace: Omit<JournalEntry, "id" | "at" | "user">): Promise<Resultat<null>> {
  if (!supabase) return NON_CONFIGURE;
  try {
    const { error } = await operation;
    if (error) return echec("La modification a été refusée par le serveur.");
    const j = await supabase.from("journal").insert({
      groupe_id: moi.groupeId,
      utilisateur_nom: moi.nom,
      action: trace.action,
      table_name: trace.table,
      ligne: trace.ligne,
      resume: trace.resume,
      avant: trace.avant ?? null,
      apres: trace.apres ?? null,
    });
    // La modification est faite ; une trace manquante ne doit pas la faire croire refusée.
    if (j.error) console.error("journal", j.error.message);
    return { ok: true, data: null };
  } catch {
    return echec(HORS_LIGNE);
  }
}

export function changerActif(moi: Moi, c: Compte, actif: boolean): Promise<Resultat<null>> {
  if (!supabase) return Promise.resolve(NON_CONFIGURE);
  return ecrire(moi, supabase.from("utilisateurs").update({ actif }).eq("id", c.id), {
    action: "modification",
    table: "utilisateurs",
    ligne: c.id,
    resume: `Compte de ${c.nom} ${actif ? "réactivé" : "désactivé"}`,
    avant: { actif: !actif },
    apres: { actif },
  });
}

export function affecter(moi: Moi, c: Compte, u: Unite, on: boolean): Promise<Resultat<null>> {
  if (!supabase) return Promise.resolve(NON_CONFIGURE);
  const table = supabase.from("affectations_cadres");
  const operation = on ? table.insert({ utilisateur_id: c.id, unite_id: u.id }) : table.delete().eq("utilisateur_id", c.id).eq("unite_id", u.id);
  return ecrire(moi, operation, {
    action: "modification",
    table: "affectations_cadres",
    ligne: c.id,
    resume: `${c.nom} ${on ? "affecté à" : "retiré de"} ${u.nom}`,
    apres: { unite: u.nom, affecte: on },
  });
}

export function creerUnite(moi: Moi, u: Omit<Unite, "id" | "responsable">): Promise<Resultat<null>> {
  if (!supabase) return Promise.resolve(NON_CONFIGURE);
  return ecrire(moi, supabase.from("unites").insert({ groupe_id: moi.groupeId, nom: u.nom, branche: u.branche, annee: u.annee }), {
    action: "creation",
    table: "unites",
    ligne: u.nom,
    resume: `Unité ${u.nom} créée (${u.annee})`,
    apres: { nom: u.nom, branche: u.branche, annee: u.annee },
  });
}
