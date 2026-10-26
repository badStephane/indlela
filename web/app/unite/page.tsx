"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Bar, List, mix, rowClass, SEG_SHADES, Segments } from "@/components/ui";
import { useGuard } from "@/lib/access";
import { useStore } from "@/lib/store";
import { BRANCHES } from "@/lib/referentiels";
import { ceremonies, fullName, GROUPE, TROUPE } from "@/lib/mock";
import { currentStep, doneCount, hasPending, isStepComplete, pct } from "@/lib/progress";
import { fmtDayMonth, fmtMeeting } from "@/lib/dates";

export default function Unite() {
  const ok = useGuard((r) => r === "cadre" || r === "groupe");
  const store = useStore();
  const router = useRouter();
  const { vals, role } = store;
  const empty = store.demo.emptyUnit;

  useEffect(() => {
    if (ok && role === "cadre") store.setLastTab("/unite");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, role]);

  if (!ok) return null;

  const steps = BRANCHES.troupe.steps;
  const award = TROUPE.filter((j) => isStepComplete(vals, j)).length;
  const segs = steps.map((s, k) => ({ label: s.name, count: TROUPE.filter((j) => j.etape === k).length, color: mix("#F2B400", SEG_SHADES[k]) }));

  return (
    <AppShell kicker={GROUPE} title="Troupe Saint-Paul" back={role === "groupe" ? "/groupe" : undefined} banner>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between gap-2 text-[13px] text-muted">
          <span>Réunion du {fmtMeeting(new Date())}</span>
          <span className="font-mono">{empty ? "0 jeune" : `${TROUPE.length} jeunes`}</span>
        </div>

        {!empty && (
          <div className="flex flex-col gap-4 rounded-card border border-line bg-forest px-4 pb-4 pt-[18px] text-white">
            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[60px] font-extrabold leading-[0.85] tracking-[-0.04em]">{TROUPE.length}</span>
                <span className="text-[13px] text-forest-muted">jeunes sur le chemin</span>
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-[30px] font-extrabold leading-[0.9]">{award}</span>
                <span className="text-[12px] text-forest-muted">étapes à remettre le {fmtDayMonth(ceremonies().courHonneur)}</span>
              </div>
            </div>
            <Segments segs={segs} barHeight={12} labelClass="text-forest-muted" />
          </div>
        )}

        {empty ? (
          <div className="flex flex-col items-start gap-2 rounded-card border border-dashed border-line-strong px-5 py-7">
            <span className="text-[17px] font-bold">Aucun jeune dans cette unité</span>
            <span className="text-[14px] text-muted text-pretty">
              L&apos;administrateur peut importer la liste des jeunes (fichier CSV) ou créer les fiches une par une. Elles apparaîtront ici.
            </span>
          </div>
        ) : (
          <List>
            {TROUPE.map((j) => {
              const step = currentStep(j);
              const d = doneCount(vals, j);
              return (
                <button key={j.id} type="button" onClick={() => router.push(`/jeunes/${j.id}`)} className={`${rowClass} min-h-[66px] gap-3 py-2.5`}>
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-acc-soft text-[14px] font-bold text-acc-text">
                    {j.prenom[0] + j.nom[0]}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[16px] font-semibold">{fullName(j)}</span>
                      <span className="flex-none font-mono text-[12px] text-muted">
                        {d}/{step.crit.length}
                      </span>
                    </span>
                    <span className="flex items-center gap-2.5">
                      <span className="w-[76px] flex-none text-[13px] text-muted">{step.name}</span>
                      <Bar value={pct(d, step.crit.length)} className="flex-1" />
                    </span>
                  </span>
                  {hasPending(vals, j) && <span title="En attente de synchronisation" aria-label="En attente de synchronisation" className="h-2.5 w-2.5 flex-none rounded-full bg-wait-dot" />}
                </button>
              );
            })}
          </List>
        )}
      </div>
    </AppShell>
  );
}
