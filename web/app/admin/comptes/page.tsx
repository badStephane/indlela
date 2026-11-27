"use client";

import { useEffect, useState } from "react";
import { AppShell, type FootAction } from "@/components/AppShell";
import { cx } from "@/components/ui";
import { BlocBranche, Bouton, FOND_BRANCHE, TitreSection } from "@/components/carte";
import { contientSansAccents } from "@/lib/parseList";
import { fieldClass, Segmented, Sheet, SheetActions, sheetBtn } from "@/components/Sheet";
import { useGuard } from "@/lib/access";
import { useStore, type Role } from "@/lib/store";
import { ANNEE, identifiantLibre, type Compte, type Unite } from "@/lib/admin";
import { basculerRole, exigeDeuxFARoles, libelleRoles } from "@/lib/roles";
import { BRANCHES, type BranchCode } from "@/lib/referentiels";
import { fullName, uuid, type Jeune } from "@/lib/mock";
import { estActif } from "@/lib/suivi";
import { fmtShort, fmtWhen, toISODate } from "@/lib/dates";
import { plural } from "@/lib/progress";
import { supabase } from "@/lib/supabase";
import { motDePasseValide } from "@/lib/auth";
import { affecter, changerActif, changerRoles, chargerComptes, creerCompte, creerUnite } from "@/lib/comptesServeur";
import { AccesCompte } from "@/components/admin/AccesCompte";
import { ChoixRoles } from "@/components/admin/ChoixRoles";

type Filtre = "tous" | "cadre" | "parent" | "encadrement";
type SheetState = { kind: "compte"; id: string } | { kind: "nouveau-compte" } | { kind: "nouvelle-unite" } | null;

const ONLINE_ONLY = "Cette action se fait en ligne : retrouvez du réseau.";
const ENFANTS_PLUS_TARD = "Les enfants se lient une fois les fiches des jeunes synchronisées avec le serveur.";

/** Connecté par le serveur : comptes, unités et affectations sont lus et écrits dans la base. */
function useServeur() {
  const store = useStore();
  return !!supabase && !!store.moi;
}

/** Recharge comptes et unités depuis le serveur. */
async function recharger(store: ReturnType<typeof useStore>) {
  const r = await chargerComptes();
  if (!r.ok) return store.showToast(r.erreur);
  store.setComptes(() => r.data.comptes);
  store.setUnites(() => r.data.unites);
}

