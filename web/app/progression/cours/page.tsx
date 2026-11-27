"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { BoutonLien, TitreSection } from "@/components/carte";
import { cx } from "@/components/ui";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";
import { BRANCHES, type BranchCode } from "@/lib/referentiels";
import { ceremonies, fullName } from "@/lib/mock";
import { fmtDayMonth, fmtPoint } from "@/lib/dates";
import { jeuneHref } from "@/lib/routes";
import { ajournes, decisionsRecentes, pretsAPresenter } from "@/lib/suivi";

// Cours d'honneur de toutes les unités : qui présenter, quelles étapes ajournées suivre,
// et les dernières décisions. Chaque jeune mène à la saisie de la décision.

const NB_DECISIONS = 10;

export default function CoursHonneur() {
  const ok = useGuard((r) => r === "progression");
  const store = useStore();
  const { jeunes, vals, recons, steps } = store;

  useEffect(() => {
    if (ok) store.setLastTab("/progression/cours");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;

  const prets = pretsAPresenter(jeunes, steps, vals, recons);
  const suivis = ajournes(jeunes, recons);
  const recentes = decisionsRecentes(recons, NB_DECISIONS);
  const etapeName = (b: BranchCode, id: string) => steps[b].find((s) => s.id === id)?.name ?? id;

  return (
    <AppShell kicker={`Toutes les unités du groupe · prochaine cour le ${fmtDayMonth(ceremonies().courHonneur, true)}`} title="Cours d'honneur" wide>
      <div className="flex flex-col gap-4 px-4 pb-10 lg:px-0">
        <section>
          <TitreSection aDroite="étape complète">Jeunes à présenter</TitreSection>
          {prets.length ? (
            <Tableau titres={["Jeune", "Unité", "Étape", ""]}>
              {prets.map(({ j, p }) => (
                <tr key={j.id} className="border-t border-ligne">
                  <th scope="row" className="py-3 pr-3 text-left font-semibold">
                    {fullName(j)}
                  </th>
                  <td className="py-3 pr-3">{BRANCHES[j.branche].name}</td>
                  <td className="py-3 pr-3">{p.step?.name}</td>
                  <td className="py-2 max-lg:basis-full lg:text-right">
                    <BoutonLien href={jeuneHref(j.id, "cour")} className="px-4 text-[16px]">
                      Saisir la décision
                    </BoutonLien>
                  </td>
                </tr>
              ))}
            </Tableau>
          ) : (
            <Vide>Aucune étape complète pour l&apos;instant. Un jeune apparaît ici dès que son étape l&apos;est.</Vide>
          )}
        </section>

        <section>
          <TitreSection>Étapes ajournées à suivre</TitreSection>
          {suivis.length ? (
            <Tableau titres={["Jeune", "Unité", "Étape", "Ce qui reste"]}>
              {suivis.map(({ j, le, observations }) => (
                <tr key={j.id} className="border-t border-ligne">
                  <th scope="row" className="py-3 pr-3 text-left font-semibold">
                    <Link href={jeuneHref(j.id, "cour")} className="text-encre underline-offset-4 hover:underline">
                      {fullName(j)}
                    </Link>
                  </th>
                  <td className="py-3 pr-3">{BRANCHES[j.branche].name}</td>
                  <td className="py-3 pr-3">
                    {etapeName(j.branche, j.etapeId)} <span className="font-mono text-[14px] text-crayon">· ajournée le {fmtPoint(le)}</span>
                  </td>
                  <td className="py-3 font-note text-[17px] italic text-annotation max-lg:basis-full">{observations || "Pas d'observation notée"}</td>
                </tr>
              ))}
            </Tableau>
          ) : (
            <Vide>Aucune étape ajournée en attente.</Vide>
          )}
        </section>

        <section>
          <TitreSection>Dix dernières décisions</TitreSection>
          {recentes.length ? (
            <Tableau titres={["Date", "Jeune", "Étape", "Décision"]}>
              {recentes.map((r) => {
                const j = store.findJeune(r.jeuneId);
                if (!j) return null;
                return (
                  <tr key={r.id} className="border-t border-ligne">
                    <td className="py-3 pr-3 font-mono text-[15px] font-semibold">{fmtPoint(r.date)}</td>
                    <th scope="row" className="py-3 pr-3 text-left font-normal">
                      <Link href={jeuneHref(j.id)} className="text-encre underline-offset-4 hover:underline">
                        {fullName(j)}
                      </Link>
                    </th>
                    <td className="py-3 pr-3">{etapeName(j.branche, r.etapeId)}</td>
                    <td className={cx("py-3 font-semibold", r.decision === "reconnue" ? "text-sentier" : "text-encre")}>
                      {r.decision === "reconnue" ? "Reconnue" : "Ajournée"}
                      {r.pending && <span className="font-normal text-crayon"> · en attente de réseau</span>}
                    </td>
                  </tr>
                );
              })}
            </Tableau>
          ) : (
            <Vide>Aucune décision enregistrée cette année.</Vide>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Tableau({ titres, children }: { titres: string[]; children: ReactNode }) {
  return (
    <table className="tableau-empile w-full border-collapse text-[17px]">
      <thead>
        <tr className="text-left text-[14px]">
          {titres.map((t, i) => (
            <th key={i} scope="col" className="py-2 pr-3 font-semibold">
              {t}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function Vide({ children }: { children: ReactNode }) {
  return <p className="m-0 py-3 text-[16px] text-crayon text-pretty">{children}</p>;
}
