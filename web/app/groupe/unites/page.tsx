"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, Section } from "@/components/ui";
import { useGuard } from "@/lib/access";
import { MAX_GROUPE_NOM, useStore } from "@/lib/store";
import { BRANCH_COLORS, type BranchCode } from "@/lib/referentiels";
import type { Compte, Unite } from "@/lib/admin";
import { plural } from "@/lib/progress";
import { estActif } from "@/lib/suivi";

// Le chef de groupe ou le responsable progression tient à jour le nom du groupe, le
// responsable de chaque unité et son équipe de cadres. La liste des jeunes, elle, est
// importée par le responsable de l'unité (fichier Excel).

const ORDER: BranchCode[] = ["meute", "troupe", "route"];
const HORS_LIGNE = "Ces changements passent par le serveur : retrouvez du réseau.";
const fieldClass = "h-11 min-w-0 rounded-ui border border-line-strong bg-surface px-3 text-[15px] text-ink outline-none focus:border-ink disabled:text-muted";

export default function GroupeUnites() {
  const ok = useGuard((r) => r === "groupe" || r === "progression");
  const store = useStore();
  const [nom, setNom] = useState(store.groupeNom);

  useEffect(() => {
    if (ok) store.setLastTab("/groupe/unites");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);
  useEffect(() => setNom(store.groupeNom), [store.groupeNom]);

  if (!ok) return null;

  const { offline } = store;
  const unites = [...store.unites].sort((a, b) => ORDER.indexOf(a.branche) - ORDER.indexOf(b.branche));
  const nomPropre = nom.trim();
  const nomChange = !!nomPropre && nomPropre !== store.groupeNom;

  return (
    <AppShell kicker={store.groupeNom} title="Groupe et unités">
      <div className="flex flex-col gap-6 p-4 lg:mx-auto lg:w-full lg:max-w-[760px]">
        {offline && <span className="rounded-ui bg-wait-bg px-3.5 py-2.5 text-[13px] text-wait-ink">{HORS_LIGNE}</span>}

        <Section label="Groupe" gap="gap-2.5">
          <Card className="flex flex-col gap-3 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!nomChange || offline) return;
                store.setGroupeNom(nomPropre);
                store.showToast("Nom du groupe enregistré");
              }}
              className="flex flex-col gap-1.5"
            >
              <label htmlFor="groupe-nom" className="text-[13px] font-semibold">
                Nom du groupe
              </label>
              <div className="flex gap-2">
                <input id="groupe-nom" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={MAX_GROUPE_NOM} disabled={offline} className={`${fieldClass} flex-1`} />
                <button type="submit" disabled={!nomChange || offline} className="h-11 flex-none rounded-ui bg-acc px-4 text-[14px] font-bold text-acc-ink disabled:bg-track disabled:text-muted">
                  Enregistrer
                </button>
              </div>
              <span className="text-[12px] text-muted">Affiché en tête de chaque écran, sur les carnets et dans les rapports.</span>
            </form>
          </Card>
        </Section>

        <Section label="Unités et responsables" gap="gap-2.5">
          {unites.map((u) => (
            <UniteCard key={u.id} u={u} />
          ))}
          <span className="text-[13px] text-muted text-pretty">
            Le responsable de chaque unité met la liste de ses jeunes à jour depuis un fichier Excel. Un nouveau cadre ? Son compte se crée chez l&apos;administrateur.
          </span>
        </Section>
      </div>
    </AppShell>
  );
}

function UniteCard({ u }: { u: Unite }) {
  const store = useStore();
  const { comptes, offline } = store;
  const cadres = comptes.filter((c) => c.role === "cadre" && c.actif);
  const equipe = cadres.filter((c) => c.unites.includes(u.id));
  const autres = cadres.filter((c) => !c.unites.includes(u.id));
  const responsable = comptes.find((c) => c.id === u.responsable);
  const nbJeunes = store.jeunes.filter((j) => j.branche === u.branche && estActif(j)).length;

  const affecter = (id: string) =>
    store.setComptes((list) => list.map((c) => (c.id === id && !c.unites.includes(u.id) ? { ...c, unites: [...c.unites, u.id] } : c)));

  const choisirResponsable = (id: string) => {
    const avant = responsable?.nom ?? "aucun";
    const apres = comptes.find((c) => c.id === id)?.nom ?? "aucun";
    store.setUnites((list) => list.map((x) => (x.id === u.id ? { ...x, responsable: id || null } : x)));
    if (id) affecter(id);
    store.log({ action: "modification", table: "unites", ligne: u.id, resume: `Responsable de ${u.nom} : ${avant} → ${apres}`, avant: { responsable: avant }, apres: { responsable: apres } });
    store.showToast(id ? `${apres} est responsable de ${u.nom}` : `${u.nom} n'a plus de responsable`);
  };

  const ajouter = (c: Compte) => {
    affecter(c.id);
    store.log({ action: "modification", table: "affectations_cadres", ligne: c.id, resume: `${c.nom} ajouté à l'équipe de ${u.nom}` });
    store.showToast(`${c.nom} rejoint ${u.nom}`);
  };

  const retirer = (c: Compte) => {
    store.setComptes((list) => list.map((x) => (x.id === c.id ? { ...x, unites: x.unites.filter((id) => id !== u.id) } : x)));
    store.log({ action: "modification", table: "affectations_cadres", ligne: c.id, resume: `${c.nom} retiré de l'équipe de ${u.nom}` });
    store.showToast(`${c.nom} ne gère plus ${u.nom}`);
  };

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="h-1" style={{ background: BRANCH_COLORS[u.branche].acc }} />
      <div className="flex flex-col gap-3.5 px-4 pb-4 pt-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="text-[18px] font-extrabold">{u.nom}</span>
          <span className="font-mono text-[12px] text-muted">
            {nbJeunes} {plural(nbJeunes, "jeune", "jeunes")} · {u.annee}
          </span>
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Responsable de l&apos;unité
          <select value={u.responsable ?? ""} disabled={offline} onChange={(e) => choisirResponsable(e.target.value)} className={fieldClass}>
            <option value="">Aucun responsable</option>
            {cadres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Équipe de cadres</span>
          {equipe.length ? (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {equipe.map((c) => (
                <li key={c.id} className="flex min-h-10 items-center justify-between gap-2 rounded-ui border border-line px-3 text-[14px]">
                  <span className="truncate">
                    {c.nom}
                    {c.id === u.responsable && <span className="ml-2 rounded-full bg-acc-soft px-2 py-0.5 text-[11px] font-bold text-acc-text">Responsable</span>}
                  </span>
                  {c.id !== u.responsable && (
                    <button
                      type="button"
                      disabled={offline}
                      onClick={() => retirer(c)}
                      aria-label={`Retirer ${c.nom} de l'équipe`}
                      className="h-9 w-9 flex-none bg-transparent text-[18px] text-muted disabled:opacity-40"
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-[13px] text-muted">Aucun cadre n&apos;est affecté à l&apos;unité.</span>
          )}
          {autres.length > 0 && (
            <select
              value=""
              disabled={offline}
              aria-label={`Ajouter un cadre à ${u.nom}`}
              onChange={(e) => {
                const c = autres.find((x) => x.id === e.target.value);
                if (c) ajouter(c);
              }}
              className={fieldClass}
            >
              <option value="">Ajouter un cadre…</option>
              {autres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </Card>
  );
}
