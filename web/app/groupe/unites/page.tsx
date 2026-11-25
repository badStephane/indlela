"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Bandeau, BlocBranche, Bouton, ChampLigne, TitreSection } from "@/components/carte";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";
import { MAX_GROUPE_NOM, nettoyerGroupe, nomGroupe, nomsUnites, type Groupe } from "@/lib/groupe";
import type { BranchCode } from "@/lib/referentiels";
import type { Compte, Unite } from "@/lib/admin";
import { plural } from "@/lib/progress";
import { estActif } from "@/lib/suivi";

// Le chef de groupe ou le responsable progression tient à jour le nom du groupe (les unités
// en prennent le nom), sa paroisse, le responsable de chaque unité et son équipe de cadres. La liste des jeunes, elle, est
// importée par le responsable de l'unité (fichier Excel).

const ORDER: BranchCode[] = ["meute", "troupe", "route"];
const HORS_LIGNE = "Ces changements passent par le serveur : retrouvez du réseau.";
const ligneClass = "block h-11 w-full min-w-0 border-0 border-b-[1.5px] border-encre bg-transparent p-0 text-[17px] font-normal text-encre disabled:text-crayon";

export default function GroupeUnites() {
  const ok = useGuard((r) => r === "groupe" || r === "progression");
  const store = useStore();
  const [form, setForm] = useState<Groupe>(store.groupe);

  useEffect(() => {
    if (ok) store.setLastTab("/groupe/unites");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);
  useEffect(() => setForm(store.groupe), [store.groupe]);

  if (!ok) return null;

  const { offline } = store;
  const unites = [...store.unites].sort((a, b) => ORDER.indexOf(a.branche) - ORDER.indexOf(b.branche));
  const propre = nettoyerGroupe(form);
  const change = !!propre.nom && (propre.nom !== store.groupe.nom || propre.paroisse !== store.groupe.paroisse);
  const apercu = nomsUnites(propre);

  return (
    <AppShell kicker="Partagé entre le chef de groupe et le responsable progression" title="Groupe et unités" wide>
      <div className="flex flex-col gap-4 px-4 pb-10 lg:max-w-[960px] lg:px-0">
        {offline && <Bandeau>{HORS_LIGNE}</Bandeau>}

        <section>
          <TitreSection>Le groupe</TitreSection>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!change || offline) return;
              store.setGroupe(propre);
              store.showToast(`${nomGroupe(propre)} enregistré · les unités suivent`);
            }}
            className="flex flex-col gap-4 pt-2"
          >
            <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
              <ChampLigne
                id="groupe-nom"
                label="Nom du groupe"
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                maxLength={MAX_GROUPE_NOM + 7}
                placeholder="Troisième Dakar"
                disabled={offline}
              />
              <ChampLigne
                id="groupe-paroisse"
                label="Paroisse"
                value={form.paroisse}
                onChange={(e) => setForm((f) => ({ ...f, paroisse: e.target.value }))}
                maxLength={MAX_GROUPE_NOM + 9}
                placeholder="Saint-Pierre"
                disabled={offline}
              />
            </div>
            <p className="m-0 text-[15px] text-crayon text-pretty">
              Les unités prennent ce nom : « {apercu.meute} », « {apercu.troupe} », « {apercu.route} ». Il s&apos;affiche en tête de chaque écran, sur les carnets et dans les rapports.
            </p>
            <div>
              <Bouton type="submit" disabled={!change || offline} className="w-full lg:w-auto lg:px-6">
                Enregistrer
              </Bouton>
            </div>
          </form>
        </section>

        <section className="flex flex-col gap-6">
          <TitreSection>Les unités et leurs cadres</TitreSection>
          {unites.map((u) => (
            <UniteCard key={u.id} u={u} />
          ))}
          <p className="m-0 text-[15px] text-crayon text-pretty">
            Le responsable de chaque unité met la liste de ses jeunes à jour depuis un fichier Excel. Un nouveau cadre ? Son compte se crée chez l&apos;administrateur.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function UniteCard({ u }: { u: Unite }) {
  const store = useStore();
  const { comptes, offline } = store;
  const cadres = comptes.filter((c) => c.roles.includes("cadre") && c.actif);
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
    <BlocBranche branche={u.branche}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="m-0 text-section font-extrabold">{u.nom}</h3>
        <span className="font-mono text-[14px] text-crayon">
          {nbJeunes} {plural(nbJeunes, "jeune", "jeunes")} · {u.annee}
        </span>
      </div>

      <div className="mt-3 grid gap-5 lg:grid-cols-2 lg:gap-6">
        <label className="flex flex-col text-sm font-semibold">
          Responsable
          <select value={u.responsable ?? ""} disabled={offline} onChange={(e) => choisirResponsable(e.target.value)} className={`mt-0.5 ${ligneClass}`}>
            <option value="">Aucun responsable</option>
            {cadres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Équipe de cadres</span>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {equipe.map((c) => (
              <li key={c.id} className="flex min-h-11 items-center gap-1 border-[1.5px] border-encre pl-3 text-[16px]">
                <span>
                  {c.nom}
                  {c.id === u.responsable && <span className="ml-1.5 text-[14px] text-crayon">· responsable</span>}
                </span>
                {c.id === u.responsable ? (
                  <span className="w-3" />
                ) : (
                  <button
                    type="button"
                    disabled={offline}
                    onClick={() => retirer(c)}
                    aria-label={`Retirer ${c.nom} de l'équipe`}
                    className="flex size-11 items-center justify-center bg-transparent text-[18px] text-encre disabled:text-crayon"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
            {autres.length > 0 && (
              <li>
                <select
                  value=""
                  disabled={offline}
                  aria-label={`Ajouter un cadre à ${u.nom}`}
                  onChange={(e) => {
                    const c = autres.find((x) => x.id === e.target.value);
                    if (c) ajouter(c);
                  }}
                  className="h-11 cursor-pointer appearance-none border-[1.5px] border-dashed border-encre bg-transparent px-3 text-[16px] text-encre disabled:text-crayon"
                >
                  <option value="">+ Ajouter</option>
                  {autres.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </li>
            )}
          </ul>
          {equipe.length === 0 && <span className="text-[15px] text-crayon">Aucun cadre n&apos;est affecté à l&apos;unité.</span>}
        </div>
      </div>
    </BlocBranche>
  );
}
