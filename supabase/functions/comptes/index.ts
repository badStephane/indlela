// Gestion des comptes par l'administrateur du groupe : ce qui demande la clé secrète
// (créer l'accès, changer un mot de passe, retirer le second facteur d'un téléphone perdu).
// Le reste (nom, rôles, activation, affectations) passe par la base, sous la RLS.
//
// Appel : POST /functions/v1/comptes, en-tête Authorization: Bearer <jeton de l'admin>.
// L'admin doit être actif et connecté avec son second facteur (aal2).
// Réponse : { ok: true, data } ou { ok: false, erreur }.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";

// Mêmes règles que web/lib/auth.ts et la colonne utilisateurs.identifiant.
const DOMAINE_COMPTES = "comptes.indlela.invalid";
const IDENTIFIANT_RE = /^[a-z0-9.-]{2,60}$/;
const ROLES = ["admin", "groupe", "progression", "cadre", "parent"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_NOM = 80;

type Role = (typeof ROLES)[number];

/** Mêmes règles que app.roles_valides et web/lib/roles.ts : rôles connus, sans doublon ; parent seul. */
function lireRoles(v: unknown): Role[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  if (!v.every((r): r is Role => typeof r === "string" && (ROLES as readonly string[]).includes(r))) return null;
  if (new Set(v).size !== v.length) return null;
  if (v.includes("parent") && v.length > 1) return null;
  return v;
}

interface Appelant {
  id: string;
  nom: string;
  groupe_id: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const repondre = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const echec = (status: number, erreur: string) => repondre(status, { ok: false, erreur });

const texte = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const motDePasseValide = (m: string) => m.length >= 10 && /[a-zA-Z]/.test(m) && /\d/.test(m);

function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** L'appelant doit être un admin actif, connecté avec son second facteur. */
async function appelant(db: SupabaseClient, req: Request): Promise<Appelant | Response> {
  const jeton = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!jeton) return echec(401, "Connexion requise.");
  const { data, error } = await db.auth.getClaims(jeton);
  if (error || !data?.claims?.sub) return echec(401, "Session expirée. Reconnectez-vous.");
  if (data.claims.aal !== "aal2") return echec(403, "Le second facteur est requis pour gérer les comptes.");
  const { data: u } = await db.from("utilisateurs").select("id, nom, groupe_id, roles, actif").eq("id", data.claims.sub).maybeSingle();
  if (!u || !u.actif || !Array.isArray(u.roles) || !u.roles.includes("admin")) return echec(403, "Seul l'administrateur du groupe gère les comptes.");
  return { id: u.id, nom: u.nom, groupe_id: u.groupe_id };
}

/** Compte cible, qui doit appartenir au groupe de l'admin. */
async function cible(db: SupabaseClient, admin: Appelant, id: unknown): Promise<{ id: string; nom: string } | Response> {
  if (typeof id !== "string" || !UUID_RE.test(id)) return echec(400, "Compte inconnu.");
  const { data } = await db.from("utilisateurs").select("id, nom, groupe_id").eq("id", id).maybeSingle();
  if (!data || data.groupe_id !== admin.groupe_id) return echec(404, "Compte inconnu.");
  return { id: data.id, nom: data.nom };
}

async function journaliser(db: SupabaseClient, admin: Appelant, action: "creation" | "modification", ligne: string, resume: string, apres?: Record<string, unknown>) {
  const { error } = await db.from("journal").insert({
    groupe_id: admin.groupe_id,
    utilisateur_id: admin.id,
    utilisateur_nom: admin.nom,
    action,
    table_name: "utilisateurs",
    ligne,
    resume,
    apres: apres ?? null,
  });
  if (error) console.error("journal", error.message);
}

async function creer(db: SupabaseClient, admin: Appelant, body: Record<string, unknown>): Promise<Response> {
  const nom = texte(body.nom);
  const identifiant = texte(body.identifiant).toLowerCase();
  const roles = lireRoles(body.roles);
  const motDePasse = typeof body.motDePasse === "string" ? body.motDePasse : "";
  if (!nom || nom.length > MAX_NOM) return echec(400, "Le nom est obligatoire (80 caractères au plus).");
  if (!IDENTIFIANT_RE.test(identifiant)) return echec(400, "Identifiant invalide : lettres minuscules, chiffres, points ou tirets.");
  if (!roles) return echec(400, "Rôles invalides : au moins un rôle connu ; un compte parent n'a pas d'autre rôle.");
  if (!motDePasseValide(motDePasse)) return echec(400, "Mot de passe trop faible : 10 caractères au moins, avec des lettres et des chiffres.");

  const { data: pris } = await db.from("utilisateurs").select("id").eq("identifiant", identifiant).maybeSingle();
  if (pris) return echec(409, "Cet identifiant est déjà pris.");

  const cree = await db.auth.admin.createUser({ email: `${identifiant}@${DOMAINE_COMPTES}`, password: motDePasse, email_confirm: true });
  if (cree.error || !cree.data.user) {
    if (cree.error?.code === "email_exists") return echec(409, "Cet identifiant est déjà pris.");
    if (cree.error?.code === "weak_password") return echec(400, "Mot de passe trop faible : 10 caractères au moins, avec des lettres et des chiffres.");
    console.error("createUser", cree.error?.message);
    return echec(500, "Le compte n'a pas pu être créé. Réessayez.");
  }
  const id = cree.data.user.id;
  const { error } = await db.from("utilisateurs").insert({ id, groupe_id: admin.groupe_id, nom, identifiant, roles });
  if (error) {
    // Pas d'accès sans fiche : on retire l'accès créé plutôt que de laisser un compte orphelin.
    await db.auth.admin.deleteUser(id);
    console.error("utilisateurs", error.message);
    return echec(500, "Le compte n'a pas pu être créé. Réessayez.");
  }
  await journaliser(db, admin, "creation", id, `Compte ${nom} créé (${roles.join(", ")})`, { identifiant, roles });
  return repondre(201, { ok: true, data: { id, identifiant } });
}

async function changerMotDePasse(db: SupabaseClient, admin: Appelant, body: Record<string, unknown>): Promise<Response> {
  const c = await cible(db, admin, body.id);
  if (c instanceof Response) return c;
  const motDePasse = typeof body.motDePasse === "string" ? body.motDePasse : "";
  if (!motDePasseValide(motDePasse)) return echec(400, "Mot de passe trop faible : 10 caractères au moins, avec des lettres et des chiffres.");
  const { error } = await db.auth.admin.updateUserById(c.id, { password: motDePasse });
  if (error) {
    console.error("updateUserById", error.message);
    return echec(500, "Le mot de passe n'a pas pu être changé. Réessayez.");
  }
  await journaliser(db, admin, "modification", c.id, `Mot de passe de ${c.nom} réinitialisé`);
  return repondre(200, { ok: true, data: { id: c.id } });
}

async function retirerSecondFacteur(db: SupabaseClient, admin: Appelant, body: Record<string, unknown>): Promise<Response> {
  const c = await cible(db, admin, body.id);
  if (c instanceof Response) return c;
  const { data, error } = await db.auth.admin.mfa.listFactors({ userId: c.id });
  if (error) return echec(500, "Le second facteur n'a pas pu être retiré. Réessayez.");
  for (const f of data.factors) {
    const r = await db.auth.admin.mfa.deleteFactor({ userId: c.id, id: f.id });
    if (r.error) return echec(500, "Le second facteur n'a pas pu être retiré. Réessayez.");
  }
  await journaliser(db, admin, "modification", c.id, `Second facteur de ${c.nom} retiré : nouvel enrôlement à la prochaine connexion`);
  return repondre(200, { ok: true, data: { id: c.id, retires: data.factors.length } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return echec(405, "Méthode non prise en charge.");
  try {
    const db = serviceClient();
    const admin = await appelant(db, req);
    if (admin instanceof Response) return admin;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return echec(400, "Requête invalide.");
    switch ((body as Record<string, unknown>).action) {
      case "creer":
        return await creer(db, admin, body);
      case "mot-de-passe":
        return await changerMotDePasse(db, admin, body);
      case "retirer-second-facteur":
        return await retirerSecondFacteur(db, admin, body);
      default:
        return echec(400, "Action inconnue.");
    }
  } catch (e) {
    console.error("comptes", e instanceof Error ? e.message : e);
    return echec(500, "Erreur du serveur. Réessayez.");
  }
});
