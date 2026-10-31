"use client";

import { useEffect, useState } from "react";
import { AppShell, type FootAction } from "@/components/AppShell";
import { Card, Chip, cx, List, rowClass, Section } from "@/components/ui";
import { fieldClass, Segmented, Sheet, SheetActions, sheetBtn } from "@/components/Sheet";
import { useGuard } from "@/lib/access";
import { useStore, type Role } from "@/lib/store";
import { ANNEE, exigeDeuxFA, identifiantLibre, ROLE_LABELS, type Compte, type Unite } from "@/lib/admin";
import { BRANCHES, BRANCH_COLORS, type BranchCode } from "@/lib/referentiels";
import { fullName, GROUP_OTHER_UNITS, uuid, type Jeune } from "@/lib/mock";
import { fmtShort, fmtWhen, toISODate } from "@/lib/dates";
import { plural } from "@/lib/progress";

type Filtre = "tous" | "cadre" | "parent" | "encadrement";
type SheetState = { kind: "compte"; id: string } | { kind: "nouveau-compte" } | { kind: "nouvelle-unite" } | null;

const ONLINE_ONLY = "Cette action se fait en ligne : retrouvez du réseau.";

export default function Comptes() {
  const ok = useGuard((r) => r === "admin");
  const store = useStore();
  const [tab, setTab] = useState<"comptes" | "unites">("comptes");
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [sheet, setSheet] = useState<SheetState>(null);

  useEffect(() => {
    if (ok) store.setLastTab("/admin/comptes");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

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
    { value: "cadre", label: "Cadres", match: (c) => c.role === "cadre" },
    { value: "parent", label: "Parents", match: (c) => c.role === "parent" },
    { value: "encadrement", label: "Groupe", match: (c) => c.role === "admin" || c.role === "groupe" || c.role === "progression" },
  ];
  const shown = comptes.filter(filtres.find((f) => f.value === filtre)!.match);

  const subtitle = (c: Compte) => {
    if (c.role === "cadre") return `Cadre · ${c.unites.map((u) => unites.find((x) => x.id === u)?.nom ?? u).join(", ") || "aucune unité"}`;
    if (c.role === "parent") return `Parent · ${c.enfants.map((id) => store.findJeune(id)?.prenom ?? "?").join(", ") || "aucun enfant lié"}`;
    return ROLE_LABELS[c.role];
  };

  const foot: FootAction =
    tab === "comptes"
      ? { label: "Créer un compte", onClick: () => setSheet({ kind: "nouveau-compte" }), disabled: offline, note: offline ? ONLINE_ONLY : undefined }
      : { label: "Créer une unité", onClick: () => setSheet({ kind: "nouvelle-unite" }), disabled: offline, note: offline ? ONLINE_ONLY : undefined };

  return (
    <AppShell kicker="Administration" title="Comptes et unités" foot={foot}>
      <div className="flex flex-col gap-4 p-4">
        {sansConsentement.length > 0 && (
          <Card className="flex flex-col gap-2.5 border-wait-dot/40 bg-wait-bg p-4 text-wait-ink">
            <span className="text-[15px] font-bold">
              {sansConsentement.length} {plural(sansConsentement.length, "jeune sans consentement", "jeunes sans consentement")}
            </span>
            <span className="text-[13px] text-pretty">
              Leur fiche reste inactive : ni validation ni accès parent tant que le consentement des parents n&apos;est pas enregistré.
            </span>
            <div className="flex flex-col">
              {sansConsentement.map((j) => (
                <div key={j.id} className="flex min-h-12 items-center justify-between gap-3 border-t border-wait-dot/25 py-1.5">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[15px] font-semibold text-ink">{fullName(j)}</span>
                    <span className="text-[12px]">
                      {BRANCHES[j.branche].unit}
                      {j.importe ? " · importé" : ""}
                    </span>
                  </span>
                  <button type="button" onClick={() => recordConsent(j)} className="h-9 flex-none rounded-full bg-ink px-3 text-[12px] font-bold text-white">
                    Consentement reçu
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Segmented
          label="Afficher"
          value={tab}
          onChange={setTab}
          options={[
            { value: "comptes", label: `Comptes · ${comptes.length}` },
            { value: "unites", label: `Unités · ${unites.length}` },
          ]}
        />

        {tab === "comptes" ? (
          <>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filtrer les comptes">
              {filtres.map((f) => {
                const on = f.value === filtre;
                return (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFiltre(f.value)}
                    className={cx("h-9 flex-none rounded-full border px-3.5 text-[13px] font-semibold", on ? "border-ink bg-ink text-white" : "border-line bg-surface text-muted")}
                  >
                    {f.label} · {comptes.filter(f.match).length}
                  </button>
                );
              })}
            </div>
            <List>
              {shown.map((c) => (
                <button key={c.id} type="button" onClick={() => setSheet({ kind: "compte", id: c.id })} className={`${rowClass} min-h-[60px] gap-3 py-2`}>
                  <span className={cx("flex h-10 w-10 flex-none items-center justify-center rounded-full text-[14px] font-bold", c.actif ? "bg-acc-soft text-acc-text" : "bg-track text-muted")}>
                    {initials(c.nom)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={cx("truncate text-[15px] font-semibold", !c.actif && "text-muted")}>{c.nom}</span>
                    <span className="truncate text-[12px] text-muted">{subtitle(c)}</span>
                  </span>
                  {!c.actif ? (
                    <Chip className="border border-line-strong text-muted">Inactif</Chip>
                  ) : c.deuxFA ? (
                    <Chip className="bg-ok-bg text-ok-ink">2FA</Chip>
                  ) : null}
                </button>
              ))}
            </List>
          </>
        ) : (
          <Section label={`Année ${ANNEE}`} gap="gap-2.5">
            {unites.map((u) => (
              <UniteCard key={u.id} u={u} comptes={comptes} effectif={effectifDe(u, jeunes)} />
            ))}
          </Section>
        )}
      </div>

      {sheet?.kind === "compte" && <CompteSheet id={sheet.id} onClose={() => setSheet(null)} />}
      {sheet?.kind === "nouveau-compte" && <NouveauCompteSheet onClose={() => setSheet(null)} />}
      {sheet?.kind === "nouvelle-unite" && <NouvelleUniteSheet onClose={() => setSheet(null)} />}
    </AppShell>
  );
}

const initials = (nom: string) =>
  nom
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** Effectif d'une unité : les jeunes actifs pour la troupe, les chiffres de démo ailleurs. */
function effectifDe(u: Unite, jeunes: Jeune[]): number {
  if (u.id === "meute") return GROUP_OTHER_UNITS.meute.effectif;
  if (u.id === "route") return GROUP_OTHER_UNITS.route.effectif;
  if (u.id === "troupe") return jeunes.filter((j) => j.branche === "troupe" && j.statut === "actif" && j.consentementLe).length;
  return 0;
}

function UniteCard({ u, comptes, effectif }: { u: Unite; comptes: Compte[]; effectif: number }) {
  const cadres = comptes.filter((c) => c.role === "cadre" && c.actif && c.unites.includes(u.id));
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="h-1" style={{ background: BRANCH_COLORS[u.branche].acc }} />
      <div className="flex flex-col gap-2 px-4 pb-4 pt-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[18px] font-extrabold">{u.nom}</span>
          <span className="font-mono text-[12px] text-muted">
            {effectif} {plural(effectif, "jeune", "jeunes")} · {cadres.length} {plural(cadres.length, "cadre", "cadres")}
          </span>
        </div>
        <span className="text-[13px] text-muted">
          {BRANCHES[u.branche].name} · {u.annee}
        </span>
        <span className="text-[14px] text-pretty">{cadres.length ? cadres.map((c) => c.nom).join(", ") : "Aucun cadre affecté"}</span>
        {u.branche !== "troupe" && <span className="text-[13px] text-muted text-pretty">Module {BRANCHES[u.branche].name.toLowerCase()} prévu en V2 (mars 2027).</span>}
      </div>
    </Card>
  );
}

function CompteSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const store = useStore();
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

  const toggleUnite = (u: Unite) => {
    const on = c.unites.includes(u.id);
    const next = on ? c.unites.filter((x) => x !== u.id) : [...c.unites, u.id];
    change({ unites: next }, `${c.nom} ${on ? "retiré de" : "affecté à"} ${u.nom}`, "affectations_cadres", { unites: c.unites.join(", ") }, { unites: next.join(", ") });
  };

  return (
    <Sheet title={c.nom} onClose={onClose}>
      <div className="flex flex-col gap-0.5 rounded-ui bg-paper px-3 py-2.5">
        <span className="font-mono text-[13px]">{c.identifiant}</span>
        <span className="text-[13px] text-muted">
          {ROLE_LABELS[c.role]} · {c.actif ? "actif" : "inactif"} · dernière connexion : {c.derniereConnexion ? fmtWhen(c.derniereConnexion).toLowerCase() : "jamais"}
        </span>
        {c.deuxFA && <span className="text-[13px] text-ok-ink">Double authentification activée</span>}
      </div>

      {c.role === "cadre" && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">Unités gérées</span>
          <div className="flex flex-wrap gap-2">
            {store.unites.map((u) => {
              const on = c.unites.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleUnite(u)}
                  className={cx("flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold", on ? "border-ink bg-ink text-white" : "border-line bg-surface text-muted")}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: BRANCH_COLORS[u.branche].acc }} />
                  {u.nom}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {c.role === "parent" && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">Enfants liés</span>
          {c.enfants.length === 0 && <span className="text-[14px] text-muted">Aucun enfant lié : ce compte ne voit rien.</span>}
          {c.enfants.map((jid) => {
            const j = store.findJeune(jid);
            return (
              <div key={jid} className="flex min-h-11 items-center justify-between gap-2 border-b border-line">
                <span className="text-[14px]">
                  {j ? fullName(j) : jid} <span className="text-muted">· {j ? BRANCHES[j.branche].unit : ""}</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    change({ enfants: c.enfants.filter((x) => x !== jid) }, `Lien retiré entre ${c.nom} et ${j ? fullName(j) : jid}`, "liens_parent", { jeune: jid }, { jeune: "—" })
                  }
                  className="h-8 rounded-full border border-line-strong px-2.5 text-[12px] font-bold text-muted"
                >
                  Retirer
                </button>
              </div>
            );
          })}
          <div className="flex gap-2">
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
              className="h-12 rounded-ui bg-acc px-4 text-[14px] font-bold text-acc-ink disabled:bg-track disabled:text-muted"
            >
              Lier
            </button>
          </div>
          <span className="text-[12px] text-muted">Seuls les jeunes dont le consentement est enregistré peuvent être liés.</span>
        </div>
      )}

      {self && <span className="text-[13px] text-muted">Vous ne pouvez pas désactiver votre propre compte.</span>}
      <SheetActions>
        <button type="button" onClick={onClose} className={sheetBtn.ghost}>
          Fermer
        </button>
        <button
          type="button"
          disabled={self}
          onClick={() => {
            change({ actif: !c.actif }, `Compte de ${c.nom} ${c.actif ? "désactivé" : "réactivé"}`, "utilisateurs", { actif: c.actif }, { actif: !c.actif });
            if (!store.offline) store.showToast(c.actif ? `Compte de ${c.nom} désactivé · il ne peut plus se connecter` : `Compte de ${c.nom} réactivé`);
          }}
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
  const [nom, setNom] = useState("");
  const [role, setRole] = useState<Role>("cadre");
  const [unite, setUnite] = useState("troupe");
  const [enfant, setEnfant] = useState("");
  const linkable = store.jeunes.filter((j) => j.statut === "actif" && j.consentementLe);
  const identifiant = nom.trim() ? identifiantLibre(nom, store.comptes) : "";
  const ready = nom.trim().split(/\s+/).length >= 2 && (role !== "parent" || !!enfant);

  const create = () => {
    if (!ready) return;
    const c: Compte = {
      id: uuid(),
      nom: nom.trim(),
      identifiant,
      role,
      actif: true,
      unites: role === "cadre" ? [unite] : [],
      enfants: role === "parent" ? [enfant] : [],
      deuxFA: exigeDeuxFA(role),
      derniereConnexion: null,
    };
    store.setComptes((list) => [...list, c]);
    store.log({
      action: "creation",
      table: "utilisateurs",
      ligne: c.id,
      resume: `Compte ${ROLE_LABELS[role].toLowerCase()} créé pour ${c.nom}`,
      apres: { identifiant, role, unite: c.unites[0] ?? null, enfant: c.enfants[0] ?? null },
    });
    store.showToast(`Compte créé · identifiant ${identifiant} à remettre en main propre`);
    onClose();
  };

  return (
    <Sheet title="Nouveau compte" onClose={onClose}>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Prénom et nom
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Mame Diarra Sy" className={fieldClass} autoFocus />
      </label>
      {identifiant && <span className="-mt-1 font-mono text-[12px] text-muted">identifiant : {identifiant}</span>}
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Rôle</span>
        <div className="grid grid-cols-2 gap-2">
          {(["cadre", "parent", "groupe", "progression", "admin"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={role === r}
              onClick={() => setRole(r)}
              className={cx("h-11 rounded-ui border text-[14px] font-semibold", role === r ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink")}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>
      {role === "cadre" && (
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
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
      {role === "parent" && (
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
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
      {exigeDeuxFA(role) && (
        <span className="text-[13px] text-muted text-pretty">La double authentification sera demandée à la première connexion.</span>
      )}
      <SheetActions>
        <button type="button" onClick={onClose} className={sheetBtn.ghost}>
          Annuler
        </button>
        <button type="button" disabled={!ready} onClick={create} className={sheetBtn.primary}>
          Créer le compte
        </button>
      </SheetActions>
    </Sheet>
  );
}

function NouvelleUniteSheet({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [nom, setNom] = useState("");
  const [branche, setBranche] = useState<BranchCode>("troupe");
  const [annee, setAnnee] = useState(ANNEE);
  const ready = nom.trim().length >= 3 && /^\d{4}-\d{4}$/.test(annee);

  const create = () => {
    if (!ready) return;
    const u: Unite = { id: uuid(), nom: nom.trim(), branche, annee, responsable: null };
    store.setUnites((list) => [...list, u]);
    store.log({ action: "creation", table: "unites", ligne: u.id, resume: `Unité ${u.nom} créée (${annee})`, apres: { nom: u.nom, branche, annee } });
    store.showToast(`${u.nom} créée · affectez-lui des cadres`);
    onClose();
  };

  return (
    <Sheet title="Nouvelle unité" onClose={onClose}>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Nom
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Troupe Saint-Joseph" className={fieldClass} autoFocus />
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Branche</span>
        <Segmented
          label="Branche"
          value={branche}
          onChange={setBranche}
          options={(["meute", "troupe", "route"] as BranchCode[]).map((b) => ({ value: b, label: BRANCHES[b].name, dot: BRANCH_COLORS[b].acc }))}
        />
      </div>
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        Année
        <input value={annee} onChange={(e) => setAnnee(e.target.value)} inputMode="numeric" className={fieldClass} />
      </label>
      <span className="text-[13px] text-muted text-pretty">Créée le {fmtShort(toISODate(new Date()), true)}. La branche fixe le référentiel utilisé par l&apos;unité.</span>
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
