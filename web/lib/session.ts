"use client";

// Connexion réelle : identifiant et mot de passe, puis second facteur (TOTP) pour l'admin,
// le chef de groupe et le responsable progression. Sans lui, la base ne leur donne aucun droit.

import { supabase } from "./supabase";
import { codeTotp, emailDeConnexion, messageErreurAuth } from "./auth";
import { exigeDeuxFARoles, lireRoles } from "./roles";
import type { Groupe } from "./groupe";
import type { Unite } from "./admin";
import { versUnites, type LigneUnite } from "./comptesLignes";
import type { Role } from "./store";

/** Compte connecté, lu dans la table utilisateurs. */
export interface Moi {
  id: string;
  nom: string;
  identifiant: string;
  /** Rôles du compte ; l'espace ouvert (store.role) en fait partie. */
  roles: Role[];
  groupeId: string;
  groupe: Groupe;
  /** Unités confiées au compte (UUID), pour un cadre. */
  unites: string[];
  /** Fiches des enfants (UUID), pour un parent. */
  enfants: string[];
  /** Unités du groupe : traduisent les UUID ci-dessus en branches. */
  unitesGroupe: Unite[];
}

export type EtapeConnexion =
  | { etape: "ok"; moi: Moi }
  /** Premier passage : le compte associe son application d'authentification. */
  | { etape: "enrolement"; factorId: string; qr: string; secret: string }
  | { etape: "code"; factorId: string }
  | { etape: "erreur"; message: string };

const NOM_APPLICATION = "Indlela";

const erreur = (message: string): EtapeConnexion => ({ etape: "erreur", message });

async function abandonner(message: string): Promise<EtapeConnexion> {
  await supabase?.auth.signOut({ scope: "local" });
  return erreur(message);
}

interface Profil {
  id: string;
  nom: string;
  identifiant: string;
  roles: unknown;
  actif: boolean;
}

async function lireProfil(): Promise<Profil | null | "erreur"> {
  if (!supabase) return "erreur";
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return "erreur";
  const { data, error } = await supabase.from("utilisateurs").select("id, nom, identifiant, roles, actif").eq("id", u.user.id).maybeSingle<Profil>();
  return error ? "erreur" : data;
}

async function terminer(profil: Profil, roles: Role[]): Promise<EtapeConnexion> {
  if (!supabase) return erreur("Le serveur n'est pas configuré.");
  const { data, error } = await supabase.from("groupes").select("id, nom, paroisse").maybeSingle<Groupe & { id: string }>();
  if (error || !data) return abandonner("Le groupe de ce compte est introuvable. Adressez-vous à l'administrateur.");
  // La RLS ne renvoie que les affectations et liens du compte, et les unités de son groupe.
  const [a, l, un] = await Promise.all([
    supabase.from("affectations_cadres").select("unite_id").eq("utilisateur_id", profil.id),
    supabase.from("liens_parent").select("jeune_id").eq("utilisateur_id", profil.id),
    supabase.from("unites").select("id, nom, branche, annee, responsable_id"),
  ]);
  if (a.error || l.error || un.error) return abandonner("Les unités de ce compte n'ont pas pu être chargées. Réessayez.");
  const groupe = { nom: data.nom, paroisse: data.paroisse };
  return {
    etape: "ok",
    moi: {
      id: profil.id,
      nom: profil.nom,
      identifiant: profil.identifiant,
      roles,
      groupeId: data.id,
      groupe,
      unites: (a.data as { unite_id: string }[]).map((x) => x.unite_id),
      enfants: (l.data as { jeune_id: string }[]).map((x) => x.jeune_id),
      unitesGroupe: versUnites(un.data as LigneUnite[]),
    },
  };
}

async function secondFacteur(): Promise<EtapeConnexion> {
  if (!supabase) return erreur("Le serveur n'est pas configuré.");
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return abandonner(messageErreurAuth(error));
  const verifie = data.totp[0];
  if (verifie) return { etape: "code", factorId: verifie.id };
  // Un enrôlement commencé puis abandonné bloquerait le suivant : on le retire.
  const enCours = data.all.filter((f) => f.factor_type === "totp" && f.status === "unverified");
  for (const f of enCours) await supabase.auth.mfa.unenroll({ factorId: f.id });
  const enrole = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: NOM_APPLICATION, issuer: NOM_APPLICATION });
  if (enrole.error) return abandonner(messageErreurAuth(enrole.error));
  return { etape: "enrolement", factorId: enrole.data.id, qr: enrole.data.totp.qr_code, secret: enrole.data.totp.secret };
}

export async function connecter(identifiant: string, motDePasse: string): Promise<EtapeConnexion> {
  if (!supabase) return erreur("Le serveur n'est pas configuré.");
  const email = emailDeConnexion(identifiant);
  if (!email || !motDePasse) return erreur("Identifiant ou mot de passe incorrect.");
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    if (error) return erreur(messageErreurAuth(error));
    const profil = await lireProfil();
    if (profil === "erreur") return abandonner("La connexion a échoué. Réessayez.");
    const roles = profil ? lireRoles(profil.roles) : null;
    if (!profil || !roles) return abandonner("Ce compte n'a pas encore de rôle dans le groupe. Adressez-vous à l'administrateur.");
    if (!profil.actif) return abandonner("Ce compte est désactivé. Adressez-vous à l'administrateur du groupe.");
    return exigeDeuxFARoles(roles) ? secondFacteur() : terminer(profil, roles);
  } catch (e) {
    return erreur(messageErreurAuth(e));
  }
}

export async function verifierCode(factorId: string, saisie: string): Promise<EtapeConnexion> {
  if (!supabase) return erreur("Le serveur n'est pas configuré.");
  const code = codeTotp(saisie);
  if (!code) return erreur("Saisissez les six chiffres affichés dans l'application d'authentification.");
  try {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) return erreur(messageErreurAuth(error));
    const profil = await lireProfil();
    const roles = profil && profil !== "erreur" ? lireRoles(profil.roles) : null;
    if (!profil || profil === "erreur" || !roles) return abandonner("La connexion a échoué. Réessayez.");
    return terminer(profil, roles);
  } catch (e) {
    return erreur(messageErreurAuth(e));
  }
}

/** Ferme la session sur ce téléphone seulement (les autres appareils restent connectés). */
export async function deconnecter(): Promise<void> {
  try {
    await supabase?.auth.signOut({ scope: "local" });
  } catch {
    // Hors connexion, la session locale est tout de même effacée par supabase-js.
  }
}
