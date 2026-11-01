// Connexion par identifiant : Supabase Auth exige une adresse, on rattache donc l'identifiant
// (« ibrahima.seck ») à un domaine réservé qui ne reçoit jamais de courrier (RFC 2606).
// L'admin remet le mot de passe ; aucun e-mail n'est envoyé.

export const DOMAINE_COMPTES = "comptes.indlela.invalid";

/** Même règle que la colonne utilisateurs.identifiant. */
const IDENTIFIANT_RE = /^[a-z0-9.-]{2,60}$/;
const MIN_MOT_DE_PASSE = 10;

export function normaliserIdentifiant(saisie: string): string {
  return saisie
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/** Adresse de connexion d'un identifiant, ou null s'il n'est pas valide. */
export function emailDeConnexion(saisie: string): string | null {
  const id = normaliserIdentifiant(saisie);
  return IDENTIFIANT_RE.test(id) ? `${id}@${DOMAINE_COMPTES}` : null;
}

/** Même règle que le projet Supabase : 10 caractères, des lettres et des chiffres. */
export function motDePasseValide(mdp: string): boolean {
  return mdp.length >= MIN_MOT_DE_PASSE && /[a-zA-Z]/.test(mdp) && /\d/.test(mdp);
}

/** Code à six chiffres de l'application d'authentification, ou null. */
export function codeTotp(saisie: string): string | null {
  const code = saisie.replace(/\s/g, "");
  return /^\d{6}$/.test(code) ? code : null;
}

interface ErreurAuth {
  code?: string;
  status?: number;
  name?: string;
}

const estErreurAuth = (e: unknown): e is ErreurAuth => typeof e === "object" && e !== null;

/** Message affiché pour une erreur de Supabase Auth : jamais le détail technique. */
export function messageErreurAuth(e: unknown): string {
  if (e instanceof TypeError) return "Le serveur ne répond pas. Vérifiez la connexion Internet, puis réessayez.";
  if (!estErreurAuth(e)) return "La connexion a échoué. Réessayez.";
  if (e.name === "AuthRetryableFetchError" || e.status === 0) return "Le serveur ne répond pas. Vérifiez la connexion Internet, puis réessayez.";
  if (e.code === "invalid_credentials") return "Identifiant ou mot de passe incorrect.";
  if (e.status === 429 || e.code?.startsWith("over_")) return "Trop d'essais. Patientez quelques minutes avant de réessayer.";
  if (e.code?.startsWith("mfa_")) return "Code incorrect ou expiré. Saisissez le code affiché maintenant dans l'application.";
  if (e.code === "weak_password") return "Mot de passe trop faible : 10 caractères au moins, avec des lettres et des chiffres.";
  return "La connexion a échoué. Réessayez.";
}
