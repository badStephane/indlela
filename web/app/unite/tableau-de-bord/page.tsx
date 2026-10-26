"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, Chip, EmptyBox, List, rowClass, Section } from "@/components/ui";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";
import { BRANCHES } from "@/lib/referentiels";
import { ceremonies, fullName, TROUPE } from "@/lib/mock";
import { isStepComplete, lastValidationDays } from "@/lib/progress";
import { fmtDayMonth } from "@/lib/dates";

export default function TableauDeBord() {
  const ok = useGuard((r) => r === "cadre");
  const store = useStore();
  const router = useRouter();
  const { vals } = store;

  useEffect(() => {
    if (ok) store.setLastTab("/unite/tableau-de-bord");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok]);

  if (!ok) return null;

  const steps = BRANCHES.troupe.steps;
  const bySteps = steps.map((s, k) => ({ name: s.name, count: TROUPE.filter((j) => j.etape === k).length }));
  const max = Math.max(...bySteps.map((s) => s.count));
  const stale = TROUPE.map((j) => ({ j, days: lastValidationDays(vals, j) }))
    .filter((o) => o.days >= 30)
    .sort((a, b) => b.days - a.days);
  const award = TROUPE.filter((j) => isStepComplete(vals, j));
  const open = (id: string) => () => router.push(`/jeunes/${id}`);

  return (
    <AppShell kicker="Troupe Saint-Paul" title="Tableau de bord">
      <div className="flex flex-col gap-6 p-4">
        {store.demo.emptyUnit ? (
          <EmptyBox>Le tableau de bord se remplit dès que l&apos;unité compte des jeunes.</EmptyBox>
        ) : (
          <>
            <Section label="Jeunes par étape" gap="gap-2.5">
              <Card className="flex flex-col gap-3.5 p-4">
                {bySteps.map((s) => (
                  <div key={s.name} className="grid grid-cols-[88px_minmax(0,1fr)_24px] items-center gap-2.5">
                    <span className="text-[14px]">{s.name}</span>
                    <span className="h-3 overflow-hidden rounded-[6px] bg-track">
                      <span className="block h-full bg-acc" style={{ width: `${Math.round((s.count / max) * 100)}%` }} />
                    </span>
                    <span className="text-right font-mono text-[14px] font-semibold">{s.count}</span>
                  </div>
                ))}
              </Card>
            </Section>

            <Section label="Sans validation depuis 30 jours" gap="gap-2.5">
              {stale.length ? (
                <List>
                  {stale.map(({ j, days }) => (
                    <button key={j.id} type="button" onClick={open(j.id)} className={`${rowClass} min-h-[52px] justify-between gap-3 py-2`}>
                      <span className="flex flex-col">
                        <span className="text-[15px] font-semibold">{fullName(j)}</span>
                        <span className="text-[12px] text-muted">{steps[j.etape].name}</span>
                      </span>
                      <span className="font-mono text-[13px] font-semibold text-stale">{days === 999 ? "Jamais" : `${days} jours`}</span>
                    </button>
                  ))}
                </List>
              ) : (
                <span className="text-[14px] text-muted">Chaque jeune a eu une validation ce mois-ci.</span>
              )}
            </Section>

            <Section label={`À remettre · cour d'honneur du ${fmtDayMonth(ceremonies().courHonneur)}`} gap="gap-2.5">
              {award.length ? (
                <List>
                  {award.map((j) => (
                    <button key={j.id} type="button" onClick={open(j.id)} className={`${rowClass} min-h-[52px] justify-between gap-3 py-2`}>
                      <span className="text-[15px] font-semibold">{fullName(j)}</span>
                      <Chip className="bg-acc-soft text-acc-text">{steps[j.etape].name}</Chip>
                    </button>
                  ))}
                </List>
              ) : (
                <span className="text-[14px] text-muted">Aucune étape complète pour l&apos;instant.</span>
              )}
            </Section>
          </>
        )}
      </div>
    </AppShell>
  );
}
