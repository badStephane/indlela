"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Chiffre, Chiffres, Surligne, TitreSection } from "@/components/carte";
import { useGuard } from "@/lib/access";
import { useStore, useTroupe } from "@/lib/store";
import { ceremonies, fullName } from "@/lib/mock";
import { lastValidationDays, plural, progressOf } from "@/lib/progress";
import { fmtDayMonth, LONG_MONTHS, toISODate } from "@/lib/dates";
import { jeuneHref } from "@/lib/routes";

/** Au-delà, un jeune « sans validation » demande l'attention du cadre. */
const JOURS_SANS_VALIDATION = 30;

export default function TableauDeBord() {
  const ok = useGuard((r) => r === "cadre");
  const store = useStore();
  const router = useRouter();
  const troupe = useTroupe();
  const { vals, steps } = store;

  useEffect(() => {
    if (ok) store.setLastTab("/unite/tableau-de-bord");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;

  const rows = troupe.map((j) => ({ j, p: progressOf(j, steps, vals) }));
  const bySteps = steps.troupe.map((s, k) => ({ name: s.name, count: rows.filter((r) => r.p.index === k).length }));
  const stale = rows
    .map((r) => ({ ...r, days: lastValidationDays(vals, r.j) }))
    .filter((o) => o.days >= JOURS_SANS_VALIDATION)
    .sort((a, b) => b.days - a.days);
  const award = rows.filter((r) => r.p.complete);
  const maintenant = new Date();
  const mois = toISODate(maintenant).slice(0, 7);
  const ids = new Set(troupe.map((j) => j.id));
  const valideesCeMois = vals.filter((v) => !v.annuleeLe && ids.has(v.jeuneId) && v.date.startsWith(mois)).length;
  const open = (id: string) => () => router.push(jeuneHref(id));

  return (
    <AppShell kicker={`${store.unitesNoms.troupe} · ${LONG_MONTHS[maintenant.getMonth()]} ${maintenant.getFullYear()}`} title="Tableau de bord">
      <div className="flex flex-col gap-6 px-4 pb-8 pt-4 lg:px-0">
        {troupe.length === 0 ? (
          <p className="m-0 text-[17px] text-crayon">Le tableau de bord se remplit dès que l&apos;unité compte des jeunes.</p>
        ) : (
          <>
            <Chiffres>
              <Chiffre valeur={troupe.length} libelle={`${plural(troupe.length, "jeune actif", "jeunes actifs")}`} />
              <Chiffre valeur={valideesCeMois} libelle={`${plural(valideesCeMois, "preuve validée", "preuves validées")} en ${LONG_MONTHS[maintenant.getMonth()]}`} />
              <Chiffre valeur={stale.length ? <Surligne>{stale.length}</Surligne> : 0} libelle={`sans validation depuis ${JOURS_SANS_VALIDATION} j`} />
            </Chiffres>

            <section>
              <h2 className="m-0 text-section font-extrabold tracking-[-0.3px]">
                Jeunes par étape <span className="text-[16px] font-normal text-crayon">un carré par jeune</span>
              </h2>
              <ul className="m-0 mt-2 list-none p-0">
                {bySteps.map((s) => (
                  <li key={s.name} className="grid grid-cols-[minmax(96px,auto)_1fr_auto] items-center gap-3 py-2">
                    <span className="text-[17px] font-extrabold">{s.name}</span>
                    <span aria-hidden="true" className="flex flex-wrap gap-1">
                      {Array.from({ length: s.count }, (_, k) => (
                        <span key={k} className="size-[18px] bg-sentier" />
                      ))}
                    </span>
                    <span className="font-mono text-[16px]">
                      <span className="sr-only">{s.name} : </span>
                      {s.count}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <TitreSection aDroite={fmtDayMonth(ceremonies().courHonneur)}>À remettre à la cour d&apos;honneur</TitreSection>
              {award.length ? (
                <Liste>
                  {award.map(({ j, p }) => (
                    <Ligne key={j.id} onClick={open(j.id)} nom={fullName(j)}>
                      <span className="font-mono text-[15px] text-sentier">→ {p.step?.name}</span>
                    </Ligne>
                  ))}
                </Liste>
              ) : (
                <p className="m-0 py-3 text-[16px] text-crayon">Aucune étape complète pour l&apos;instant.</p>
              )}
            </section>

            <section>
              <TitreSection>Sans validation depuis {JOURS_SANS_VALIDATION} jours</TitreSection>
              {stale.length ? (
                <Liste>
                  {stale.map(({ j, days }) => (
                    <Ligne key={j.id} onClick={open(j.id)} nom={fullName(j)}>
                      <span className="font-mono text-[15px]">{days === 999 ? "jamais" : `${days} j`}</span>
                    </Ligne>
                  ))}
                </Liste>
              ) : (
                <p className="m-0 py-3 text-[16px] text-crayon">Chaque jeune a eu une validation ce mois-ci.</p>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}


function Liste({ children }: { children: ReactNode }) {
  return <ul className="m-0 list-none p-0">{children}</ul>;
}

function Ligne({ nom, onClick, children }: { nom: string; onClick: () => void; children: ReactNode }) {
  return (
    <li className="border-b border-ligne">
      <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center justify-between gap-3 bg-transparent py-2.5 text-left text-[17px] text-encre">
        <span className="min-w-0">{nom}</span>
        {children}
      </button>
    </li>
  );
}
