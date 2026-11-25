"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { cx } from "@/components/ui";
import { FOND_BRANCHE } from "@/components/carte";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";
import { BRANCHES, type BranchCode } from "@/lib/referentiels";
import { ageOf, fullName, type Jeune, type Validation } from "@/lib/mock";
import { plural, progressOf, type Progress } from "@/lib/progress";
import { fmtPoint } from "@/lib/dates";
import { jeuneHref } from "@/lib/routes";

/** Nombre de preuves récentes montrées sous chaque enfant. */
const PREUVES_RECENTES = 3;


export default function Famille() {
  const ok = useGuard((r) => r === "parent");
  const store = useStore();

  useEffect(() => {
    if (ok) store.setLastTab("/famille");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;

  const enfants = store.compte?.enfants ?? [];
  const kids = store.jeunes.filter((j) => enfants.includes(j.id) && !!j.consentementLe);
  const nom = store.compte?.nom;

  return (
    <AppShell
      kicker={nom ? `Espace famille · ${nom}` : "Espace famille"}
      title="Vos enfants"
      aDroite={<span className="text-[15px] text-crayon">lecture seule</span>}
    >
      <div className="flex flex-col gap-8 px-4 pb-10 pt-4 lg:px-0">
        {kids.length === 0 ? (
          <section className="flex flex-col gap-3 pt-4">
            <h2 className="m-0 text-[24px] font-extrabold leading-tight">Rien à afficher pour l&apos;instant.</h2>
            <p className="m-0 text-[17px] text-pretty">
              La fiche d&apos;un enfant n&apos;apparaît qu&apos;une fois le consentement des parents enregistré par l&apos;administrateur du groupe.
            </p>
            <p className="m-0 text-[16px] text-crayon text-pretty">Vous avez signé le formulaire ? Rapprochez-vous du chef d&apos;unité ou de l&apos;administrateur.</p>
          </section>
        ) : (
          <>
            <p className="m-0 text-[17px] text-crayon text-pretty">
              Vous voyez leur progression et les photos de leurs preuves. Seuls leurs chefs modifient le carnet.
            </p>
            {kids.map((j) => (
              <Enfant key={j.id} j={j} p={progressOf(j, store.steps, store.vals)} vals={store.vals} />
            ))}
          </>
        )}
      </div>
    </AppShell>
  );
}

function Enfant({ j, p, vals }: { j: Jeune; p: Progress; vals: Validation[] }) {
  const age = ageOf(j);
  const recentes = preuvesRecentes(j, p, vals);

  return (
    <article className="grid grid-cols-[6px_1fr] gap-x-5">
      <span aria-hidden="true" className={cx("row-span-full", FOND_BRANCHE[j.branche])} />
      <div className="flex min-w-0 flex-col gap-2">
        <p className="m-0 font-mono text-[14px] uppercase tracking-[1px] text-crayon">
          {[BRANCHES[j.branche].name, age === null ? null : `${age} ans`].filter(Boolean).join(" · ")}
        </p>
        <h2 className="m-0 text-titre font-extrabold leading-[1.1] tracking-[-0.3px]">
          <Link href={jeuneHref(j.id)} className="text-encre no-underline hover:underline">
            {fullName(j)}
          </Link>
        </h2>
        <p className="m-0 text-[17px] text-pretty">{resume(p)}</p>

        {recentes.length > 0 && (
          <ul aria-label="Dernières preuves réussies" className="m-0 mt-1 list-none border-t border-ligne p-0">
            {recentes.map((r) => (
              <li key={r.id} className="grid grid-cols-[64px_1fr] items-baseline gap-3 border-b border-ligne py-3 text-[17px]">
                <span className="font-mono text-[14px] text-sentier">{fmtPoint(r.date)}</span>
                <span className="min-w-0">{r.domaine}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
          <Link href={jeuneHref(j.id)} className="flex min-h-11 items-center text-[17px] font-semibold text-encre underline underline-offset-4">
            Voir sa fiche
          </Link>
          <Link href={jeuneHref(j.id, "carnet")} className="flex min-h-11 items-center text-[17px] font-semibold text-encre underline underline-offset-4">
            Télécharger son carnet (PDF)
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Une phrase : l'étape en cours et où en est l'enfant. */
function resume(p: Progress): string {
  if (!p.step) return "Pas encore d'étape.";
  if (p.complete) return `${p.step.name} : étape réussie, à présenter à la cour d'honneur.`;
  if (p.brevets) return `${p.step.name}. ${p.brevets.obtenus} ${plural(p.brevets.obtenus, "brevet obtenu", "brevets obtenus")}.`;
  return `${p.step.name}. ${p.done} ${plural(p.done, "preuve", "preuves")} sur ${p.total} ${plural(p.done, "réussie", "réussies")}.`;
}

/** Les dernières preuves réussies, les plus récentes d'abord, avec le nom de leur domaine. */
function preuvesRecentes(j: Jeune, p: Progress, vals: Validation[]): { id: string; date: string; domaine: string }[] {
  const domaines = new Map(p.steps.flatMap((s) => s.domaines.map((d) => [d.id, d.name] as const)));
  return vals
    .filter((v) => v.jeuneId === j.id && !v.annuleeLe)
    .toSorted((a, b) => b.date.localeCompare(a.date))
    .slice(0, PREUVES_RECENTES)
    .map((v) => ({ id: v.id, date: v.date, domaine: domaines.get(v.domaineId) ?? "Preuve" }));
}