export default function Comptes() {
  const ok = useGuard((r) => r === "admin");
  const store = useStore();
  const [tab, setTab] = useState<"comptes" | "unites">("comptes");
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [recherche, setRecherche] = useState("");

  const serveur = useServeur();

  useEffect(() => {
    if (ok) store.setLastTab("/admin/comptes");
    if (ok && serveur) void recharger(store);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, serveur]);

  if (!ok) return null;

  const { comptes, unites, jeunes, offline } = store;
  const sansConsentement = jeunes.filter((j) => j.statut === "actif" && !j.consentementLe);

  const recordConsent = (j: Jeune) => {
    if (offline) return store.showToast(ONLINE_ONLY);
    const today = toISODate(new Date());
    store.setJeunes((list) => list.map((x) => (x.id === j.id ? { ...x, consentementLe: today } : x)));
    store.log({
      action: "consentement",
      table: "jeunes",
      ligne: j.id,
      resume: `Consentement des parents enregistré pour ${fullName(j)}`,
      avant: { consentement_le: null },
      apres: { consentement_le: today },
    });
    store.showToast(`Consentement de ${j.prenom} enregistré · fiche active`);
  };

  const filtres: { value: Filtre; label: string; match: (c: Compte) => boolean }[] = [
    { value: "tous", label: "Tous", match: () => true },
    { value: "cadre", label: "Cadres", match: (c) => c.roles.includes("cadre") },
    { value: "parent", label: "Parents", match: (c) => c.roles.includes("parent") },
    { value: "encadrement", label: "Groupe", match: (c) => c.roles.includes("admin") || c.roles.includes("groupe") || c.roles.includes("progression") },
  ];
  const shown = comptes.filter(filtres.find((f) => f.value === filtre)!.match);

  const subtitle = (c: Compte) => {
    const roles = libelleRoles(c.roles);
    if (c.roles.includes("cadre")) return `${roles} · ${c.unites.map((u) => unites.find((x) => x.id === u)?.nom ?? u).join(", ") || "aucune unité"}`;
    if (c.roles.includes("parent")) return `Parent · ${c.enfants.map((id) => store.findJeune(id)?.prenom ?? "?").join(", ") || "aucun enfant lié"}`;
    return roles;
  };

  const visibles = shown.filter((c) => contientSansAccents(`${c.nom} ${c.identifiant}`, recherche));

  const foot: FootAction =
    tab === "comptes"
      ? { label: "Créer un compte", onClick: () => setSheet({ kind: "nouveau-compte" }), disabled: offline, note: offline ? ONLINE_ONLY : undefined }
      : { label: "Créer une unité", onClick: () => setSheet({ kind: "nouvelle-unite" }), disabled: offline, note: offline ? ONLINE_ONLY : undefined };

  return (
    <AppShell kicker="Les comptes sont créés ici, il n'y a pas d'inscription" title="Comptes et unités" foot={foot} wide>
      <div className="flex flex-col gap-4 px-4 pb-10 lg:px-0">
        <div className="max-w-[420px]">
          <Segmented
            label="Afficher"
            value={tab}
            onChange={setTab}
            options={[
              { value: "comptes", label: `Comptes · ${comptes.length}` },
              { value: "unites", label: `Unités · ${unites.length}` },
            ]}
          />
        </div>

        {tab === "comptes" ? (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="-mx-4 flex overflow-x-auto px-4 lg:mx-0 lg:px-0" role="group" aria-label="Filtrer les comptes">
                {filtres.map((f) => {
                  const on = f.value === filtre;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFiltre(f.value)}
                      className={cx(
                        "-ml-[1.5px] min-h-11 flex-none border-[1.5px] border-encre px-3.5 text-[15px] font-semibold first:ml-0",
                        on ? "bg-encre text-fond" : "bg-transparent text-encre",
                      )}
                    >
                      {f.label} · {comptes.filter(f.match).length}
                    </button>
                  );
                })}
              </div>
              <input
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                aria-label="Chercher un compte"
                placeholder="Chercher"
                className="h-11 w-full border-0 border-b-[1.5px] border-encre bg-transparent px-0 text-[17px] text-encre placeholder:text-crayon lg:w-[220px]"
              />
            </div>

            <table className="tableau-empile w-full border-collapse text-[16px]">
              <thead>
                <tr className="text-left text-[14px]">
                  <th scope="col" className="py-2 pr-3 font-semibold">Nom</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Identifiant</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Rôles</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">État</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">2nd facteur</th>
                  <th scope="col" className="py-2">
                    <span className="sr-only">Gérer</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => (
                  <tr key={c.id} className="border-t border-ligne">
                    <th scope="row" className="py-3 pr-3 text-left font-semibold">
                      {c.nom}
                    </th>
                    <td className="py-3 pr-3 font-mono text-[14px]">{c.identifiant}</td>
                    <td className="py-3 pr-3 max-lg:basis-full">{subtitle(c)}</td>
                    <td className={cx("py-3 pr-3 font-semibold", c.actif ? "text-sentier" : "font-normal text-crayon")}>{c.actif ? "Actif" : "Désactivé"}</td>
                    <td className="py-3 pr-3">
                      <span className="lg:hidden">2nd facteur : </span>
                      {c.deuxFA ? "activé" : "—"}
                    </td>
                    <td className="py-1 lg:text-right">
                      <button
                        type="button"
                        onClick={() => setSheet({ kind: "compte", id: c.id })}
                        className="min-h-11 bg-transparent px-1 font-semibold text-encre underline underline-offset-4"
                        aria-label={`Gérer le compte de ${c.nom}`}
                      >
                        Gérer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibles.length === 0 && <p className="m-0 py-2 text-[16px] text-crayon">Aucun compte ne correspond.</p>}

            <section>
              <TitreSection aDroite={sansConsentement.length ? `${sansConsentement.length} ${plural(sansConsentement.length, "fiche inactive", "fiches inactives")}` : undefined}>
                Consentements à enregistrer
              </TitreSection>
              {sansConsentement.length ? (
                <>
                  <p className="m-0 pb-2 text-[15px] text-crayon text-pretty">
                    Leur fiche reste inactive : ni validation ni accès parent tant que le consentement des parents n&apos;est pas enregistré.
                  </p>
                  <table className="tableau-empile w-full border-collapse text-[16px]">
                    <thead>
                      <tr className="text-left text-[14px]">
                        <th scope="col" className="py-2 pr-3 font-semibold">Jeune</th>
                        <th scope="col" className="py-2 pr-3 font-semibold">Unité</th>
                        <th scope="col" className="py-2">
                          <span className="sr-only">Action</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sansConsentement.map((j) => (
                        <tr key={j.id} className="border-t border-ligne">
                          <th scope="row" className="py-3 pr-3 text-left font-semibold">
                            {fullName(j)}
                          </th>
                          <td className="py-3 pr-3">
                            {store.unitesNoms[j.branche]}
                            {j.importe ? " · importé" : ""}
                          </td>
                          <td className="py-2 max-lg:basis-full lg:text-right">
                            <Bouton onClick={() => recordConsent(j)} disabled={offline} className="px-4 text-[15px]">
                              Enregistrer le consentement
                            </Bouton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p className="m-0 py-3 text-[16px] text-crayon">Toutes les fiches ont le consentement des parents.</p>
              )}
            </section>
          </>
        ) : (
          <section className="flex flex-col gap-6">
            <TitreSection>Année {ANNEE}</TitreSection>
            {unites.map((u) => (
              <UniteBloc key={u.id} u={u} comptes={comptes} effectif={effectifDe(u, jeunes)} />
            ))}
          </section>
        )}
      </div>

      {sheet?.kind === "compte" && <CompteSheet id={sheet.id} onClose={() => setSheet(null)} />}
      {sheet?.kind === "nouveau-compte" && <NouveauCompteSheet onClose={() => setSheet(null)} />}
      {sheet?.kind === "nouvelle-unite" && <NouvelleUniteSheet onClose={() => setSheet(null)} />}
    </AppShell>
  );
}

