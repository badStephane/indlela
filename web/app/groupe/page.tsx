"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BarreSentier, Bouton, Chiffre, Chiffres, Surligne, TitreSection, type RepartitionEtape } from "@/components/carte";
import { cx } from "@/components/ui";
import { useGuard } from "@/lib/access";
import { useStore, useTroupe } from "@/lib/store";
import { BRANCHES, type BranchCode } from "@/lib/referentiels";
import { ageOf, ceremonies, fullName, GROUP_OTHER_UNITS } from "@/lib/mock";
import { plural, progressOf } from "@/lib/progress";
import { fmtDayMonth } from "@/lib/dates";
import { anneeScoute } from "@/lib/rapport";
import { jeuneHref } from "@/lib/routes";
import { slug, telechargerExcel } from "@/lib/excel";

const FILET_BRANCHE: Record<BranchCode, string> = { meute: "bg-meute", troupe: "bg-troupe", route: "bg-route" };

interface LigneUnite {
  code: BranchCode;
  effectif: number;
  cadres: number;
  /** Absent : la branche n'a pas encore de référentiel. */
  repartition?: RepartitionEtape[];
  ouvrir?: () => void;
}

export default function Groupe() {
  const ok = useGuard((r) => r === "groupe");
  const store = useStore();
  const router = useRouter();
  const troupe = useTroupe();
  const { vals, offline, steps } = store;

  useEffect(() => {
    if (ok) store.setLastTab("/groupe");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;

  const M = GROUP_OTHER_UNITS.meute;
  const R = GROUP_OTHER_UNITS.route;
  const { courHonneur, remiseMeute } = ceremonies();
  const annee = anneeScoute(new Date());
  const rows = troupe.map((j) => ({ j, p: progressOf(j, steps, vals) }));
  const award = rows.filter((r) => r.p.complete);
  const aRemettre = award.length + GROUP_OTHER_UNITS.aRemettre.length;
  const idsTroupe = new Set(troupe.map((j) => j.id));
  const valideesAnnee = vals.filter((v) => idsTroupe.has(v.jeuneId) && !v.annuleeLe && v.date >= annee.debut).length;
  const cadresTroupe = store.comptes.filter((c) => c.roles.includes("cadre") && c.actif && c.unites.includes("troupe")).length;

  const unites: LigneUnite[] = [
    {
      code: "meute",
      effectif: M.effectif,
      cadres: M.cadres,
      repartition: BRANCHES.meute.steps.map((s, k) => ({ etape: s.name, nombre: M.parEtape[k] ?? 0 })),
      ouvrir: () => store.showToast("Module meute : ouverture prévue en V2 (mars 2027)"),
    },
    {
      code: "troupe",
      effectif: troupe.length,
      cadres: cadresTroupe,
      repartition: steps.troupe.map((s, k) => ({ etape: s.name, nombre: rows.filter((r) => r.p.index === k).length })),
      ouvrir: () => router.push("/unite"),
    },
    { code: "route", effectif: R.effectif, cadres: R.cadres },
  ];

  const exportListes = () => {
    if (offline) return store.showToast("Export impossible hors connexion : il se fait depuis le serveur.");
    const name = `${slug(store.groupeNom)}-listes.xlsx`;
    const lines = rows.map(({ j, p }) => [store.unitesNoms.troupe, j.prenom, j.nom, ageOf(j), p.step?.name, p.done, p.total]);
    telechargerExcel(name, [{ nom: "Listes", lignes: [["Unité", "Prénom", "Nom", "Âge", "Étape", "Preuves validées", "Preuves de l'étape"], ...lines], largeurs: [20, 16, 16, 6, 14, 10, 10] }])
      .then(() => {
        store.log({ action: "export", table: "jeunes", ligne: name, resume: `Export ${name} (${lines.length} lignes)`, apres: { fichier: name, lignes: lines.length } });
        store.showToast(`${name} exporté`);
      })
      .catch(() => store.showToast("L'export a échoué. Réessayez."));
  };

  return (
    <AppShell kicker={`${store.groupeNom} · année scoute ${annee.label}`} title="Vue groupe" wide>
      <div className="flex flex-col gap-4 px-4 pb-10 pt-1 lg:px-0">
        <Chiffres className="grid-cols-2 lg:grid-cols-4">
          <Chiffre valeur={troupe.length + M.effectif + R.effectif} libelle="jeunes actifs" />
          <Chiffre valeur={unites.length} libelle="unités" />
          <Chiffre valeur={aRemettre ? <Surligne>{aRemettre}</Surligne> : 0} libelle={`${plural(aRemettre, "étape", "étapes")} à remettre`} />
          <Chiffre valeur={valideesAnnee} libelle={`${plural(valideesAnnee, "preuve validée", "preuves validées")} depuis septembre`} />
        </Chiffres>

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-10">
          <section className="min-w-0">
            <TitreSection
              aDroite={
                <Bouton variante="secondaire" onClick={exportListes} className="min-h-11 px-4 font-sans text-[16px]">
                  Exporter les listes (Excel)
                </Bouton>
              }
            >
              Les unités
            </TitreSection>
            <table className="tableau-empile w-full border-collapse text-[17px]">
              <thead>
                <tr className="text-left text-[14px]">
                  <th scope="col" className="py-2 font-semibold">Unité</th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">Jeunes</th>
                  <th scope="col" className="py-2 font-semibold">Cadres</th>
                  <th scope="col" className="py-2 font-semibold">Sentier par étape</th>
                </tr>
              </thead>
              <tbody>
                {unites.map((u) => (
                  <tr key={u.code} className="border-t border-ligne">
                    <th scope="row" className="py-2 pr-3 text-left font-semibold">
                      <span className="flex min-h-11 items-center gap-3">
                        <span aria-hidden="true" className={cx("h-6 w-1.5 flex-none", FILET_BRANCHE[u.code])} />
                        {u.ouvrir ? (
                          <button type="button" onClick={u.ouvrir} className="bg-transparent text-left font-semibold text-encre underline-offset-4 hover:underline">
                            {store.unitesNoms[u.code]}
                          </button>
                        ) : (
                          store.unitesNoms[u.code]
                        )}
                      </span>
                    </th>
                    <td className="py-2 pr-4 font-mono text-[15px] lg:text-right">{u.effectif}<span className="font-sans text-[17px] lg:hidden"> {plural(u.effectif, "jeune", "jeunes")} ·</span></td>
                    <td className="py-2 pr-3">
                      {u.cadres} {plural(u.cadres, "cadre", "cadres")}
                    </td>
                    <td className="py-2 max-lg:basis-full">
                      {u.repartition ? (
                        <span className="block max-w-[280px] lg:w-[180px]">
                          <BarreSentier repartition={u.repartition} />
                        </span>
                      ) : (
                        <span className="text-[15px] text-crayon">Pas encore de référentiel</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="m-0 border-t border-ligne pt-3 text-[15px] text-crayon">Sentier : du plus clair (première étape) au plus foncé (dernière).</p>
          </section>

          <section className="min-w-0">
            <TitreSection>Aux prochaines cérémonies</TitreSection>
            {aRemettre === 0 ? (
              <p className="m-0 py-3 text-[16px] text-crayon">Aucune étape à remettre pour l&apos;instant.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {award.map(({ j, p }) => (
                  <Remise key={j.id} nom={fullName(j)} unite={BRANCHES.troupe.name} etape={p.step?.name} onClick={() => router.push(jeuneHref(j.id))} />
                ))}
                {GROUP_OTHER_UNITS.aRemettre.map((m) => (
                  <Remise key={m.name} nom={m.name} unite={BRANCHES.meute.name} etape={m.step} />
                ))}
              </ul>
            )}
            <p className="m-0 pt-3 text-[15px] text-crayon text-pretty">
              Cour d&apos;honneur de la troupe le {fmtDayMonth(courHonneur)}, remise des insignes de la meute le {fmtDayMonth(remiseMeute)}
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Remise({ nom, unite, etape, onClick }: { nom: string; unite: string; etape?: string; onClick?: () => void }) {
  const contenu = (
    <>
      <span className="min-w-0">
        <strong className="font-bold">{nom}</strong> · {unite}
      </span>
      <span className="flex-none font-mono text-[14px] text-sentier">→ {etape}</span>
    </>
  );
  const classe = "flex min-h-14 w-full items-baseline justify-between gap-3 py-3 text-left text-[17px] text-encre";
  return (
    <li className="border-b border-ligne">
      {onClick ? (
        <button type="button" onClick={onClick} className={cx(classe, "bg-transparent")}>
          {contenu}
        </button>
      ) : (
        <div className={classe}>{contenu}</div>
      )}
    </li>
  );
}
