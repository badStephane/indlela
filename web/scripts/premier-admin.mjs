// Crée le groupe, ses trois unités et le premier compte administrateur, sur un projet Supabase vide.
// Ensuite, l'admin crée les autres comptes depuis l'application.
//
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SECRET_KEY=sb_secret_… npm run premier-admin
//
// La clé secrète se trouve dans le tableau de bord (Project Settings → API Keys). Elle ne doit
// jamais être enregistrée dans un fichier du dépôt ni dans l'application.

import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

// Mêmes règles que lib/auth.ts.
const DOMAINE_COMPTES = "comptes.indlela.invalid";
const IDENTIFIANT_RE = /^[a-z0-9.-]{2,60}$/;
const BRANCHES = [
  ["meute", "Meute"],
  ["troupe", "Troupe"],
  ["route", "Route"],
];

const url = process.env.SUPABASE_URL;
const cle = process.env.SUPABASE_SECRET_KEY;
if (!url || !cle) {
  console.error("Renseignez SUPABASE_URL et SUPABASE_SECRET_KEY (voir l'en-tête du script).");
  process.exit(1);
}
const db = createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } });

const rl = createInterface({ input: process.stdin, output: process.stdout });
// Lit les lignes dès maintenant : une saisie envoyée d'avance (tube) n'est pas perdue.
const lignes = rl[Symbol.asyncIterator]();
let masque = false;
rl._writeToOutput = (s) => rl.output.write(masque && !s.includes("\n") ? "" : s);

async function question(q, cache = false) {
  rl.output.write(q);
  masque = cache;
  const { value, done } = await lignes.next();
  masque = false;
  if (cache) rl.output.write("\n");
  if (done) arreter("Saisie interrompue.");
  return value.trim();
}

/** Année scoute : de septembre à août. */
function anneeScoute(d = new Date()) {
  const y = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${y + 1}`;
}

function arreter(message) {
  console.error(`\n${message}`);
  rl.close();
  process.exit(1);
}

const { count, error: errCompte } = await db.from("groupes").select("id", { count: "exact", head: true });
if (errCompte) arreter(`Lecture impossible : ${errCompte.message}. Le schéma est-il envoyé (supabase db push) ?`);
if (count) arreter("Ce projet a déjà un groupe : le premier admin existe. Les autres comptes se créent depuis l'application.");

console.log("Premier administrateur du carnet de progression\n");
const nomGroupe = await question("Nom du groupe (ex. Troisième Dakar) : ");
const paroisse = await question("Paroisse (ex. Saint-Pierre) : ");
const nom = await question("Nom et prénom de l'administrateur : ");
const identifiant = (await question("Identifiant de connexion (ex. prenom.nom) : ")).toLowerCase();
const motDePasse = await question("Mot de passe (10 caractères, lettres et chiffres) : ", true);
const confirmation = await question("Mot de passe, encore une fois : ", true);

if (!nomGroupe || !nom) arreter("Le nom du groupe et celui de l'administrateur sont obligatoires.");
if (!IDENTIFIANT_RE.test(identifiant)) arreter("Identifiant invalide : lettres minuscules, chiffres, points ou tirets.");
if (motDePasse.length < 10 || !/[a-zA-Z]/.test(motDePasse) || !/\d/.test(motDePasse)) arreter("Mot de passe trop faible.");
if (motDePasse !== confirmation) arreter("Les deux mots de passe diffèrent.");

const { data: groupe, error: errGroupe } = await db.from("groupes").insert({ nom: nomGroupe, paroisse }).select("id").single();
if (errGroupe) arreter(`Groupe non créé : ${errGroupe.message}`);

const annee = anneeScoute();
const { error: errUnites } = await db.from("unites").insert(BRANCHES.map(([branche, libelle]) => ({ groupe_id: groupe.id, branche, nom: `${libelle} ${nomGroupe}`, annee })));
if (errUnites) arreter(`Unités non créées : ${errUnites.message}`);

const { data: cree, error: errUser } = await db.auth.admin.createUser({ email: `${identifiant}@${DOMAINE_COMPTES}`, password: motDePasse, email_confirm: true });
if (errUser) arreter(`Compte non créé : ${errUser.message}`);

const { error: errFiche } = await db.from("utilisateurs").insert({ id: cree.user.id, groupe_id: groupe.id, nom, identifiant, role: "admin" });
if (errFiche) {
  await db.auth.admin.deleteUser(cree.user.id);
  arreter(`Fiche du compte non créée : ${errFiche.message}`);
}

await db.from("journal").insert({
  groupe_id: groupe.id,
  utilisateur_id: cree.user.id,
  utilisateur_nom: nom,
  action: "creation",
  table_name: "utilisateurs",
  ligne: cree.user.id,
  resume: `Groupe ${nomGroupe} et premier administrateur (${nom}) créés`,
});

console.log(`\nC'est prêt. Connectez-vous avec l'identifiant « ${identifiant} ».`);
console.log("À la première connexion, l'application demandera d'associer une application d'authentification.");
console.log(`Unités créées pour ${annee} : ${BRANCHES.map(([, l]) => `${l} ${nomGroupe}`).join(", ")}.`);
rl.close();
