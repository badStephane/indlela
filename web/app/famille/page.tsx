"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Bar, Card, OutlineButton } from "@/components/ui";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";
import { BRANCHES, BRANCH_COLORS } from "@/lib/referentiels";
import { FAMILLE, fullName } from "@/lib/mock";
import { lastValidationDays, pct, progressOf } from "@/lib/progress";
import { daysAgo, fmtShort, toISODate } from "@/lib/dates";
import { jeuneHref } from "@/lib/routes";

export default function Famille() {
  const ok = useGuard((r) => r === "parent");
  const store = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ok) store.setLastTab("/famille");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;

  const kids = store.jeunes.filter((j) => FAMILLE.kids.includes(j.id));

  return (
    <AppShell kicker="Espace famille" title={FAMILLE.name}>
      <div className="flex flex-col gap-4 px-4 py-[18px]">
        <p className="m-0 text-[14px] text-muted text-pretty">Vous suivez la progression de vos enfants en lecture seule. Les cadres font les validations.</p>
        {kids.map((j) => {
          const id = j.id;
          const p = progressOf(j, store.steps, store.vals);
          const l = lastValidationDays(store.vals, j);
          const acc = BRANCH_COLORS[j.branche].acc;
          return (
            <Card key={id} className="flex flex-col overflow-hidden">
              <div className="h-1" style={{ background: acc }} />
              <div className="flex flex-col gap-2.5 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[19px] font-extrabold">{fullName(j)}</span>
                  <span className="text-[12px] text-muted">{BRANCHES[j.branche].unit}</span>
                </div>
                <div className="flex justify-between text-[14px]">
                  <span>{p.step?.name} en cours</span>
                  <span className="font-mono text-muted">
                    {p.done}/{p.total}
                  </span>
                </div>
                <Bar value={pct(p.done, p.total)} height={8} color={acc} />
                <span className="text-[13px] text-muted">
                  Dernière validation : {l === 0 ? "aujourd'hui" : l === 999 ? "aucune" : fmtShort(toISODate(daysAgo(l)))}
                </span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <OutlineButton onClick={() => router.push(jeuneHref(id))} className="h-11 bg-transparent text-[14px]">
                    Voir la fiche
                  </OutlineButton>
                  <OutlineButton onClick={() => router.push(jeuneHref(id, "carnet"))} className="h-11 bg-transparent text-[14px]">
                    Carnet PDF
                  </OutlineButton>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