/** Effectif d'une unité : ses jeunes actifs (consentement enregistré). */
function effectifDe(u: Unite, jeunes: Jeune[]): number {
  return jeunes.filter((j) => j.branche === u.branche && estActif(j)).length;
}

function UniteBloc({ u, comptes, effectif }: { u: Unite; comptes: Compte[]; effectif: number }) {
  const cadres = comptes.filter((c) => c.roles.includes("cadre") && c.actif && c.unites.includes(u.id));
  return (
    <BlocBranche branche={u.branche}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="m-0 text-section font-extrabold">{u.nom}</h3>
        <span className="font-mono text-[14px] text-crayon">
          {effectif} {plural(effectif, "jeune", "jeunes")} · {cadres.length} {plural(cadres.length, "cadre", "cadres")}
        </span>
      </div>
      <p className="m-0 text-[15px] text-crayon">
        {BRANCHES[u.branche].name} · {u.annee}
      </p>
      <p className="m-0 pt-1 text-[16px] text-pretty">{cadres.length ? cadres.map((c) => c.nom).join(", ") : "Aucun cadre affecté"}</p>
      {u.branche !== "troupe" && <p className="m-0 pt-1 text-[15px] text-crayon text-pretty">Module {BRANCHES[u.branche].name.toLowerCase()} prévu en V2 (mars 2027).</p>}
    </BlocBranche>
  );
}

function CompteSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const store = useStore();
  const serveur = useServeur();
  const c = store.comptes.find((x) => x.id === id);
  const [lien, setLien] = useState("");
  if (!c) return null;
  const self = c.id === store.compte?.id;
  const linkable = store.jeunes.filter((j) => j.statut === "actif" && j.consentementLe && !c.enfants.includes(j.id));

  const change = (patch: Partial<Compte>, resume: string, table: string, avant: Record<string, string | boolean>, apres: Record<string, string | boolean>) => {
    if (store.offline) return store.showToast(ONLINE_ONLY);
    store.setComptes((list) => list.map((x) => (x.id === c.id ? { ...x, ...patch } : x)));
    store.log({ action: "modification", table, ligne: c.id, resume, avant, apres });
  };

  const toggleUnite = async (u: Unite) => {
    const on = c.unites.includes(u.id);
    const next = on ? c.unites.filter((x) => x !== u.id) : [...c.unites, u.id];
    if (!(serveur && store.moi)) {
      return change({ unites: next }, `${c.nom} ${on ? "retiré de" : "affecté à"} ${u.nom}`, "affectations_cadres", { unites: c.unites.join(", ") }, { unites: next.join(", ") });
    }
    const r = await affecter(store.moi, c, u, !on);
    if (!r.ok) return store.showToast(r.erreur);
    store.setComptes((list) => list.map((x) => (x.id === c.id ? { ...x, unites: next } : x)));
  };

  const toggleRole = async (r: Role) => {
    if (store.offline) return store.showToast(ONLINE_ONLY);
    const next = basculerRole(c.roles, r);
    if (next.length === c.roles.length && next.every((x) => c.roles.includes(x))) return;
    if (serveur && store.moi) {
      const res = await changerRoles(store.moi, c, next);
      if (!res.ok) return store.showToast(res.erreur);
      store.setComptes((list) => list.map((x) => (x.id === c.id ? { ...x, roles: next, deuxFA: exigeDeuxFARoles(next) } : x)));
    } else {
      change({ roles: next, deuxFA: exigeDeuxFARoles(next) }, `Rôles de ${c.nom} : ${libelleRoles(next)}`, "utilisateurs", { roles: libelleRoles(c.roles) }, { roles: libelleRoles(next) });
    }
    const secondFacteurNouveau = exigeDeuxFARoles(next) && !exigeDeuxFARoles(c.roles);
    store.showToast(`Rôles de ${c.nom} : ${libelleRoles(next)}${secondFacteurNouveau ? " · second facteur demandé à sa prochaine connexion" : ""}`);
  };

  const toggleActif = async () => {
    if (store.offline) return store.showToast(ONLINE_ONLY);
    if (serveur && store.moi) {
      const r = await changerActif(store.moi, c, !c.actif);
      if (!r.ok) return store.showToast(r.erreur);
      store.setComptes((list) => list.map((x) => (x.id === c.id ? { ...x, actif: !c.actif } : x)));
    } else {
      change({ actif: !c.actif }, `Compte de ${c.nom} ${c.actif ? "désactivé" : "réactivé"}`, "utilisateurs", { actif: c.actif }, { actif: !c.actif });
    }
    store.showToast(c.actif ? `Compte de ${c.nom} désactivé · il ne peut plus se connecter` : `Compte de ${c.nom} réactivé`);
  };

  return (
    <Sheet title={c.nom} onClose={onClose}>
      <div className="-mt-2 flex flex-col gap-0.5">
        <span className="font-mono text-[15px]">{c.identifiant}</span>
        <span className="text-[14px] text-crayon">
          {libelleRoles(c.roles)} · {c.actif ? "actif" : "inactif"} · dernière connexion : {c.derniereConnexion ? fmtWhen(c.derniereConnexion).toLowerCase() : "jamais"}
        </span>
        {c.deuxFA && <span className="text-[14px] font-semibold text-sentier">Double authentification activée</span>}
      </div>

      <ChoixRoles roles={c.roles} onToggle={toggleRole} disabled={self || store.offline} />
      {self && <span className="-mt-2 text-[14px] text-crayon text-pretty">Vos propres rôles se changent depuis un autre compte administrateur.</span>}

      {c.roles.includes("cadre") && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Unités gérées</span>
          <div className="flex flex-wrap gap-2">
            {store.unites.map((u) => {
              const on = c.unites.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleUnite(u)}
                  className={cx("flex min-h-11 items-center gap-2 border-[1.5px] border-encre px-3 text-[15px] font-semibold", on ? "bg-encre text-fond" : "bg-transparent text-encre")}
                >
                  <span aria-hidden="true" className={cx("h-3 w-1.5", FOND_BRANCHE[u.branche])} />
                  {u.nom}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {c.roles.includes("parent") && serveur && <span className="text-[14px] text-crayon text-pretty">{ENFANTS_PLUS_TARD}</span>}
      {c.roles.includes("parent") && !serveur && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Enfants liés</span>
          {c.enfants.length === 0 && <span className="text-[15px] text-crayon">Aucun enfant lié : ce compte ne voit rien.</span>}
          {c.enfants.map((jid) => {
            const j = store.findJeune(jid);
            return (
              <div key={jid} className="flex min-h-11 items-center justify-between gap-2 border-b border-ligne">
                <span className="text-[16px]">
                  {j ? fullName(j) : jid} <span className="text-crayon">· {j ? store.unitesNoms[j.branche] : ""}</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    change({ enfants: c.enfants.filter((x) => x !== jid) }, `Lien retiré entre ${c.nom} et ${j ? fullName(j) : jid}`, "liens_parent", { jeune: jid }, { jeune: "—" })
                  }
                  className="min-h-11 border-[1.5px] border-encre bg-transparent px-3 text-[14px] font-semibold text-encre"
                >
                  Retirer
                </button>
              </div>
            );
          })}
          <div className="flex items-end gap-2">
            <select value={lien} onChange={(e) => setLien(e.target.value)} aria-label="Enfant à lier" className={cx(fieldClass, "min-w-0 flex-1 text-[15px]")}>
              <option value="">Choisir un jeune…</option>
              {linkable.map((j) => (
                <option key={j.id} value={j.id}>
                  {fullName(j)} · {BRANCHES[j.branche].name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!lien}
              onClick={() => {
                const j = store.findJeune(lien)!;
                change({ enfants: [...c.enfants, lien] }, `${c.nom} lié à ${fullName(j)}`, "liens_parent", { jeune: "—" }, { jeune: lien });
                setLien("");
              }}
              className="h-12 flex-none bg-sentier px-4 text-[15px] font-semibold text-white disabled:bg-ligne disabled:text-crayon"
            >
              Lier
            </button>
          </div>
          <span className="text-[14px] text-crayon">Seuls les jeunes dont le consentement est enregistré peuvent être liés.</span>
        </div>
      )}

      {serveur && !self && <AccesCompte c={c} />}
      {self && <span className="text-[14px] text-crayon">Vous ne pouvez pas désactiver votre propre compte.</span>}
      <SheetActions>
        <button type="button" onClick={onClose} className={sheetBtn.ghost}>
          Fermer
        </button>
        <button
          type="button"
          disabled={self}
          onClick={toggleActif}
          className={c.actif ? sheetBtn.danger : sheetBtn.primary}
        >
          {c.actif ? "Désactiver" : "Réactiver"}
        </button>
      </SheetActions>
    </Sheet>
  );
}

function NouveauCompteSheet({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const serveur = useServeur();
  const [nom, setNom] = useState("");
  const [roles, setRoles] = useState<Role[]>(["cadre"]);
  const estParent = roles.includes("parent");
  const [unite, setUnite] = useState(store.unites.find((u) => u.branche === "troupe")?.id ?? store.unites[0]?.id ?? "");
  const [enfant, setEnfant] = useState("");
  const [mdp, setMdp] = useState("");
  const [busy, setBusy] = useState(false);
  const linkable = store.jeunes.filter((j) => j.statut === "actif" && j.consentementLe);
  const identifiant = nom.trim() ? identifiantLibre(nom, store.comptes) : "";
  const ready = nom.trim().split(/\s+/).length >= 2 && (serveur ? motDePasseValide(mdp) : !estParent || !!enfant);

  const createServeur = async () => {
    if (!ready || busy || !store.moi) return;
    if (store.offline) return store.showToast(ONLINE_ONLY);
    setBusy(true);
    const r = await creerCompte({ nom: nom.trim(), identifiant, roles, motDePasse: mdp });
    if (!r.ok) {
      setBusy(false);
      return store.showToast(r.erreur);
    }
    const u = store.unites.find((x) => x.id === unite);
    if (roles.includes("cadre") && u) {
      const c: Compte = { id: r.data.id, nom: nom.trim(), identifiant, roles, actif: true, unites: [], enfants: [], deuxFA: false, derniereConnexion: null };
      const a = await affecter(store.moi, c, u, true);
      if (!a.ok) store.showToast(`Compte créé, mais l'affectation à ${u.nom} a échoué : refaites-la depuis sa fiche.`);
    }
    await recharger(store);
    store.showToast(`Compte créé · identifiant ${r.data.identifiant} et mot de passe à remettre en main propre`);
    onClose();
  };

  const create = () => {
    if (serveur) return void createServeur();
    if (!ready) return;
    const c: Compte = {
      id: uuid(),
      nom: nom.trim(),
      identifiant,
      roles,
      actif: true,
      unites: roles.includes("cadre") ? [unite] : [],
      enfants: estParent ? [enfant] : [],
      deuxFA: exigeDeuxFARoles(roles),
      derniereConnexion: null,
    };
    store.setComptes((list) => [...list, c]);
    store.log({
      action: "creation",
      table: "utilisateurs",
      ligne: c.id,
      resume: `Compte ${libelleRoles(roles).toLowerCase()} créé pour ${c.nom}`,
      apres: { identifiant, roles: libelleRoles(roles), unite: c.unites[0] ?? null, enfant: c.enfants[0] ?? null },
    });
    store.showToast(`Compte créé · identifiant ${identifiant} à remettre en main propre`);
    onClose();
  };

  return (
    <Sheet title="Nouveau compte" onClose={onClose}>
      <label className="flex flex-col text-sm font-semibold">
        Prénom et nom
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Mame Diarra Sy" className={fieldClass} autoFocus />
      </label>
      {identifiant && <span className="-mt-1 font-mono text-[14px] text-crayon">identifiant proposé : {identifiant}</span>}
      <ChoixRoles roles={roles} onToggle={(r) => setRoles((list) => basculerRole(list, r))} />
      {roles.includes("cadre") && (
        <label className="flex flex-col text-sm font-semibold">
          Unité gérée
          <select value={unite} onChange={(e) => setUnite(e.target.value)} className={fieldClass}>
            {store.unites.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nom}
              </option>
            ))}
          </select>
        </label>
      )}
      {serveur && (
        <label className="flex flex-col text-sm font-semibold">
          Mot de passe provisoire
          <input value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="new-password" placeholder="10 caractères, lettres et chiffres" className={fieldClass} />
        </label>
      )}
      {estParent && serveur && <span className="text-[14px] text-crayon text-pretty">{ENFANTS_PLUS_TARD}</span>}
      {estParent && !serveur && (
        <label className="flex flex-col text-sm font-semibold">
          Enfant
          <select value={enfant} onChange={(e) => setEnfant(e.target.value)} className={fieldClass}>
            <option value="">Choisir un jeune…</option>
            {linkable.map((j) => (
              <option key={j.id} value={j.id}>
                {fullName(j)} · {BRANCHES[j.branche].name}
              </option>
            ))}
          </select>
        </label>
      )}
      {exigeDeuxFARoles(roles) && (
        <span className="text-[14px] text-crayon text-pretty">La double authentification sera demandée à la première connexion.</span>
      )}
      <SheetActions>
        <button type="button" onClick={onClose} className={sheetBtn.ghost}>
          Annuler
        </button>
        <button type="button" disabled={!ready || busy} onClick={create} className={sheetBtn.primary}>
          {busy ? "Création…" : "Créer le compte"}
        </button>
      </SheetActions>
    </Sheet>
  );
}

function NouvelleUniteSheet({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const serveur = useServeur();
  const [nom, setNom] = useState("");
  const [branche, setBranche] = useState<BranchCode>("troupe");
  const [annee, setAnnee] = useState(ANNEE);
  const ready = nom.trim().length >= 3 && /^\d{4}-\d{4}$/.test(annee);

  const create = async () => {
    if (!ready) return;
    if (serveur && store.moi) {
      if (store.offline) return store.showToast(ONLINE_ONLY);
      const r = await creerUnite(store.moi, { nom: nom.trim(), branche, annee });
      if (!r.ok) return store.showToast(r.erreur);
      await recharger(store);
      store.showToast(`${nom.trim()} créée · affectez-lui des cadres`);
      return onClose();
    }
    const u: Unite = { id: uuid(), nom: nom.trim(), branche, annee, responsable: null };
    store.setUnites((list) => [...list, u]);
    store.log({ action: "creation", table: "unites", ligne: u.id, resume: `Unité ${u.nom} créée (${annee})`, apres: { nom: u.nom, branche, annee } });
    store.showToast(`${u.nom} créée · affectez-lui des cadres`);
    onClose();
  };

  return (
    <Sheet title="Nouvelle unité" onClose={onClose}>
      <label className="flex flex-col text-sm font-semibold">
        Nom
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Troupe Saint-Joseph" className={fieldClass} autoFocus />
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Branche</span>
        <Segmented
          label="Branche"
          value={branche}
          onChange={setBranche}
          options={(["meute", "troupe", "route"] as BranchCode[]).map((b) => ({ value: b, label: BRANCHES[b].name }))}
        />
      </div>
      <label className="flex flex-col text-sm font-semibold">
        Année
        <input value={annee} onChange={(e) => setAnnee(e.target.value)} inputMode="numeric" className={fieldClass} />
      </label>
      <span className="text-[14px] text-crayon text-pretty">Créée le {fmtShort(toISODate(new Date()), true)}. La branche fixe le référentiel utilisé par l&apos;unité.</span>
      <SheetActions>
        <button type="button" onClick={onClose} className={sheetBtn.ghost}>
          Annuler
        </button>
        <button type="button" disabled={!ready} onClick={create} className={sheetBtn.primary}>
          Créer l&apos;unité
        </button>
      </SheetActions>
    </Sheet>
  );
}
