// Synchronisation contre la pile Supabase locale, sous la RLS, avec un vrai compte de cadre.
// Ignoré par défaut (CI, npm test). Pour le lancer :
//   supabase start
//   eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"
//   INTEGRATION=1 NEXT_PUBLIC_SUPABASE_URL=$API_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY \
//     npx vitest run lib/__tests__/synchro.integration.test.ts

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Unite } from "../admin";
import type { Reconnaissance } from "../courHonneur";
import type { Jeune, Validation } from "../mock";

const ACTIF = process.env.INTEGRATION === "1";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE = process.env.SERVICE_ROLE_KEY ?? "";
const DOMAINE = "comptes.indlela.invalid";
const SUFFIXE = Math.random().toString(16).slice(2, 8);
const MDP = "synchroessai2026";

describe.skipIf(!ACTIF)("synchronisation avec la base locale", () => {
  // Créé au premier usage : hors intégration, l'URL est vide et le fichier doit seulement être ignoré.
  let client: SupabaseClient | null = null;
  const service = (): SupabaseClient => (client ??= createClient(URL, SERVICE, { auth: { persistSession: false } }));
  const ids = { groupe: "", troupe: "", cadre: "", autre: "" };
  const unites: Unite[] = [];
  const jeuneId = crypto.randomUUID();
  const valId = crypto.randomUUID();

  const jeune = (patch: Partial<Jeune> = {}): Jeune => ({
    id: jeuneId,
    prenom: "Awa",
    nom: `Essai ${SUFFIXE}`,
    dateNaissance: "2013-04-02",
    dateEntree: "2026-09-15",
    branche: "troupe",
    etapeId: "t.vol",
    choix: [],
    specs: [{ name: "Secouriste", meta: "Niveau 1" }],
    consentementLe: "2026-09-20",
    statut: "actif",
    ...patch,
  });
  const validation = (patch: Partial<Validation> = {}): Validation => ({
    id: valId,
    jeuneId,
    etapeId: "t.vol",
    domaineId: "t.vol.esprit",
    preuveId: "t.vol.esprit.1",
    date: "2026-10-10",
    validePar: "Nom saisi sur le téléphone",
    pending: true,
    annuleeLe: null,
    updatedAt: "",
    ...patch,
  });
  const cour: Reconnaissance = { id: crypto.randomUUID(), jeuneId, etapeId: "t.vol", date: "2026-11-01", decision: "reconnue", observations: "Bravo", ct: "CT Essai", presents: 8, voixPour: 7, pending: true };
  const rien = { jeunes: [], nouvelles: [], annulations: [], cours: [] };

  async function creerCadre(identifiant: string, nom: string): Promise<string> {
    const { data, error } = await service().auth.admin.createUser({ email: `${identifiant}@${DOMAINE}`, password: MDP, email_confirm: true });
    if (error || !data.user) throw new Error(error?.message);
    const fiche = await service().from("utilisateurs").insert({ id: data.user.id, groupe_id: ids.groupe, nom, identifiant, roles: ["cadre"] });
    if (fiche.error) throw new Error(fiche.error.message);
    return data.user.id;
  }

  beforeAll(async () => {
    const g = await service().from("groupes").insert({ nom: `Essai ${SUFFIXE}`, paroisse: "Test" }).select("id").single();
    ids.groupe = g.data!.id;
    const u = await service().from("unites").insert({ groupe_id: ids.groupe, branche: "troupe", nom: `Troupe ${SUFFIXE}`, annee: "2026-2027" }).select("id").single();
    ids.troupe = u.data!.id;
    unites.push({ id: ids.troupe, nom: `Troupe ${SUFFIXE}`, branche: "troupe", annee: "2026-2027", responsable: null });
    ids.cadre = await creerCadre(`cadre.${SUFFIXE}`, "Cadre Synchro");
    ids.autre = await creerCadre(`autre.${SUFFIXE}`, "Cadre Sans Unité");
    await service().from("affectations_cadres").insert({ utilisateur_id: ids.cadre, unite_id: ids.troupe });
  });

  afterAll(async () => {
    const { supabase } = await import("../supabase");
    await supabase?.auth.signOut();
    if (!ids.groupe) return;
    const jeunes = (await service().from("jeunes").select("id").eq("groupe_id", ids.groupe)).data?.map((x) => x.id) ?? [];
    await service().from("validations").delete().in("jeune_id", jeunes);
    await service().from("cours_honneur").delete().in("jeune_id", jeunes);
    await service().from("journal").delete().eq("groupe_id", ids.groupe);
    await service().from("jeunes").delete().eq("groupe_id", ids.groupe);
    for (const id of [ids.cadre, ids.autre].filter(Boolean)) await service().auth.admin.deleteUser(id);
    await service().from("unites").delete().eq("groupe_id", ids.groupe);
    await service().from("groupes").delete().eq("id", ids.groupe);
  });

  async function connecter(identifiant: string) {
    const { supabase } = await import("../supabase");
    await supabase!.auth.signOut();
    const { error } = await supabase!.auth.signInWithPassword({ email: `${identifiant}@${DOMAINE}`, password: MDP });
    expect(error).toBeNull();
  }

  it("le cadre envoie une fiche, une validation et une décision, puis les relit", async () => {
    const { envoyer, lire } = await import("../sync/serveur");
    await connecter(`cadre.${SUFFIXE}`);
    const bilan = await envoyer({ jeunes: [jeune()], nouvelles: [validation()], annulations: [], cours: [cour] }, { groupeId: ids.groupe, unites, signataire: "Cadre Synchro" });
    expect(bilan.erreur).toBeUndefined();
    expect(bilan.envoye.nouvelles).toHaveLength(1);

    const lu = await lire(unites);
    expect(lu.ok).toBe(true);
    if (!lu.ok) return;
    expect(lu.etat.jeunes).toMatchObject([{ id: jeuneId, branche: "troupe", specs: [{ name: "Secouriste", meta: "Niveau 1" }] }]);
    // Le serveur signe avec le nom du compte, pas avec celui envoyé par le téléphone.
    expect(lu.etat.vals).toMatchObject([{ id: valId, validePar: "Cadre Synchro", pending: false, annuleeLe: null }]);
    expect(lu.etat.recons).toMatchObject([{ id: cour.id, presents: 8, voixPour: 7, pending: false }]);
  });

  it("renvoyer la même saisie ne la double pas", async () => {
    const { envoyer, lire } = await import("../sync/serveur");
    const bilan = await envoyer({ ...rien, nouvelles: [validation()], cours: [cour] }, { groupeId: ids.groupe, unites, signataire: "Cadre Synchro" });
    expect(bilan.erreur).toBeUndefined();
    const lu = await lire(unites);
    expect(lu.ok && lu.etat.vals.length).toBe(1);
    expect(lu.ok && lu.etat.recons.length).toBe(1);
  });

  it("une modification de la fiche repart et remplace l'ancienne", async () => {
    const { envoyer, lire } = await import("../sync/serveur");
    const bilan = await envoyer({ ...rien, jeunes: [jeune({ etapeId: "t.cerf" })] }, { groupeId: ids.groupe, unites, signataire: "Cadre Synchro" });
    expect(bilan.erreur).toBeUndefined();
    const lu = await lire(unites);
    expect(lu.ok && lu.etat.jeunes[0].etapeId).toBe("t.cerf");
  });

  it("la même preuve validée depuis un autre téléphone est refusée, sans bloquer le reste", async () => {
    const { envoyer } = await import("../sync/serveur");
    const doublon = validation({ id: crypto.randomUUID() });
    const autre = validation({ id: crypto.randomUUID(), preuveId: "t.vol.esprit.2" });
    const bilan = await envoyer({ ...rien, nouvelles: [doublon, autre] }, { groupeId: ids.groupe, unites, signataire: "Cadre Synchro" });
    expect(bilan.erreur).toBeUndefined();
    expect(bilan.refusees).toEqual([doublon.id]);
    expect(bilan.envoye.nouvelles.map((v) => v.id)).toEqual([autre.id]);
  });

  it("une annulation part et reste visible", async () => {
    const { envoyer, lire } = await import("../sync/serveur");
    const bilan = await envoyer({ ...rien, annulations: [validation({ annuleeLe: "2026-11-02" })] }, { groupeId: ids.groupe, unites, signataire: "Cadre Synchro" });
    expect(bilan.erreur).toBeUndefined();
    const lu = await lire(unites);
    const v = lu.ok ? lu.etat.vals.find((x) => x.id === valId) : undefined;
    expect(v?.annuleeLe).not.toBeNull();
    expect(v?.annuleePar).toBe("Cadre Synchro");
  });

  it("un cadre sans affectation ne lit rien et ne peut rien écrire", async () => {
    const { envoyer, lire } = await import("../sync/serveur");
    await connecter(`autre.${SUFFIXE}`);
    const lu = await lire(unites);
    expect(lu.ok && lu.etat.jeunes).toEqual([]);
    const bilan = await envoyer({ ...rien, jeunes: [jeune({ id: crypto.randomUUID() })] }, { groupeId: ids.groupe, unites, signataire: "Cadre Sans Unité" });
    expect(bilan.erreur).toMatch(/droits/);
  });
});
